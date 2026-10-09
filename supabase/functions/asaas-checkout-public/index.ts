import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

// Checkout público (link de vendas, sem login). Preço e plano são constantes do servidor.
const ASAAS_URL = "https://api-sandbox.asaas.com/v3"; // SANDBOX
const PLAN_NAME = "Mentoria AUMAKUA TSA 2027";
const CARD_VALUE = 6499.99;
const PIX_VALUE = 6000.0;
const MAX_INSTALLMENTS = 3;
const SITE = "https://aumakua-app.lovable.app";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const Body = z.object({
  name: z.string().trim().min(3).max(120),
  email: z.string().trim().toLowerCase().email().max(255),
  cpf: z.string().regex(/^\d{11}$/),
  method: z.enum(["card", "pix"]),
});

function validCpf(cpf: string) {
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (len: number) => {
    let s = 0;
    for (let i = 0; i < len; i++) s += Number(cpf[i]) * (len + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}

async function asaas(path: string, init: RequestInit = {}) {
  const res = await fetch(`${ASAAS_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "User-Agent": "aumakua-app", access_token: Deno.env.get("ASAAS_API_KEY")!, ...(init.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.errors?.[0]?.description || `Asaas erro ${res.status}`);
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método inválido" }, 405);
  try {
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: "Preencha nome, e-mail e CPF corretamente" }, 400);
    const { name, email, cpf, method } = parsed.data;
    if (!validCpf(cpf)) return json({ error: "CPF inválido" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: rows } = await admin.from("assinaturas").select("*")
      .ilike("aluno_email", email).order("created_at", { ascending: false });
    const list = rows || [];
    if (list.some((r) => r.status === "ativo")) {
      return json({ error: "Este e-mail já tem acesso ativo. Basta criar a conta / entrar com ele." }, 409);
    }

    const value = method === "pix" ? PIX_VALUE : CARD_VALUE;

    let customerId: string | undefined = list.find((r) => r.asaas_customer_id)?.asaas_customer_id;
    if (!customerId) customerId = (await asaas(`/customers?cpfCnpj=${cpf}`))?.data?.[0]?.id;
    if (!customerId) {
      customerId = (await asaas("/customers", { method: "POST", body: JSON.stringify({ name, cpfCnpj: cpf, email }) })).id;
    }

    const { data: ins, error: insErr } = await admin.from("assinaturas").insert({
      user_id: null, aluno_nome: name, aluno_email: email, cpf, plano: PLAN_NAME,
      valor: value, status: "pendente", asaas_customer_id: customerId,
    }).select("id").single();
    if (insErr) throw insErr;

    const back = `${SITE}/#/tsa-mentoria`;
    const checkout = await asaas("/checkouts", {
      method: "POST",
      body: JSON.stringify({
        billingTypes: [method === "pix" ? "PIX" : "CREDIT_CARD"],
        chargeTypes: method === "pix" ? ["DETACHED"] : ["DETACHED", "INSTALLMENT"],
        ...(method === "card" ? { installment: { maxInstallmentCount: MAX_INSTALLMENTS } } : {}),
        minutesToExpire: 1440,
        customer: customerId,
        externalReference: ins.id,
        callback: { successUrl: `${back}?pago=1`, cancelUrl: back, expiredUrl: back },
        items: [{ name: PLAN_NAME, description: `${PLAN_NAME} — acesso por 12 meses`, quantity: 1, value }],
      }),
    });
    const paymentUrl: string = checkout.link || `https://sandbox.asaas.com/checkoutSession/show?id=${checkout.id}`;

    await admin.from("assinaturas").update({ asaas_subscription_id: checkout.id, payment_url: paymentUrl }).eq("id", ins.id);
    return json({ payment_url: paymentUrl });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
