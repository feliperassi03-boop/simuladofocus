import { DOCUMENT_VERSIONS } from "./checkout-consent.ts";

type Buyer = { name: string; email: string; cpf: string; phone: string; address: Record<string, string> };
type Writer = { from(table: "checkout_pre_registrations"): { insert(row: Record<string, unknown>): PromiseLike<{ error: unknown }> } };
export async function recordPreRegistration(admin: Writer, req: Request, buyer: Buyer) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",").map(v => v.trim()).filter(Boolean);
  const ip = forwarded?.at(-1) || req.headers.get("x-real-ip");
  if (!ip) throw new Error("Não foi possível registrar o endereço de rede. Tente novamente.");
  const { error } = await admin.from("checkout_pre_registrations").insert({
    buyer_name: buyer.name, buyer_email: buyer.email, cpf: buyer.cpf, phone: buyer.phone,
    address: buyer.address, terms_version: DOCUMENT_VERSIONS.termos,
    privacy_version: DOCUMENT_VERSIONS.privacidade, accepted_at: new Date().toISOString(),
    ip_address: ip, ip_source: forwarded?.length ? "x-forwarded-for:last" : "x-real-ip",
  });
  if (error) throw new Error("Não foi possível salvar seus dados e aceites. Tente novamente.");
}