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

    // Rate limiting: 50 top-ups per hour per user (higher for polling)
    if (checkRateLimit(`topup:${user.id}`, 50, 60 * 60 * 1000)) {
      throw new Error('RATE_LIMIT_EXCEEDED');
    }

    const body = await req.json();
    const { reference } = body;

    // Validate reference format (support both Paystack and Flutterwave, and generic TOP prefix)
    if (!reference || typeof reference !== 'string') {
      throw new Error('INVALID_REFERENCE');
    }
    
    // More flexible reference validation
    const isValidRef = reference.match(/^(TOP|FLW-TOP|SUB)-\d+-[a-zA-Z0-9]+$/) ||
                       reference.match(/^[A-Za-z0-9_-]{10,}$/);
    if (!isValidRef) {
      console.log('Invalid reference format:', reference);
      throw new Error('INVALID_REFERENCE');
    }

    // Determine gateway from reference
    const gateway = reference.startsWith('FLW-') ? 'flutterwave' : 'paystack';

    console.log(`Verifying ${gateway} payment: ${reference}`);

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
      // Return success for duplicate (idempotent behavior)
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Transaction already processed',
          duplicate: true,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    let amount: number;
    let paymentStatus: string;

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
      console.log('Flutterwave verification response:', JSON.stringify(verifyData));

      // Check if payment is still pending
      if (verifyData.status === 'error' && verifyData.message?.includes('No transaction')) {
        throw new Error('PAYMENT_PENDING');
      }

      if (verifyData.status !== 'success') {
        throw new Error('PAYMENT_VERIFICATION_FAILED');
      }

      paymentStatus = verifyData.data?.status;
      
      if (paymentStatus === 'pending') {
        throw new Error('PAYMENT_PENDING');
      }
      
      if (paymentStatus !== 'successful') {
        throw new Error('PAYMENT_NOT_SUCCESSFUL');
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
      console.log('Paystack verification response status:', verifyData.status, 'data.status:', verifyData.data?.status);

      if (!verifyData.status) {
        // Transaction doesn't exist yet or invalid
        throw new Error('PAYMENT_PENDING');
      }

      paymentStatus = verifyData.data?.status;

      if (paymentStatus === 'pending' || paymentStatus === 'ongoing' || paymentStatus === 'abandoned') {
        throw new Error('PAYMENT_PENDING');
      }

      if (paymentStatus !== 'success') {
        console.log('Payment not successful, status:', paymentStatus);
        throw new Error('PAYMENT_NOT_SUCCESSFUL');
      }

      // Paystack returns amount in kobo
      amount = verifyData.data.amount / 100;
    }

    console.log(`Payment verified! Amount: ${amount}`);

    // Validate amount is reasonable
    if (amount <= 0 || amount > 10000000) {
      throw new Error('INVALID_AMOUNT');
    }

    // Credit user wallet using the database function with service role
    const { data: creditResult, error: creditError } = await supabaseAdmin
      .rpc('credit_wallet', {
        p_user_id: user.id,
        p_amount: amount,
        p_reference: reference,
        p_description: `Wallet top-up via ${gateway}`
      });

    if (creditError) {
      console.error('Error crediting wallet:', creditError);
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

    console.log('Wallet credit successful:', creditResult);

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
    const errorMap: Record<string, { message: string; status: number }> = {
      'UNAUTHORIZED': { message: 'Authentication required', status: 401 },
      'INVALID_REFERENCE': { message: 'Invalid payment reference', status: 400 },
      'PAYMENT_PENDING': { message: 'Payment is still pending', status: 202 },
      'PAYMENT_NOT_SUCCESSFUL': { message: 'Payment was not successful', status: 400 },
      'PAYMENT_VERIFICATION_FAILED': { message: 'Payment verification failed', status: 400 },
      'INVALID_AMOUNT': { message: 'Invalid transaction amount', status: 400 },
      'RATE_LIMIT_EXCEEDED': { message: 'Too many requests. Please try again later.', status: 429 },
      'DUPLICATE_TRANSACTION': { message: 'This transaction has already been processed', status: 200 },
    };
    
    const errorCode = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    const errorInfo = errorMap[errorCode] || { message: 'Transaction failed. Please try again.', status: 400 };
    
    return new Response(
      JSON.stringify({ 
        error: errorInfo.message,
        pending: errorCode === 'PAYMENT_PENDING',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: errorInfo.status,
      }
    );
  }
});
