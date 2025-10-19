// supabase/functions/create-recipient/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
      });
    }

    const body = await req.json();
    const { name, account_number, bank_code } = body;

    // Validate inputs
    if (!name || typeof name !== 'string' || name.length > 100) {
      throw new Error('INVALID_NAME');
    }

    if (!account_number || typeof account_number !== 'string' || !account_number.match(/^\d{10}$/)) {
      throw new Error('INVALID_ACCOUNT');
    }

    if (!bank_code || typeof bank_code !== 'string' || !bank_code.match(/^\d{3,6}$/)) {
      throw new Error('INVALID_BANK_CODE');
    }

    const res = await fetch("https://api.paystack.co/transferrecipient", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "nuban",
        name,
        account_number,
        bank_code,
        currency: "NGN",
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to create recipient");
    }

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("Error creating recipient:", err);
    
    const errorMap: Record<string, string> = {
      'INVALID_NAME': 'Invalid recipient name',
      'INVALID_ACCOUNT': 'Invalid account number',
      'INVALID_BANK_CODE': 'Invalid bank code',
    };
    
    const errorCode = err instanceof Error ? err.message : 'UNKNOWN_ERROR';
    const userMessage = errorMap[errorCode] || 'Failed to create recipient';
    
    return new Response(JSON.stringify({ error: userMessage }), { status: 400 });
  }
});
