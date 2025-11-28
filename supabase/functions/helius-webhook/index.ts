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
            },
          });

        if (txError) {
          console.error('Error recording transaction:', txError);
          continue;
        }

        // Only credit wallet for deposits
        if (direction === 'deposit') {
          // Convert SOL to fiat equivalent (NGN)
          // For now, rough conversion. In production, use exchange rate API
          const fiatAmount = amount * 100000; // Rough SOL to NGN

          const { error: creditError } = await supabaseAdmin.rpc(
            'credit_wallet_from_chain',
            {
              p_user_id: profile.id,
              p_amount: fiatAmount,
              p_tx_hash: payload.signature,
              p_chain: 'solana',
            }
          );

          if (creditError) {
            console.error('Error crediting wallet:', creditError);
            continue;
          }

          console.log(`Successfully processed Solana deposit: ${payload.signature}`);

          // Send notification
          await supabaseAdmin.rpc('send_notification', {
            p_user_id: profile.id,
            p_type: 'deposit',
            p_title: 'Solana Deposit Confirmed',
            p_message: `${amount.toFixed(4)} SOL has been deposited to your wallet`,
            p_metadata: { tx_hash: payload.signature, chain: 'solana', amount },
          });
        }
      }

      // Process token balance changes (SPL tokens)
      for (const tokenChange of accountData.tokenBalanceChanges) {
        const amount = parseInt(tokenChange.rawTokenAmount.tokenAmount) / 
                      Math.pow(10, tokenChange.rawTokenAmount.decimals);
        
        // Find user
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('solana_address', tokenChange.userAccount)
          .maybeSingle();

        if (!profile) continue;

        // Record SPL token transaction
        await supabaseAdmin
          .from('blockchain_transactions')
          .insert({
            user_id: profile.id,
            chain: 'solana',
            tx_hash: payload.signature,
            token: tokenChange.mint, // Token mint address
            direction: amount > 0 ? 'deposit' : 'withdrawal',
            amount: Math.abs(amount),
            status: 'confirmed',
            block_number: payload.slot,
            from_address: payload.feePayer,
            to_address: tokenChange.userAccount,
            metadata: {
              type: 'spl_token',
              mint: tokenChange.mint,
            },
          });
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
