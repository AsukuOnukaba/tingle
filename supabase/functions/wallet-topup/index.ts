import http from "http";

const LOVABLE_CLOUD_URL = process.env.LOVABLE_CLOUD_URL ?? "";
const LOVABLE_CLOUD_API_KEY = process.env.LOVABLE_CLOUD_API_KEY ?? "";
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET ?? "";
const STRIPE_SECRET = process.env.STRIPE_SECRET ?? "";

function jsonResponse(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}

http.createServer(async (req, res) => {
  try {
    // validate env
    if (!LOVABLE_CLOUD_URL || !LOVABLE_CLOUD_API_KEY) {
      return jsonResponse({ error: "missing_backend_env" }, 500);
    }

    // Parse JSON body from IncomingMessage
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    let body: any = {};
    try {
      body = JSON.parse(Buffer.concat(chunks).toString());
    } catch {
      return jsonResponse({ error: "invalid_json" }, 400);
    }
    const { user_id, amount, currency = "NGN", provider = "paystack", client_reference } = body;
    if (!user_id || !amount || Number(amount) <= 0) return jsonResponse({ error: "invalid_input" }, 400);

    // create pending transaction on Lovable Cloud (idempotent on reference)
    const reference = client_reference ?? `topup_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    const createTxResp = await fetch(`${LOVABLE_CLOUD_URL}/internal/wallets/transactions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${LOVABLE_CLOUD_API_KEY}`
      },
      body: JSON.stringify({ user_id, amount, currency, type: "topup", reference })
    });

    // try to parse backend response for useful error info
    let createTxJson: any = null;
    try { createTxJson = await createTxResp.json(); } catch { createTxJson = null; }

    if (!createTxResp.ok) {
      return jsonResponse({ error: "backend_error", status: createTxResp.status, detail: createTxJson ?? await createTxResp.text() }, 500);
    }

    // initialize provider payment
    if (provider === "stripe") {
      // create PaymentIntent (use cents)
      const piResp = await fetch("https://api.stripe.com/v1/payment_intents", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${STRIPE_SECRET}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          amount: String(Math.round(Number(amount) * 100)), // cents
          currency: currency.toLowerCase(),
          // set metadata using stripe form-encoding format
          "metadata[reference]": reference
        })
      });
      const piJson = await piResp.json().catch(() => ({ error: "invalid_response" }));
      return jsonResponse({ provider: "stripe", reference, payment_intent: piJson }, piResp.ok ? 200 : 502);
    } else {
      // Paystack initialize - amount in kobo (multiply before rounding)
      const paystackAmount = Math.round(Number(amount) * 100);
      const initResp = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${PAYSTACK_SECRET}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: body.email ?? "no-reply@example.com",
          amount: paystackAmount,
          currency,
          metadata: { reference }
        })
      });
      const initJson = await initResp.json().catch(() => ({ error: "invalid_response" }));
      return jsonResponse({ provider: "paystack", reference, authorization: initJson }, initResp.ok ? 200 : 502);
    }
  } catch (err) {
    console.error("wallet-topup error:", err);
    return jsonResponse({ error: "server_error" }, 500);
  }
});