import { DOCUMENT_VERSIONS } from "./checkout-consent.ts";

type Acceptance = {
  acceptance_group_id: string; user_id: string | null; buyer_name: string; buyer_email: string;
  document_type: "termos" | "privacidade"; document_version: string; accepted_at: string;
  ip_address: string; ip_source: string; plan_key: string; payment_method: string;
  order_value: number; applied_coupon: null;
};
type AcceptanceWriter = {
  from(table: "checkout_document_acceptances"): {
    insert(rows: Acceptance[]): PromiseLike<{ error: unknown }>;
  };
};

export async function recordCheckoutConsent(
  admin: AcceptanceWriter, req: Request,
  buyer: { userId?: string; name: string; email: string; plan: string; method: string; value: number },
) {
  // Read proxy metadata only, never a buyer-supplied body field. Preserve provenance.
  const forwarded = req.headers.get("x-forwarded-for")?.split(",").map((ip) => ip.trim()).filter(Boolean);
  const ip = forwarded?.at(-1) || req.headers.get("x-real-ip");
  if (!ip) throw new Error("Não foi possível registrar o endereço de rede. Tente novamente.");
  const groupId = crypto.randomUUID();
  const acceptedAt = new Date().toISOString();
  const { error } = await admin.from("checkout_document_acceptances").insert(
    (["termos", "privacidade"] as const).map((document) => ({
      acceptance_group_id: groupId, user_id: buyer.userId ?? null,
      buyer_name: buyer.name, buyer_email: buyer.email,
      document_type: document, document_version: DOCUMENT_VERSIONS[document],
      accepted_at: acceptedAt, ip_address: ip,
      ip_source: forwarded?.length ? "x-forwarded-for:last" : "x-real-ip",
      plan_key: buyer.plan, payment_method: buyer.method, order_value: buyer.value,
      applied_coupon: null,
    })),
  );
  if (error) throw new Error("Não foi possível salvar o aceite dos documentos. Tente novamente.");
}