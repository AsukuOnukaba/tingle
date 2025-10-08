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