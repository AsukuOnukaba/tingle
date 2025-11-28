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
          },
        });

      if (txError) {
        console.error('Error recording transaction:', txError);
        continue;
      }

      // Credit user wallet (convert crypto to fiat equivalent)
      // For now, we'll use a simple 1:1 conversion for testnet
      // In production, you'd call an exchange rate API
      const fiatAmount = amount * 3000; // Rough ETH to NGN conversion

      const { error: creditError } = await supabaseAdmin.rpc(
        'credit_wallet_from_chain',
        {
          p_user_id: profile.id,
          p_amount: fiatAmount,
          p_tx_hash: hash,
          p_chain: chain,
        }
      );

      if (creditError) {
        console.error('Error crediting wallet:', creditError);
        continue;
      }

      console.log(`Successfully processed deposit: ${hash} for user ${profile.id}`);

      // Send notification
      await supabaseAdmin.rpc('send_notification', {
        p_user_id: profile.id,
        p_type: 'deposit',
        p_title: 'Crypto Deposit Confirmed',
        p_message: `${amount} ${asset} has been deposited to your wallet`,
        p_metadata: { tx_hash: hash, chain, amount },
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
