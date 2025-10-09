import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WITHDRAWAL_FEE_PERCENTAGE = 0.20; // 20% fee

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use anon key for auth check
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Use service role for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { amount, method, account_number, bank_code, bitcoin_address } = await req.json();

    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid amount' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (method === 'bank' && (!account_number || !bank_code)) {
      return new Response(JSON.stringify({ error: 'Bank details required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (method === 'bitcoin' && !bitcoin_address) {
      return new Response(JSON.stringify({ error: 'Bitcoin address required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get current wallet balance
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      return new Response(JSON.stringify({ error: 'Wallet not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (wallet.balance < amount) {
      return new Response(JSON.stringify({ error: 'Insufficient balance' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate fee and net amount
    const fee = amount * WITHDRAWAL_FEE_PERCENTAGE;
    const netAmount = amount - fee;

    if (method === 'bank') {
      // Create transfer recipient in Paystack
      const recipientResponse = await fetch('https://api.paystack.co/transferrecipient', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'nuban',
          name: user.email,
          account_number: account_number,
          bank_code: bank_code,
          currency: 'NGN',
        }),
      });

      const recipientData = await recipientResponse.json();

      if (!recipientResponse.ok) {
        console.error('Paystack recipient error:', recipientData);
        return new Response(JSON.stringify({ error: 'Failed to create recipient', details: recipientData }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Initiate transfer
      const transferResponse = await fetch('https://api.paystack.co/transfer', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: 'balance',
          amount: Math.round(netAmount * 100), // Convert to kobo
          recipient: recipientData.data.recipient_code,
          reason: 'Wallet withdrawal',
        }),
      });

      const transferData = await transferResponse.json();

      if (!transferResponse.ok) {
        console.error('Paystack transfer error:', transferData);
        return new Response(JSON.stringify({ error: 'Transfer failed', details: transferData }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Deduct from wallet
      const newBalance = wallet.balance - amount;
      const { error: updateError } = await supabaseAdmin
        .from('wallets')
        .update({ balance: newBalance })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Wallet update error:', updateError);
        return new Response(JSON.stringify({ error: 'Failed to update wallet' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create transaction records for both withdrawal and fee
      const { error: txError } = await supabaseAdmin
        .from('transactions')
        .insert([
          {
            user_id: user.id,
            amount: -amount,
            type: 'withdrawal',
            status: 'completed',
            payment_provider: 'paystack',
            reference: transferData.data.reference,
            balance_after: newBalance,
            metadata: {
              fee: fee,
              net_amount: netAmount,
              account_number: account_number,
              bank_code: bank_code,
              method: 'bank',
            },
          },
          {
            user_id: user.id,
            amount: fee,
            type: 'platform_fee',
            status: 'completed',
            payment_provider: 'internal',
            reference: `fee_${transferData.data.reference}`,
            balance_after: newBalance,
          },
        ]);

      if (txError) {
        console.error('Transaction creation error:', txError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          amount_withdrawn: amount,
          fee: fee,
          net_amount: netAmount,
          new_balance: newBalance,
          transfer_code: transferData.data.transfer_code,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      // For bitcoin and other methods - coming soon
      return new Response(
        JSON.stringify({
          error: 'Method not yet implemented',
          message: `${method} withdrawal is coming soon`,
        }),
        {
          status: 501,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('Error in wallet-withdraw:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});