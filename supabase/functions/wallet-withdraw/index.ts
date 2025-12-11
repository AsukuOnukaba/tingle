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

// Platform withdrawal fee percentage (20%)
const PLATFORM_FEE_PERCENTAGE = 0.20;

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

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      throw new Error('UNAUTHORIZED');
    }

    // Rate limiting: 3 withdrawals per hour per user
    if (checkRateLimit(`withdraw:${user.id}`, 3, 60 * 60 * 1000)) {
      throw new Error('RATE_LIMIT_EXCEEDED');
    }

    const body = await req.json();
    const { amount, recipient_code } = body;

    // Validate inputs
    if (!amount || typeof amount !== 'number' || amount <= 0 || amount > 10000000) {
      throw new Error('INVALID_AMOUNT');
    }

    // Minimum withdrawal amount
    if (amount < 1000) {
      throw new Error('MINIMUM_WITHDRAWAL');
    }

    if (!recipient_code || typeof recipient_code !== 'string' || !recipient_code.match(/^RCP_[a-zA-Z0-9]+$/)) {
      throw new Error('INVALID_RECIPIENT');
    }

    // Check user's wallet balance
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      throw new Error('WALLET_NOT_FOUND');
    }

    if (wallet.balance < amount) {
      throw new Error('INSUFFICIENT_BALANCE');
    }

    // Calculate platform commission (20%)
    const platformFee = Math.ceil(amount * PLATFORM_FEE_PERCENTAGE);
    const netAmount = amount - platformFee;
    const reference = `WD-${Date.now()}-${user.id.substring(0, 8)}`;

    console.log(`Processing withdrawal: amount=₦${amount}, fee=₦${platformFee} (20%), net=₦${netAmount}`);

    // Create withdrawal request first (before debiting wallet)
    const { data: withdrawalRequest, error: requestError } = await supabaseAdmin
      .from('withdrawal_requests')
      .insert({
        user_id: user.id,
        amount,
        net_amount: netAmount,
        commission: platformFee,
        recipient_code,
        reference,
        status: 'processing'
      })
      .select()
      .single();

    if (requestError) {
      console.error('Error creating withdrawal request:', requestError);
      throw new Error('REQUEST_FAILED');
    }

    try {
      // Initiate Paystack transfer
      const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
      const transferResponse = await fetch(
        'https://api.paystack.co/transfer',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            source: 'balance',
            amount: netAmount * 100, // Convert to kobo
            recipient: recipient_code,
            reference,
            reason: `Tingle Withdrawal - Fee: ₦${platformFee.toLocaleString()} (20%)`,
          }),
        }
      );

      const transferData = await transferResponse.json();
      console.log('Paystack transfer response:', JSON.stringify(transferData));

      if (!transferData.status) {
        // Update withdrawal request with error
        await supabaseAdmin
          .from('withdrawal_requests')
          .update({ 
            status: 'failed',
            error_message: transferData.message || 'Transfer failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', withdrawalRequest.id);
        
        throw new Error('TRANSFER_FAILED');
      }

      // Transfer initiated successfully, now debit wallet
      const { data: debitResult, error: debitError } = await supabaseAdmin
        .rpc('debit_wallet', {
          p_user_id: user.id,
          p_amount: amount,
          p_reference: reference,
          p_description: `Withdrawal - Platform fee: ₦${platformFee.toLocaleString()} (20%)`
        });

      if (debitError) {
        console.error('Error debiting wallet:', debitError);
        // Mark withdrawal as failed
        await supabaseAdmin
          .from('withdrawal_requests')
          .update({ 
            status: 'failed',
            error_message: 'Failed to debit wallet',
            updated_at: new Date().toISOString(),
          })
          .eq('id', withdrawalRequest.id);
        
        throw new Error('DEBIT_FAILED');
      }

      // Update withdrawal request as completed
      await supabaseAdmin
        .from('withdrawal_requests')
        .update({ 
          status: 'completed',
          transfer_code: transferData.data?.transfer_code,
          updated_at: new Date().toISOString(),
        })
        .eq('id', withdrawalRequest.id);

      console.log('Withdrawal successful:', {
        reference,
        amount,
        platformFee,
        netAmount,
        newBalance: debitResult.new_balance,
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Withdrawal processed successfully',
          amount,
          platform_fee: platformFee,
          fee_percentage: '20%',
          net_amount: netAmount,
          transfer_code: transferData.data?.transfer_code,
          new_balance: debitResult.new_balance,
          reference,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } catch (innerError) {
      // If anything fails, ensure withdrawal request is marked as failed
      await supabaseAdmin
        .from('withdrawal_requests')
        .update({ 
          status: 'failed',
          error_message: innerError instanceof Error ? innerError.message : 'Unknown error',
          updated_at: new Date().toISOString(),
        })
        .eq('id', withdrawalRequest.id);
      
      throw innerError;
    }

  } catch (error) {
    console.error('Error in wallet-withdraw function:', error);
    
    // Map errors to user-friendly messages
    const errorMap: Record<string, string> = {
      'UNAUTHORIZED': 'Authentication required',
      'INVALID_AMOUNT': 'Invalid withdrawal amount',
      'MINIMUM_WITHDRAWAL': 'Minimum withdrawal amount is ₦1,000',
      'INVALID_RECIPIENT': 'Invalid recipient code. Please create a recipient first.',
      'WALLET_NOT_FOUND': 'Wallet not found',
      'INSUFFICIENT_BALANCE': 'Insufficient wallet balance',
      'REQUEST_FAILED': 'Failed to create withdrawal request',
      'TRANSFER_FAILED': 'Transfer initiation failed. Please try again.',
      'DEBIT_FAILED': 'Failed to process withdrawal',
      'RATE_LIMIT_EXCEEDED': 'Too many withdrawal attempts. Please try again later.',
    };
    
    const errorCode = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    const userMessage = errorMap[errorCode] || 'Withdrawal failed. Please try again.';
    
    return new Response(
      JSON.stringify({ error: userMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
