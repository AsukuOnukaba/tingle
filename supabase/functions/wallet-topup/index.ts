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
    
    if (userError || !user) {
      throw new Error('UNAUTHORIZED');
    }

    // Rate limiting: 5 top-ups per hour per user
    if (checkRateLimit(`topup:${user.id}`, 5, 60 * 60 * 1000)) {
      throw new Error('RATE_LIMIT_EXCEEDED');
    }

    const body = await req.json();
    const { reference } = body;

    // Validate reference format (support both Paystack and Flutterwave)
    if (!reference || typeof reference !== 'string' || 
        !reference.match(/^(TOP|FLW-TOP)-\d+-[a-zA-Z0-9]+$/)) {
      throw new Error('INVALID_REFERENCE');
    }

    // Determine gateway from reference
    const gateway = reference.startsWith('FLW-') ? 'flutterwave' : 'paystack';

    // Secure logging - avoid sensitive data exposure
    if (Deno.env.get('DEBUG_MODE') === 'true') {
      console.log('Processing payment verification');
    }

    // Check for duplicate using idempotency
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: existingTx } = await supabaseAdmin
      .from('transactions')
      .select('id')
      .eq('idempotency_key', reference)
      .maybeSingle();

    if (existingTx) {
      console.log('Duplicate transaction detected:', reference);
      throw new Error('DUPLICATE_TRANSACTION');
    }

    let amount: number;

    // Verify payment based on gateway
    if (gateway === 'flutterwave') {
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

      if (verifyData.status !== 'success' || verifyData.data.status !== 'successful') {
        throw new Error('PAYMENT_VERIFICATION_FAILED');
      }

      amount = verifyData.data.amount;
    } else {
      // Paystack verification
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

      // Paystack returns amount in kobo
      amount = verifyData.data.amount / 100;
    }

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

    // Update transaction with gateway and idempotency key
    await supabaseAdmin
      .from('transactions')
      .update({
        gateway: gateway,
        idempotency_key: reference
      })
      .eq('reference', reference);

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
      'RATE_LIMIT_EXCEEDED': 'Too many requests. Please try again later.',
      'DUPLICATE_TRANSACTION': 'This transaction has already been processed',
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