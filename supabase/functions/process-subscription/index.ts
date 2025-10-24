import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { reference, plan_id, creator_id } = await req.json();

    console.log('Processing subscription:', { reference, plan_id, creator_id });

    // Verify payment with Paystack
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
        },
      }
    );

    const verifyData = await verifyResponse.json();

    if (!verifyData.status || verifyData.data.status !== 'success') {
      throw new Error('Payment verification failed');
    }

    const amount = verifyData.data.amount / 100; // Convert from kobo to naira
    const customer_email = verifyData.data.customer.email;

    console.log('Payment verified:', { amount, customer_email });

    // Get user from email
    const { data: { users }, error: userError } = await supabaseClient.auth.admin.listUsers();
    const user = users?.find(u => u.email === customer_email);

    if (!user) {
      throw new Error('User not found');
    }

    // Get plan details
    const { data: plan, error: planError } = await supabaseClient
      .from('subscription_plans')
      .select('*')
      .eq('id', plan_id)
      .single();

    if (planError || !plan) {
      throw new Error('Plan not found');
    }

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + plan.duration_days);

    // Create or update subscription
    const { error: subError } = await supabaseClient
      .from('subscriptions')
      .upsert({
        subscriber_id: user.id,
        creator_id: creator_id,
        plan_id: plan_id,
        amount_paid: amount,
        is_active: true,
        expires_at: expiresAt.toISOString(),
      }, {
        onConflict: 'subscriber_id,creator_id'
      });

    if (subError) {
      console.error('Subscription error:', subError);
      throw subError;
    }

    // Update payment intent status
    const { error: intentError } = await supabaseClient
      .from('payment_intents')
      .update({ status: 'completed' })
      .eq('reference', reference);

    if (intentError) {
      console.error('Payment intent update error:', intentError);
    }

    // Credit creator's pending balance (commission deducted)
    const commission = amount * 0.15; // 15% platform fee
    const creatorEarnings = amount - commission;

    const { error: creatorError } = await supabaseClient
      .from('creators')
      .update({
        pending_balance: supabaseClient.rpc('increment', { x: creatorEarnings }),
        total_earned: supabaseClient.rpc('increment', { x: creatorEarnings }),
      })
      .eq('id', creator_id);

    if (creatorError) {
      console.error('Creator balance update error:', creatorError);
    }

    console.log('Subscription processed successfully');

    return new Response(
      JSON.stringify({ success: true, subscription: { expires_at: expiresAt } }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in process-subscription:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'Subscription processing failed' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
