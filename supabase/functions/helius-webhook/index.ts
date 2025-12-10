import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HeliusWebhookPayload {
  accountData: Array<{
    account: string;
    nativeBalanceChange: number;
    tokenBalanceChanges: Array<{
      mint: string;
      rawTokenAmount: {
        tokenAmount: string;
        decimals: number;
      };
      userAccount: string;
    }>;
  }>;
  description: string;
  events: any;
  fee: number;
  feePayer: string;
  signature: string;
  slot: number;
  timestamp: number;
  type: string;
  source: string;
}

// Crypto to NGN conversion rates cache
let priceCache: { prices: Record<string, number>; timestamp: number } | null = null;
const CACHE_DURATION = 60000; // 1 minute cache

// Known Solana token mint addresses for stablecoins
const KNOWN_TOKENS: Record<string, string> = {
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT', // USDT on Solana
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC', // USDC on Solana
};

// Fetch real-time crypto prices from CoinGecko
async function getCryptoPricesInNGN(): Promise<Record<string, number>> {
  // Return cached prices if still valid
  if (priceCache && Date.now() - priceCache.timestamp < CACHE_DURATION) {
    return priceCache.prices;
  }

  try {
    // Fetch prices for SOL, USDT, USDC in NGN
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana,tether,usd-coin&vs_currencies=ngn',
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('CoinGecko API error:', response.status);
      return getFallbackPrices();
    }

    const data = await response.json();
    
    const prices: Record<string, number> = {
      'SOL': data.solana?.ngn || 380000,
      'USDT': data.tether?.ngn || 1650,
      'USDC': data['usd-coin']?.ngn || 1650,
    };

    // Cache the prices
    priceCache = { prices, timestamp: Date.now() };
    console.log('Updated Solana crypto prices (NGN):', prices);
    
    return prices;
  } catch (error) {
    console.error('Error fetching crypto prices:', error);
    return getFallbackPrices();
  }
}

