import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, verif-hash',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Verify webhook signature
    const hash = req.headers.get('verif-hash');
    const secretHash = Deno.env.get('FLUTTERWAVE_SECRET_KEY');
    
    if (!hash || hash !== secretHash) {
      console.error('Invalid webhook signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = await req.json();
    console.log('Flutterwave webhook received:', payload.event);

    // Handle successful charge
    if (payload.event === 'charge.completed' && payload.data.status === 'successful') {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const {
        tx_ref,
        amount,
        customer: { email },
      } = payload.data;

      // Validate reference format
      if (!tx_ref || !tx_ref.match(/^FLW-TOP-\d+-[a-zA-Z0-9]+$/)) {
        throw new Error('Invalid transaction reference');
      }

      // Check for duplicate transaction using idempotency
      const { data: existingTx } = await supabaseAdmin
        .from('transactions')
        .select('id')
        .eq('idempotency_key', tx_ref)
        .maybeSingle();

      if (existingTx) {
        console.log('Duplicate transaction detected, skipping:', tx_ref);
        return new Response(JSON.stringify({ success: true, message: 'Already processed' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Find user by email
      const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers();
      if (userError) throw userError;
      
      const user = users.find(u => u.email === email);
      if (!user) {
        throw new Error('User not found');
      }

      // Credit user wallet with idempotency key
      const { data: creditResult, error: creditError } = await supabaseAdmin
        .rpc('credit_wallet', {
          p_user_id: user.id,
          p_amount: amount,
          p_reference: tx_ref,
          p_description: 'Wallet top-up via Flutterwave'
        });

      if (creditError) throw creditError;

      // Update transaction with gateway and idempotency key
      await supabaseAdmin
        .from('transactions')
        .update({
          gateway: 'flutterwave',
          idempotency_key: tx_ref
        })
        .eq('reference', tx_ref);

      console.log('Wallet credited successfully:', tx_ref);

      return new Response(
        JSON.stringify({ success: true, transaction_id: creditResult.transaction_id }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Return 200 for other events
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Flutterwave webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Webhook processing failed';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});