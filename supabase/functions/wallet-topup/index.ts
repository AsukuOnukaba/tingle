/**
 * wallet-topup/index.ts
 * Deno edge function to:
 *  - create a pending transaction on Lovable backend (idempotent on reference)
 *  - initialize a Paystack (or Stripe) payment intent and return authorization payload
 *
 * Expects JSON POST: { user_id, amount, currency?, email?, client_reference?, provider? }
 *
 * Environment variables (set in Supabase / environment):
 *  - LOVABLE_CLOUD_URL
 *  - LOVABLE_CLOUD_API_KEY
 *  - PAYSTACK_SECRET
 *  - STRIPE_SECRET (optional)
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_CLOUD_URL = Deno.env.get("LOVABLE_CLOUD_URL") ?? "";
    const LOVABLE_CLOUD_API_KEY = Deno.env.get("LOVABLE_CLOUD_API_KEY") ?? "";
    const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET") ?? "";
    const STRIPE_SECRET = Deno.env.get("STRIPE_SECRET") ?? "";

    if (!LOVABLE_CLOUD_URL || !LOVABLE_CLOUD_API_KEY) {
      return new Response(JSON.stringify({ error: "missing_backend_env" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "method_not_allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({} as any));
    const {
      user_id,
      amount,
      currency = "NGN",
      email,
      client_reference,
      provider,
    } = body as any;

    if (!user_id || !amount || Number(amount) <= 0) {
      return new Response(JSON.stringify({ error: "invalid_input" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reference =
      client_reference ?? `topup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Create pending transaction at Lovable backend (idempotent on reference)
    const createTxResp = await fetch(`${LOVABLE_CLOUD_URL}/internal/wallets/transactions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${LOVABLE_CLOUD_API_KEY}`,
      },
      body: JSON.stringify({
        user_id,
        amount: Number(amount),
        currency,
        type: "topup",
        reference,
      }),
    });

    const createTxJson = await createTxResp.json().catch(() => null);

    // If Lovable backend fails, propagate a 502 back. If 409 / duplicate, we still continue (idempotency)
    if (!createTxResp.ok && createTxResp.status !== 409) {
      return new Response(
        JSON.stringify({ error: "backend_create_tx_failed", details: createTxJson }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // provider-specific payment init
    if (provider === "stripe") {
      // Stripe payment intent (server-side secret must be set)
      if (!STRIPE_SECRET) {
        return new Response(JSON.stringify({ error: "missing_stripe_secret" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const stripeAmount = Math.round(Number(amount) * 100);
      const params = new URLSearchParams();
      params.append("amount", String(stripeAmount));
      params.append("currency", (currency ?? "ngn").toLowerCase());
      // keep it simple: payment_method_types[]=card
      params.append("payment_method_types[]", "card");
      params.append("metadata[reference]", reference);

      const initResp = await fetch("https://api.stripe.com/v1/payment_intents", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      const initJson = await initResp.json().catch(() => ({ error: "invalid_response" }));
      return new Response(JSON.stringify({ provider: "stripe", reference, authorization: initJson }), {
        status: initResp.ok ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default: Paystack initialize
    if (!PAYSTACK_SECRET) {
      return new Response(JSON.stringify({ error: "missing_paystack_secret" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paystackAmount = Math.round(Number(amount) * 100); // convert to kobo
    const initResp = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email ?? "no-reply@example.com",
        amount: paystackAmount,
        currency,
        metadata: { reference },
      }),
    });

    const initJson = await initResp.json().catch(() => ({ error: "invalid_response" }));
    return new Response(JSON.stringify({ provider: "paystack", reference, authorization: initJson }), {
      status: initResp.ok ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("wallet-topup error:", err);
    return new Response(JSON.stringify({ error: "server_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
