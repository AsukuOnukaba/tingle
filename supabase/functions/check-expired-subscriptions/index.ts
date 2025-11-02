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

    console.log('Checking for expired subscriptions...');

    // Find all active subscriptions that have expired
    const { data: expiredSubscriptions, error: fetchError } = await supabaseClient
      .from('subscriptions')
      .select('id, subscriber_id, creator_id, expires_at')
      .eq('is_active', true)
      .lt('expires_at', new Date().toISOString());

    if (fetchError) {
      console.error('Error fetching subscriptions:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${expiredSubscriptions?.length || 0} expired subscriptions`);

    if (expiredSubscriptions && expiredSubscriptions.length > 0) {
      // Deactivate expired subscriptions
      const subscriptionIds = expiredSubscriptions.map(sub => sub.id);
      
      const { error: updateError } = await supabaseClient
        .from('subscriptions')
        .update({ is_active: false })
        .in('id', subscriptionIds);

      if (updateError) {
        console.error('Error updating subscriptions:', updateError);
        throw updateError;
      }

      // Send notifications to users
      for (const sub of expiredSubscriptions) {
        await supabaseClient.rpc('send_notification', {
          p_user_id: sub.subscriber_id,
          p_type: 'subscription_expired',
          p_title: 'Subscription Expired',
          p_message: 'Your subscription has expired. You have been moved to the Basic (Free) plan. Subscribe again to continue enjoying premium content.',
          p_metadata: {
            creator_id: sub.creator_id,
            expired_at: sub.expires_at
          }
        });
      }

      console.log(`Deactivated ${expiredSubscriptions.length} expired subscriptions and sent notifications`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        expired_count: expiredSubscriptions?.length || 0 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in check-expired-subscriptions:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to check subscriptions' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
