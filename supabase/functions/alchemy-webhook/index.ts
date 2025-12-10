import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-alchemy-signature',
};

interface AlchemyWebhookPayload {
  webhookId: string;
  id: string;
  createdAt: string;
  type: string;
  event: {
    network: string;
    activity: Array<{
      fromAddress: string;
      toAddress: string;
      blockNum: string;
      hash: string;
      value: number;
      asset: string;
      category: string;
      rawContract: {
        value: string;
        address: string | null;
        decimal: string;
      };
    }>;
  };
}

// Crypto to NGN conversion rates cache
let priceCache: { prices: Record<string, number>; timestamp: number } | null = null;
const CACHE_DURATION = 60000; // 1 minute cache

// Fetch real-time crypto prices from CoinGecko
async function getCryptoPricesInNGN(): Promise<Record<string, number>> {
  // Return cached prices if still valid
  if (priceCache && Date.now() - priceCache.timestamp < CACHE_DURATION) {
    return priceCache.prices;
  }

  try {
    // Fetch prices for ETH, BNB, MATIC, USDT, USDC in NGN
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,binancecoin,matic-network,tether,usd-coin&vs_currencies=ngn',
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('CoinGecko API error:', response.status);
      // Return fallback prices if API fails
      return getFallbackPrices();
    }

    const data = await response.json();
    
    const prices: Record<string, number> = {
      'ETH': data.ethereum?.ngn || 5500000,
      'WETH': data.ethereum?.ngn || 5500000,
      'BNB': data.binancecoin?.ngn || 1000000,
      'MATIC': data['matic-network']?.ngn || 1200,
      'USDT': data.tether?.ngn || 1650,
      'USDC': data['usd-coin']?.ngn || 1650,
    };

    // Cache the prices
    priceCache = { prices, timestamp: Date.now() };
    console.log('Updated crypto prices (NGN):', prices);
    
    return prices;
  } catch (error) {
    console.error('Error fetching crypto prices:', error);
    return getFallbackPrices();
  }
}

function getFallbackPrices(): Record<string, number> {
  // Fallback prices based on approximate rates (Dec 2024)
  return {
    'ETH': 5500000,  // ~$3,500 * 1,570 NGN/USD
    'WETH': 5500000,
    'BNB': 1000000,  // ~$640 * 1,570 NGN/USD
    'MATIC': 1200,   // ~$0.76 * 1,570 NGN/USD
    'USDT': 1650,    // ~$1.00 * 1,650 NGN/USD (slightly higher for stablecoins)
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

    // Verify Alchemy signature (optional but recommended)
    const alchemySignature = req.headers.get('x-alchemy-signature');
    
    const payload: AlchemyWebhookPayload = await req.json();
    console.log('Alchemy webhook received:', JSON.stringify(payload, null, 2));

    // Fetch current crypto prices
    const cryptoPrices = await getCryptoPricesInNGN();

    // Process each activity in the webhook
    for (const activity of payload.event.activity) {
      const { fromAddress, toAddress, hash, value, asset, blockNum } = activity;
      
      // Determine if this is a deposit (to our user's address)
      // Find user by EVM address
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('evm_address', toAddress.toLowerCase())
        .maybeSingle();

      if (!profile) {
        console.log(`No profile found for address ${toAddress}`);
        continue;
      }

      // Map network to chain type
      const chainMap: Record<string, string> = {
        'ETH_MAINNET': 'ethereum',
        'BASE_SEPOLIA': 'base',
        'BASE_MAINNET': 'base',
        'MATIC_MAINNET': 'polygon',
        'BNB_MAINNET': 'bnb',
      };
      const chain = chainMap[payload.event.network] || 'ethereum';

      // Check if transaction already recorded
      const { data: existingTx } = await supabaseAdmin
        .from('blockchain_transactions')
        .select('id')
        .eq('tx_hash', hash)
        .eq('chain', chain)
        .maybeSingle();

      if (existingTx) {
        console.log(`Transaction ${hash} already recorded`);
        continue;
      }

      // Convert value from hex to decimal
      const amount = parseInt(activity.rawContract.value, 16) / Math.pow(10, parseInt(activity.rawContract.decimal));

      // Get price for the asset, default to ETH price if unknown
      const assetUpper = asset.toUpperCase();
      const pricePerUnit = cryptoPrices[assetUpper] || cryptoPrices['ETH'] || 5500000;
      
      // Calculate NGN amount
      const ngnAmount = amount * pricePerUnit;

      console.log(`Converting ${amount} ${asset} to ₦${ngnAmount.toLocaleString()} (rate: ₦${pricePerUnit.toLocaleString()}/${asset})`);

      // Record transaction
      const { error: txError } = await supabaseAdmin
        .from('blockchain_transactions')
        .insert({
          user_id: profile.id,
          chain,
          tx_hash: hash,
          token: asset,
          direction: 'deposit',
          amount,
          status: 'confirmed',
          block_number: parseInt(blockNum, 16),
          from_address: fromAddress.toLowerCase(),
          to_address: toAddress.toLowerCase(),
          metadata: {
            webhook_id: payload.webhookId,
            category: activity.category,
            ngn_amount: ngnAmount,
            exchange_rate: pricePerUnit,
          },
        });

      if (txError) {
        console.error('Error recording transaction:', txError);
        continue;
      }

      // Credit user wallet with NGN amount
      const { error: creditError } = await supabaseAdmin.rpc(
        'credit_wallet_from_chain',
        {
          p_user_id: profile.id,
          p_amount: ngnAmount,
          p_tx_hash: hash,
          p_chain: chain,
        }
      );

      if (creditError) {
        console.error('Error crediting wallet:', creditError);
        continue;
      }

      console.log(`Successfully processed deposit: ${hash} for user ${profile.id} - ₦${ngnAmount.toLocaleString()}`);

      // Send notification with NGN amount
      await supabaseAdmin.rpc('send_notification', {
        p_user_id: profile.id,
        p_type: 'deposit',
        p_title: 'Crypto Deposit Confirmed',
        p_message: `${amount.toFixed(6)} ${asset} (₦${ngnAmount.toLocaleString()}) has been credited to your wallet`,
        p_metadata: { 
          tx_hash: hash, 
          chain, 
          crypto_amount: amount,
          ngn_amount: ngnAmount,
          exchange_rate: pricePerUnit,
        },
      });
    }

    return new Response(
      JSON.stringify({ success: true, processed: payload.event.activity.length }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error processing Alchemy webhook:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});