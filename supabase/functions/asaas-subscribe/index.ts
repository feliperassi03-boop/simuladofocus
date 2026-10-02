import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const ASAAS_URL = "https://api-sandbox.asaas.com/v3"; // SANDBOX
const PLAN_NAME = "Mentoria AUMAKUA TSA 2027";
const PLAN_VALUE = 6299.99;
const ADMIN_ONLY = true; // fase de testes: só administradores podem assinar

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const Body = z.object({
  name: z.string().trim().min(3).max(120).optional(),
  cpf: z.string().regex(/^\d{11}$/).optional(),
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
  try {
    if (!Deno.env.get("ASAAS_API_KEY")) return json({ error: "Chave do Asaas não configurada" }, 500);

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return json({ error: "Não autenticado" }, 401);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (ADMIN_ONLY) {
      const { data: isAdm } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!isAdm) return json({ error: "Assinaturas ainda não estão disponíveis" }, 403);
    }

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: "Dados inválidos", details: parsed.error.flatten().fieldErrors }, 400);

    const { data: existing } = await admin
      .from("assinaturas").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    const rows = existing || [];

    const active = rows.find((r) => r.status === "ativo");
    if (active) return json({ error: "Você já possui uma assinatura ativa" }, 409);
    const pending = rows.find((r) => r.status === "pendente" && r.payment_url);
    if (pending) return json({ payment_url: pending.payment_url });

    const cpf = parsed.data.cpf || rows.find((r) => r.cpf)?.cpf;
    if (!cpf) return json({ need_cpf: true }, 200);
    if (!validCpf(cpf)) return json({ error: "CPF inválido" }, 400);

    const name = parsed.data.name || user.user_metadata?.full_name || user.email!.split("@")[0];
    const email = user.email!;

    // 1) Cliente: reutiliza se já existir
    let customerId: string | undefined = rows.find((r) => r.asaas_customer_id)?.asaas_customer_id;
    if (!customerId) {
      const found = await asaas(`/customers?cpfCnpj=${cpf}`);
      customerId = found?.data?.[0]?.id;
    }
    if (!customerId) {
      const created = await asaas("/customers", {
        method: "POST",
        body: JSON.stringify({ name, cpfCnpj: cpf, email, externalReference: user.id }),
      });
      customerId = created.id;
    }

    // 2) Assinatura anual (cliente escolhe Pix ou cartão na página do Asaas)
    const today = new Date().toISOString().slice(0, 10);
    const sub = await asaas("/subscriptions", {
      method: "POST",
      body: JSON.stringify({
        customer: customerId,
        billingType: "UNDEFINED",
        value: PLAN_VALUE,
        nextDueDate: today,
        cycle: "YEARLY",
        description: PLAN_NAME,
        externalReference: user.id,
      }),
    });

    const payments = await asaas(`/subscriptions/${sub.id}/payments`);
    const paymentUrl: string | null = payments?.data?.[0]?.invoiceUrl ?? null;

    // 3) Salva como pendente
    const { error: insErr } = await admin.from("assinaturas").insert({
      user_id: user.id,
      aluno_nome: name,
      aluno_email: email,
      cpf,
      plano: PLAN_NAME,
      valor: PLAN_VALUE,
      status: "pendente",
      asaas_customer_id: customerId,
      asaas_subscription_id: sub.id,
      payment_url: paymentUrl,
    });
    if (insErr) throw insErr;

    // 4) Link de pagamento
    return json({ payment_url: paymentUrl });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
