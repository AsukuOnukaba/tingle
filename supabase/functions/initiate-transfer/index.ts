// supabase/functions/initiate-transfer/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
      });
    }

    const body = await req.json();
    const { amount, recipient, reason } = body;

    // Validate inputs
    if (!amount || typeof amount !== 'number' || amount <= 0 || amount > 10000000) {
      throw new Error('INVALID_AMOUNT');
    }

    if (!recipient || typeof recipient !== 'string' || !recipient.match(/^RCP_[a-zA-Z0-9]+$/)) {
      throw new Error('INVALID_RECIPIENT');
    }

    if (reason && typeof reason !== 'string') {
      throw new Error('INVALID_REASON');
    }

    const res = await fetch("https://api.paystack.co/transfer", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "balance",
        amount,
        recipient,
        reason,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to initiate transfer");
    }

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error initiating transfer:", error);
    
    const errorMap: Record<string, string> = {
      'INVALID_AMOUNT': 'Invalid transfer amount',
      'INVALID_RECIPIENT': 'Invalid recipient',
      'INVALID_REASON': 'Invalid transfer reason',
    };
    
    const errorCode = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    const userMessage = errorMap[errorCode] || 'Transfer failed';
    
    return new Response(JSON.stringify({ error: userMessage }), { status: 400 });
  }
});