function getFallbackPrices(): Record<string, number> {
  // Fallback prices based on approximate rates (Dec 2024)
  return {
    'SOL': 380000,   // ~$240 * 1,570 NGN/USD
    'USDT': 1650,    // ~$1.00 * 1,650 NGN/USD
    'USDC': 1650,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: HeliusWebhookPayload = await req.json();
    console.log('Helius webhook received:', JSON.stringify(payload, null, 2));

    // Fetch current crypto prices
    const cryptoPrices = await getCryptoPricesInNGN();

    // Process each account data change
    for (const accountData of payload.accountData) {
      // Check for native SOL transfer
      if (accountData.nativeBalanceChange !== 0) {
        const amount = Math.abs(accountData.nativeBalanceChange) / 1e9; // Convert lamports to SOL
        const direction = accountData.nativeBalanceChange > 0 ? 'deposit' : 'withdrawal';

        // Find user by Solana address
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('solana_address', accountData.account)
          .maybeSingle();

        if (!profile) {
          console.log(`No profile found for Solana address ${accountData.account}`);
          continue;
        }

        // Check if transaction already recorded
        const { data: existingTx } = await supabaseAdmin
          .from('blockchain_transactions')
          .select('id')
          .eq('tx_hash', payload.signature)
          .eq('chain', 'solana')
          .maybeSingle();

        if (existingTx) {
          console.log(`Transaction ${payload.signature} already recorded`);
          continue;
        }

        // Get SOL price and calculate NGN amount
        const solPrice = cryptoPrices['SOL'] || 380000;
        const ngnAmount = amount * solPrice;

        console.log(`Converting ${amount} SOL to ₦${ngnAmount.toLocaleString()} (rate: ₦${solPrice.toLocaleString()}/SOL)`);

        // Record transaction
        const { error: txError } = await supabaseAdmin
          .from('blockchain_transactions')
          .insert({
            user_id: profile.id,
            chain: 'solana',
            tx_hash: payload.signature,
            token: 'SOL',
            direction,
            amount,
            status: 'confirmed',
            block_number: payload.slot,
            from_address: payload.feePayer,
            to_address: accountData.account,
            metadata: {
              type: payload.type,
              description: payload.description,
              fee: payload.fee,
              ngn_amount: ngnAmount,
              exchange_rate: solPrice,
            },
          });

        if (txError) {
          console.error('Error recording transaction:', txError);
          continue;
        }

        // Only credit wallet for deposits
        if (direction === 'deposit') {
          const { error: creditError } = await supabaseAdmin.rpc(
            'credit_wallet_from_chain',
            {
              p_user_id: profile.id,
              p_amount: ngnAmount,
              p_tx_hash: payload.signature,
              p_chain: 'solana',
            }
          );

          if (creditError) {
            console.error('Error crediting wallet:', creditError);
            continue;
          }

          console.log(`Successfully processed Solana deposit: ${payload.signature} - ₦${ngnAmount.toLocaleString()}`);

          // Send notification with NGN amount
          await supabaseAdmin.rpc('send_notification', {
            p_user_id: profile.id,
            p_type: 'deposit',
            p_title: 'Solana Deposit Confirmed',
            p_message: `${amount.toFixed(6)} SOL (₦${ngnAmount.toLocaleString()}) has been credited to your wallet`,
            p_metadata: { 
              tx_hash: payload.signature, 
              chain: 'solana', 
              crypto_amount: amount,
              ngn_amount: ngnAmount,
              exchange_rate: solPrice,
            },
          });
        }
      }

      // Process token balance changes (SPL tokens like USDT, USDC)
      for (const tokenChange of accountData.tokenBalanceChanges) {
        const amount = parseInt(tokenChange.rawTokenAmount.tokenAmount) / 
                      Math.pow(10, tokenChange.rawTokenAmount.decimals);
        
        if (amount === 0) continue;

        // Find user
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('solana_address', tokenChange.userAccount)
          .maybeSingle();

        if (!profile) continue;

        // Determine token symbol
        const tokenSymbol = KNOWN_TOKENS[tokenChange.mint] || 'SPL';
        const tokenPrice = cryptoPrices[tokenSymbol] || cryptoPrices['USDT'] || 1650;
        const ngnAmount = Math.abs(amount) * tokenPrice;
        const direction = amount > 0 ? 'deposit' : 'withdrawal';

        console.log(`Converting ${Math.abs(amount)} ${tokenSymbol} to ₦${ngnAmount.toLocaleString()}`);

        // Record SPL token transaction
        const { error: txError } = await supabaseAdmin
          .from('blockchain_transactions')
          .insert({
            user_id: profile.id,
            chain: 'solana',
            tx_hash: payload.signature,
            token: tokenSymbol,
            direction,
            amount: Math.abs(amount),
            status: 'confirmed',
            block_number: payload.slot,
            from_address: payload.feePayer,
            to_address: tokenChange.userAccount,
            metadata: {
              type: 'spl_token',
              mint: tokenChange.mint,
              ngn_amount: ngnAmount,
              exchange_rate: tokenPrice,
            },
          });

        if (txError) {
          console.error('Error recording SPL token transaction:', txError);
          continue;
        }

        // Credit wallet for deposits
        if (direction === 'deposit') {
          const { error: creditError } = await supabaseAdmin.rpc(
            'credit_wallet_from_chain',
            {
              p_user_id: profile.id,
              p_amount: ngnAmount,
              p_tx_hash: `${payload.signature}-${tokenChange.mint}`,
              p_chain: 'solana',
            }
          );

          if (creditError) {
            console.error('Error crediting wallet for SPL token:', creditError);
            continue;
          }

          // Send notification
          await supabaseAdmin.rpc('send_notification', {
            p_user_id: profile.id,
            p_type: 'deposit',
            p_title: `${tokenSymbol} Deposit Confirmed`,
            p_message: `${Math.abs(amount).toFixed(2)} ${tokenSymbol} (₦${ngnAmount.toLocaleString()}) has been credited to your wallet`,
            p_metadata: { 
              tx_hash: payload.signature, 
              chain: 'solana',
              token: tokenSymbol,
              crypto_amount: Math.abs(amount),
              ngn_amount: ngnAmount,
              exchange_rate: tokenPrice,
            },
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: payload.accountData.length }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error processing Helius webhook:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});