import http from "http";

const LOVABLE_CLOUD_URL = process.env.LOVABLE_CLOUD_URL!;
const LOVABLE_CLOUD_API_KEY = process.env.LOVABLE_CLOUD_API_KEY!;
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET ?? "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";

function jsonResponse(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}

// Paystack signature verification (HMAC SHA-512 of raw body)
async function verifyPaystackSignature(rawBody: string, sigHeader: string | null) {
  if (!sigHeader) return false;
  const enc = new TextEncoder();
  const key = enc.encode(PAYSTACK_SECRET);
  const data = enc.encode(rawBody);
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-512" }, false, ["verify"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, data);
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  return hex === sigHeader;
}

http.createServer(async (req) => {
  try {
    const raw = await new Promise<string>((resolve, reject) => {
      let data = "";
      req.on("data", chunk => data += chunk);
      req.on("end", () => resolve(data));
      req.on("error", reject);
    });
    const headers = req.headers;
    // Attempt Paystack verification first
    const paystackSig = headers["x-paystack-signature"] as string | undefined;
    if (paystackSig) {
      const ok = await verifyPaystackSignature(raw, paystackSig);
      if (!ok) return jsonResponse({ error: "invalid_signature" }, 400);
      const payload = JSON.parse(raw);
      const reference = payload.data?.reference;
      const paid = payload.data?.status === "success";
      if (!reference || !paid) return jsonResponse({ ok: false }, 400);

      // Notify Lovable Cloud to complete the transaction idempotently
      const completion = await fetch(`${LOVABLE_CLOUD_URL}/internal/wallets/transactions/complete`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "authorization": `Bearer ${LOVABLE_CLOUD_API_KEY}`
        },
        body: JSON.stringify({ reference, provider: "paystack", provider_payload: payload })
      });
      const completionJson = await completion.json().catch(()=>({}));
      return jsonResponse({ ok: true, result: completionJson });
    }

    // Stripe webhook (simple pass-through, recommend using official Stripe lib inside Edge or Lovable)
    const stripeSig = headers["stripe-signature"] as string | undefined;
    if (stripeSig) {
      // TODO: you can verify signature here using STRIPE_WEBHOOK_SECRET or forward raw to Lovable Cloud to verify
      const completion = await fetch(`${LOVABLE_CLOUD_URL}/internal/wallets/transactions/complete`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "authorization": `Bearer ${LOVABLE_CLOUD_API_KEY}`
        },
        body: raw // forward raw to let backend verify
      });
      const completionJson = await completion.json().catch(()=>({}));
      return jsonResponse({ ok: true, result: completionJson });
    }

    return jsonResponse({ error: "unknown_provider" }, 400);
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: "server_error" }, 500);
  }
});