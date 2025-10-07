import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get('x-paystack-signature');
    const body = await req.text();

    // Verify webhook signature using Deno's crypto API
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(Deno.env.get('PAYSTACK_SECRET_KEY')),
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign']
    );
    
    const hashBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(body)
    );
    
    const expectedSignature = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (signature !== expectedSignature) {
      console.error('Invalid webhook signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const event = JSON.parse(body);
    console.log('Paystack webhook event:', event.event);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Handle charge.success event
    if (event.event === 'charge.success') {
      const { reference, amount, metadata } = event.data;
      const userId = metadata?.user_id;

      if (!userId) {
        console.error('No user_id in metadata');
        return new Response(JSON.stringify({ error: 'Invalid metadata' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check for existing transaction (idempotency)
      const { data: existingTx } = await supabaseClient
        .from('transactions')
        .select('id, status')
        .eq('reference', reference)
        .single();

      if (existingTx?.status === 'completed') {
        console.log('Transaction already processed:', reference);
        return new Response(JSON.stringify({ message: 'Already processed' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const amountInNaira = amount / 100; // Convert from kobo to naira

      // Get current balance
      const { data: wallet } = await supabaseClient
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .single();

      const newBalance = (wallet?.balance || 0) + amountInNaira;

      // Update wallet balance
      const { error: walletError } = await supabaseClient
        .from('wallets')
        .update({ balance: newBalance })
        .eq('user_id', userId);

      if (walletError) {
        console.error('Wallet update error:', walletError);
        return new Response(JSON.stringify({ error: 'Failed to update wallet' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update transaction status
      const { error: txError } = await supabaseClient
        .from('transactions')
        .update({
          status: 'completed',
          balance_after: newBalance,
        })
        .eq('reference', reference);

      if (txError) {
        console.error('Transaction update error:', txError);
      }

      console.log(`Wallet credited: ${amountInNaira} for user ${userId}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in paystack-webhook:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
