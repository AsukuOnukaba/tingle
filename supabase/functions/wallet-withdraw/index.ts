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
    const { amount, recipient_code } = body;

    // Validate inputs
    if (!amount || typeof amount !== 'number' || amount <= 0 || amount > 10000000) {
      throw new Error('INVALID_AMOUNT');
    }

    if (!recipient_code || typeof recipient_code !== 'string' || !recipient_code.match(/^RCP_[a-zA-Z0-9]+$/)) {
      throw new Error('INVALID_RECIPIENT');
    }

    console.log('Processing withdrawal for user:', user.id, 'amount:', amount);

    // Verify user is a creator
    const { data: creator, error: creatorError } = await supabaseClient
      .from('creators')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (creatorError || !creator) {
      throw new Error('CREATOR_ONLY');
    }

    // Calculate platform commission (20%)
    const commission = amount * 0.20;
    const netAmount = amount - commission;
    const reference = `WD-${Date.now()}-${user.id.substring(0, 8)}`;

    // Create withdrawal request first (before debiting wallet)
    const { data: withdrawalRequest, error: requestError } = await supabaseClient
      .from('withdrawal_requests')
      .insert({
        user_id: user.id,
        amount,
        net_amount: netAmount,
        commission,
        recipient_code,
        reference,
        status: 'pending'
      })
      .select()
      .single();

    if (requestError) {
      console.error('Error creating withdrawal request:', requestError);
      throw new Error('REQUEST_FAILED');
    }

    try {
      // Initiate Paystack transfer first
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
            amount: netAmount * 100,
            recipient: recipient_code,
            reference,
            reason: 'Creator withdrawal',
          }),
        }
      );

      const transferData = await transferResponse.json();
      console.log('Paystack transfer response:', transferData);

      if (!transferData.status) {
        // Update withdrawal request with error
        await supabaseClient
          .from('withdrawal_requests')
          .update({ 
            status: 'failed',
            error_message: transferData.message || 'Transfer failed'
          })
          .eq('id', withdrawalRequest.id);
        
        throw new Error('TRANSFER_FAILED');
      }

      // Transfer initiated successfully, now debit wallet
      const { data: debitResult, error: debitError } = await supabaseClient
        .rpc('debit_wallet', {
          p_user_id: user.id,
          p_amount: amount,
          p_reference: reference,
          p_description: `Withdrawal (Net: ${netAmount} NGN, Fee: ${commission} NGN)`
        });

      if (debitError) {
        console.error('Error debiting wallet:', debitError);
        // Mark withdrawal as failed
        await supabaseClient
          .from('withdrawal_requests')
          .update({ 
            status: 'failed',
            error_message: 'Failed to debit wallet'
          })
          .eq('id', withdrawalRequest.id);
        
        throw new Error('DEBIT_FAILED');
      }

      // Update withdrawal request as completed
      await supabaseClient
        .from('withdrawal_requests')
        .update({ 
          status: 'completed',
          transfer_code: transferData.data.transfer_code
        })
        .eq('id', withdrawalRequest.id);

      return new Response(
        JSON.stringify({
          success: true,
          amount,
          net_amount: netAmount,
          commission,
          transfer_code: transferData.data.transfer_code,
          new_balance: debitResult.new_balance,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } catch (innerError) {
      // If anything fails, ensure withdrawal request is marked as failed
      await supabaseClient
        .from('withdrawal_requests')
        .update({ 
          status: 'failed',
          error_message: innerError instanceof Error ? innerError.message : 'Unknown error'
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
      'INVALID_RECIPIENT': 'Invalid recipient code',
      'CREATOR_ONLY': 'Only creators can withdraw funds',
      'REQUEST_FAILED': 'Failed to create withdrawal request',
      'TRANSFER_FAILED': 'Transfer initiation failed',
      'DEBIT_FAILED': 'Insufficient balance',
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