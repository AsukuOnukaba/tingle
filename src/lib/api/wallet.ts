const BASE = import.meta.env.VITE_API_BASE ?? `${location.origin}/api`;

export async function topup({ user_id, amount, provider = "paystack", client_reference, email }) {
  const res = await fetch(`${BASE}/wallet-topup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id, amount, provider, client_reference, email })
  });
  return res.json();
}

export async function withdraw({ user_id, amount, destination, client_reference }) {
  const res = await fetch(`${BASE}/wallet-withdraw`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id, amount, destination, client_reference })
  });
  return res.json();
}