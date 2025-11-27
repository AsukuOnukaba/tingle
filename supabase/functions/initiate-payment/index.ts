import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiter
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimits = new Map<string, RateLimitEntry>();

function checkRateLimit(identifier: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimits.get(identifier);

  if (!entry || now > entry.resetTime) {
    rateLimits.set(identifier, { count: 1, resetTime: now + windowMs });
    return false;
  }

  if (entry.count >= maxAttempts) {
    return true;
  }

  entry.count++;
  return false;
}

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
    
    if (userError || !user || !user.email) {
      throw new Error('UNAUTHORIZED');
    }

    // Rate limiting: 10 payment initiations per hour
    if (checkRateLimit(`payment:${user.id}`, 10, 60 * 60 * 1000)) {
      throw new Error('RATE_LIMIT_EXCEEDED');
    }

    const body = await req.json();
    const { amount, gateway = 'paystack' } = body;

    // Validate amount
    if (!amount || amount <= 0 || amount > 10000000) {
      throw new Error('INVALID_AMOUNT');
    }

    // Generate reference with gateway prefix
    const timestamp = Date.now();
    const userPrefix = user.id.substring(0, 8);
    let reference: string;
    let paymentUrl: string;

    if (gateway === 'flutterwave') {
      reference = `FLW-TOP-${timestamp}-${userPrefix}`;
      
      // Initialize Flutterwave payment
      const flutterwaveSecret = Deno.env.get('FLUTTERWAVE_SECRET_KEY');
      const flutterwaveResponse = await fetch('https://api.flutterwave.com/v3/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${flutterwaveSecret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tx_ref: reference,
          amount: amount,
          currency: 'NGN',
          redirect_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/verify-payment`,
          customer: {
            email: user.email,
            name: user.user_metadata?.display_name || user.email,
          },
          customizations: {
            title: 'Wallet Top-Up',
            description: 'Add funds to your wallet',
          },
        }),
      });

      const flwData = await flutterwaveResponse.json();
      
      if (flwData.status !== 'success') {
        throw new Error('FLUTTERWAVE_INIT_FAILED');
      }

      paymentUrl = flwData.data.link;
    } else {
      // Default to Paystack
      reference = `TOP-${timestamp}-${userPrefix}`;
      
      const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY');
      const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${paystackSecret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          amount: amount * 100, // Convert to kobo
          reference: reference,
          callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/verify-payment`,
        }),
      });

      const pstData = await paystackResponse.json();
      
      if (!pstData.status) {
        throw new Error('PAYSTACK_INIT_FAILED');
      }

      paymentUrl = pstData.data.authorization_url;
    }

    // Create payment intent with idempotency
    const { error: intentError } = await (supabaseClient as any)
      .from('payment_intents')
      .insert({
        user_id: user.id,
        amount: amount,
        currency: 'NGN',
        reference: reference,
        status: 'pending',
        payment_provider: gateway,
        gateway: gateway,
        metadata: {
          idempotency_key: reference,
        },
      });

    if (intentError) {
      console.error('Error creating payment intent:', intentError);
      // Continue anyway - payment can still be processed
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_url: paymentUrl,
        reference: reference,
        gateway: gateway,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error initiating payment:', error);
    
    const errorMap: Record<string, string> = {
      'UNAUTHORIZED': 'Authentication required',
      'INVALID_AMOUNT': 'Invalid payment amount',
      'RATE_LIMIT_EXCEEDED': 'Too many requests. Please try again later.',
      'FLUTTERWAVE_INIT_FAILED': 'Flutterwave initialization failed',
      'PAYSTACK_INIT_FAILED': 'Paystack initialization failed',
    };
    
    const errorCode = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    const userMessage = errorMap[errorCode] || 'Payment initialization failed. Please try again.';
    
    return new Response(
      JSON.stringify({ error: userMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});