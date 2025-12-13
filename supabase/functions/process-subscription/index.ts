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

    // Determine gateway from reference
    const isFlutterwave = reference.startsWith('FLW-');
    
    let amount: number;
    let customerEmail: string;

    if (isFlutterwave) {
      // Verify payment with Flutterwave
      const flutterwaveSecret = Deno.env.get('FLUTTERWAVE_SECRET_KEY');
      const verifyResponse = await fetch(
        `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${reference}`,
        {
          headers: {
            Authorization: `Bearer ${flutterwaveSecret}`,
          },
        }
      );

      const verifyData = await verifyResponse.json();
      console.log('Flutterwave verification response:', verifyData.status);

      if (verifyData.status !== 'success' || verifyData.data?.status !== 'successful') {
        throw new Error('Payment verification failed');
      }

      amount = verifyData.data.amount;
      customerEmail = verifyData.data.customer?.email;
    } else {
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
      console.log('Paystack verification response:', verifyData.status, verifyData.data?.status);

      if (!verifyData.status || verifyData.data.status !== 'success') {
        throw new Error('Payment verification failed');
      }

      amount = verifyData.data.amount / 100; // Convert from kobo to naira
      customerEmail = verifyData.data.customer.email;
    }

    console.log('Payment verified:', { amount, customerEmail });

    // Get user from email
    const { data: { users }, error: userError } = await supabaseClient.auth.admin.listUsers();
    const user = users?.find(u => u.email === customerEmail);

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

    // creator_id passed from frontend is the profile/user_id of the creator
    // We need to get the internal creator record ID for payment_intents FK
    const { data: creatorData, error: creatorFetchError } = await supabaseClient
      .from('creators')
      .select('id, user_id')
      .eq('user_id', creator_id)
      .single();

    if (creatorFetchError || !creatorData) {
      console.error('Creator fetch error:', creatorFetchError);
      throw new Error('Creator not found');
    }

    // Calculate expiry date based on plan
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + plan.duration_days);

    // Create or update subscription (use creator's user_id for subscriptions table)
    const { data: subscription, error: subError } = await supabaseClient
      .from('subscriptions')
      .upsert({
        subscriber_id: user.id,
        creator_id: creator_id, // This is the user_id of the creator (for subscriptions FK to profiles)
        plan_id: plan_id,
        amount_paid: amount,
        is_active: true,
        expires_at: expiresAt.toISOString(),
      }, {
        onConflict: 'subscriber_id,creator_id'
      })
      .select()
      .single();

    if (subError) {
      console.error('Subscription error:', subError);
      throw subError;
    }

    // Parse plan features to determine entitlements
    const planFeatures = plan.features || [];
    const entitlementTypes = ['premium_content', 'premium_chat'];
    
    // Check if plan includes priority messages
    if (planFeatures.some((f: string) => 
      f.toLowerCase().includes('priority') || 
      f.toLowerCase().includes('message') ||
      f.toLowerCase().includes('unlimited')
    )) {
      entitlementTypes.push('priority_messages');
    }

    // Create subscription entitlements based on plan
    const entitlements = entitlementTypes.map(type => ({
      subscription_id: subscription.id,
      user_id: user.id,
      creator_id: creator_id, // Profile/user_id of creator
      entitlement_type: type,
      expires_at: expiresAt.toISOString(),
      is_active: true,
    }));

    const { error: entitlementsError } = await supabaseClient
      .from('subscription_entitlements')
      .upsert(entitlements, {
        onConflict: 'subscription_id,entitlement_type'
      });

    if (entitlementsError) {
      console.error('Entitlements creation error:', entitlementsError);
      // Don't fail the subscription, just log the error
    }

    // Update payment intent status
    const { error: intentError } = await supabaseClient
      .from('payment_intents')
      .update({ status: 'completed' })
      .eq('reference', reference);

    if (intentError) {
      console.error('Payment intent update error:', intentError);
    }

    // Credit creator's pending balance (commission deducted) - use internal creator id
    const commission = amount * 0.15; // 15% platform fee
    const creatorEarnings = amount - commission;

    // First get current balance
    const { data: currentCreator } = await supabaseClient
      .from('creators')
      .select('pending_balance, total_earned')
      .eq('id', creatorData.id)
      .single();

    if (currentCreator) {
      const newPendingBalance = (currentCreator.pending_balance || 0) + creatorEarnings;
      const newTotalEarned = (currentCreator.total_earned || 0) + creatorEarnings;

      const { error: creatorError } = await supabaseClient
        .from('creators')
        .update({
          pending_balance: newPendingBalance,
          total_earned: newTotalEarned,
        })
        .eq('id', creatorData.id);

      if (creatorError) {
        console.error('Creator balance update error:', creatorError);
      }
    }

    console.log('Subscription processed successfully:', {
      subscriber: user.id,
      creator: creator_id,
      plan: plan.name,
      expires: expiresAt.toISOString(),
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        subscription: { 
          id: subscription.id,
          expires_at: expiresAt.toISOString(),
          plan_name: plan.name,
        } 
      }),
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
