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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      throw new Error('UNAUTHORIZED');
    }

    const body = await req.json();
    const { reference } = body;

    // Validate reference format
    if (!reference || typeof reference !== 'string' || !reference.match(/^TOP-\d+-[a-zA-Z0-9]+$/)) {
      throw new Error('INVALID_REFERENCE');
    }

    // Secure logging - avoid sensitive data exposure
    if (Deno.env.get('DEBUG_MODE') === 'true') {
      console.log('Processing payment verification');
    }

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
      throw new Error('PAYMENT_VERIFICATION_FAILED');
    }

    // Extract amount in Naira (Paystack returns amount in kobo)
    const amount = verifyData.data.amount / 100;

    // Validate amount is reasonable
    if (amount <= 0 || amount > 10000000) {
      throw new Error('INVALID_AMOUNT');
    }

    // Credit user wallet using the database function
    const { data: creditResult, error: creditError } = await supabaseClient
      .rpc('credit_wallet', {
        p_user_id: user.id,
        p_amount: amount,
        p_reference: reference,
        p_description: 'Wallet top-up via Paystack'
      });

    if (creditError) {
      console.error('Error crediting wallet - code:', creditError.code);
      throw new Error('Failed to credit wallet');
    }

    // Secure logging - no sensitive financial data
    if (Deno.env.get('DEBUG_MODE') === 'true') {
      console.log('Wallet credit successful');
    }

    return new Response(
      JSON.stringify({
        success: true,
        amount,
        new_balance: creditResult.new_balance,
        transaction_id: creditResult.transaction_id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in wallet-topup function:', error);
    
    // Map errors to user-friendly messages
    const errorMap: Record<string, string> = {
      'UNAUTHORIZED': 'Authentication required',
      'INVALID_REFERENCE': 'Invalid payment reference',
      'PAYMENT_VERIFICATION_FAILED': 'Payment verification failed',
      'INVALID_AMOUNT': 'Invalid transaction amount',
    };
    
    const errorCode = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    const userMessage = errorMap[errorCode] || 'Transaction failed. Please try again.';
    
    return new Response(
      JSON.stringify({ error: userMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});