import { createClient } from "npm:@supabase/supabase-js@2";

// Webhook do Asaas: libera 12 meses de acesso quando o pagamento é confirmado.
const ok = (body: unknown = { received: true }, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const PAID = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED", "CHECKOUT_PAID"]);
const REFUND = new Set(["PAYMENT_REFUNDED", "PAYMENT_CHARGEBACK_REQUESTED", "PAYMENT_CHARGEBACK_DISPUTE"]);

Deno.serve(async (req) => {
  if (req.method !== "POST") return ok({ error: "method" }, 405);
  const expected = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
  if (!expected || req.headers.get("asaas-access-token") !== expected) return ok({ error: "unauthorized" }, 401);

  const evt = await req.json().catch(() => null);
  if (!evt?.event) return ok({ error: "invalid" }, 400);
  if (!PAID.has(evt.event) && !REFUND.has(evt.event)) return ok();

  const p = evt.payment || {};
  const c = evt.checkout || {};
  const refs = [p.externalReference, c.externalReference].filter(Boolean) as string[];
  const checkoutIds = [p.checkoutSession, c.id].filter(Boolean) as string[];

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let row: any = null;
  const uuid = /^[0-9a-f-]{36}$/i;
  for (const r of refs.filter((x) => uuid.test(x))) {
    const { data } = await admin.from("assinaturas").select("*").eq("id", r).maybeSingle();
    if (data) { row = data; break; }
  }
  if (!row && checkoutIds.length) {
    const { data } = await admin.from("assinaturas").select("*").in("asaas_subscription_id", checkoutIds).limit(1).maybeSingle();
    row = data;
  }
  if (!row) { console.log("assinatura não encontrada", evt.event, refs, checkoutIds); return ok(); }

  if (PAID.has(evt.event)) {
    if (row.status === "ativo") return ok(); // parcelas seguintes não renovam
    const exp = new Date();
    exp.setFullYear(exp.getFullYear() + 1);
    await admin.from("assinaturas").update({ status: "ativo", data_expiracao: exp.toISOString().slice(0, 10) }).eq("id", row.id);
  } else {
    await admin.from("assinaturas").update({ status: "estornado" }).eq("id", row.id);
  }
  return ok();
});
