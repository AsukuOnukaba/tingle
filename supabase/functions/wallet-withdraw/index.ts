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

    const { amount, account_number, bank_code } = await req.json();

    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid amount' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!account_number || !bank_code) {
      return new Response(JSON.stringify({ error: 'Account details required' }), {
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
          },
        },
        {
          user_id: user.id,
          amount: -fee,
          type: 'fee',
          status: 'completed',
          payment_provider: 'paystack',
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
  } catch (error) {
    console.error('Error in wallet-withdraw:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

import http from "http";

const LOVABLE_CLOUD_URL = process.env.LOVABLE_CLOUD_URL!;
const LOVABLE_CLOUD_API_KEY = process.env.LOVABLE_CLOUD_API_KEY!;
const PAYSTACK_PAYOUT_SECRET = process.env.PAYSTACK_PAYOUT_SECRET ?? "";
const WITHDRAWAL_FEE_PERCENTAGE = Number(process.env.WITHDRAWAL_FEE_PERCENTAGE ?? "0.20");

function jsonResponse(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}

function getJsonBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => {
      data += chunk;
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

http.createServer(async (req) => {
  try {
    const body = await getJsonBody(req);
    const { user_id, amount, currency = "NGN", destination, client_reference } = body;
    if (!user_id || !amount || amount <= 0 || !destination) return jsonResponse({ error: "invalid_input" }, 400);

    const clientRef = client_reference ?? `payout_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    const fee = Number((Number(amount) * WITHDRAWAL_FEE_PERCENTAGE).toFixed(2));
    // Ask Lovable Cloud to create payout record and perform atomic deduction (idempotent on clientRef)
    const createPayoutResp = await fetch(`${LOVABLE_CLOUD_URL}/internal/wallets/payouts/initiate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${LOVABLE_CLOUD_API_KEY}`
      },
      body: JSON.stringify({ user_id, amount, fee, currency, provider: "paystack", provider_reference: clientRef, metadata: { destination } })
    });
    const createPayoutJson = await createPayoutResp.json();
    if (!createPayoutResp.ok) {
      return jsonResponse({ error: "backend_error", detail: createPayoutJson }, 400);
    }

    const payout = createPayoutJson; // expected fields: id, net_amount
    // Initiate provider payout (Paystack example placeholder)
    const providerResp = await fetch("https://api.paystack.co/transfer", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PAYSTACK_PAYOUT_SECRET}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        source: "balance",
        amount: Math.round(Number(payout.net_amount) * 100),
        recipient: destination.recipient_code ?? undefined,
        reason: `payout for ${payout.id}`,
        reference: clientRef
      })
    });
    const providerJson = await providerResp.json().catch(()=>({}));

    // Update Lovable Cloud with provider response
    await fetch(`${LOVABLE_CLOUD_URL}/internal/wallets/payouts/${payout.id}/complete`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${LOVABLE_CLOUD_API_KEY}`
      },
      body: JSON.stringify({ provider_response: providerJson })
    }).catch(()=>{});

    return jsonResponse({ ok: true, payout: { id: payout.id, provider: providerJson } });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: "server_error" }, 500);
  }
});