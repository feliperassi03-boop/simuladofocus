import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { isCurrentConsent } from "../_shared/checkout-consent.ts";
import { recordCheckoutConsent } from "../_shared/record-checkout-consent.ts";
import { PUBLIC_PLAN_KEYS } from "../_shared/public-plans.ts";
import { INFINITEPAY_PLANS, recordInfinitepayOrder } from "../_shared/infinitepay-checkout.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});
const Body = z.object({
  name: z.string().trim().min(3).max(120),
  email: z.string().trim().toLowerCase().email().max(255),
  cpf: z.string().regex(/^\d{11}$/),
  phone: z.string().regex(/^\d{10,11}$/),
  address: z.object({
    postalCode: z.string().regex(/^\d{8}$/), street: z.string().trim().min(1).max(120),
    number: z.string().trim().min(1).max(20), district: z.string().trim().min(1).max(80),
    city: z.string().trim().min(1).max(80), uf: z.string().trim().regex(/^[A-Za-z]{2}$/),
  }),
  method: z.enum(["card", "pix"]), plan: z.enum(PUBLIC_PLAN_KEYS),
  consent: z.unknown().refine(isCurrentConsent, "Aceite os dois documentos na versão atual"),
});
function validCpf(cpf: string) {
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}

// Public pre-payment registration: no session exists yet and no entitlement is granted here.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método inválido" }, 405);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Confira os dados e aceite os dois documentos antes de prosseguir." }, 400);
  if (!validCpf(parsed.data.cpf)) return json({ error: "CPF inválido" }, 400);
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return json({ error: "Pagamento temporariamente indisponível." }, 503);
  try {
    const admin = createClient(url, key);
    const buyer = parsed.data;
    const { data: active, error } = await admin.from("assinaturas").select("id")
      .ilike("aluno_email", buyer.email).eq("status", "ativo").limit(1);
    if (error) throw new Error("Não foi possível conferir seu cadastro. Tente novamente.");
    if (active?.length) return json({ error: "Este e-mail já tem acesso ativo. Entre com ele na plataforma." }, 409);
    await recordCheckoutConsent(admin, req, {
      name: buyer.name, email: buyer.email, plan: buyer.plan,
      method: buyer.method, value: INFINITEPAY_PLANS[buyer.plan][buyer.method],
    });
    return json(await recordInfinitepayOrder(admin, buyer));
  } catch (e) {
    console.error("InfinitePay registration failed", e instanceof Error ? e.message : "unknown error");
    return json({ error: e instanceof Error ? e.message : "Não foi possível preparar o pagamento." }, 500);
  }
});