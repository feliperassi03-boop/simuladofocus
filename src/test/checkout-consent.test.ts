import { describe, expect, it } from "vitest";
import { canProceedToPayment, DOCUMENT_VERSIONS, INITIAL_CONSENT, isCurrentConsent } from "../../supabase/functions/_shared/checkout-consent";
import { recordCheckoutConsent } from "../../supabase/functions/_shared/record-checkout-consent";

describe("Aceite antes do pagamento", () => {
  it("inicia com ambas as caixas desmarcadas", () => {
    expect(INITIAL_CONSENT).toEqual({ terms: false, privacy: false });
  });
  it("permite prosseguir somente com os dois aceites", () => {
    expect(canProceedToPayment(false, false)).toBe(false);
    expect(canProceedToPayment(true, false)).toBe(false);
    expect(canProceedToPayment(false, true)).toBe(false);
    expect(canProceedToPayment(true, true)).toBe(true);
  });
  it("rejeita versões antigas ou aceite ausente no servidor", () => {
    const consent = { terms: true, privacy: true, termsVersion: DOCUMENT_VERSIONS.termos, privacyVersion: DOCUMENT_VERSIONS.privacidade };
    expect(isCurrentConsent(consent)).toBe(true);
    expect(isCurrentConsent({ ...consent, termsVersion: "antiga" })).toBe(false);
    expect(isCurrentConsent({ ...consent, privacyVersion: "antiga" })).toBe(false);
    expect(isCurrentConsent({ ...consent, privacy: false })).toBe(false);
    expect(isCurrentConsent(undefined)).toBe(false);
  });
  it("registra dois aceites com identidade, horário, versões e IP do pedido", async () => {
    let records: Record<string, unknown>[] = [];
    const admin = { from: () => ({ insert: async (rows: Record<string, unknown>[]) => { records = rows; return { error: null }; } }) };
    const before = Date.now();
    await recordCheckoutConsent(admin as unknown as Parameters<typeof recordCheckoutConsent>[0],
      new Request("https://example.invalid", { headers: { "x-forwarded-for": "192.0.2.1" } }),
      { name: "Comprador Teste", email: "teste@example.invalid", plan: "tea", method: "pix", value: 4769.1 });
    expect(records).toHaveLength(2);
    expect(records.map((r) => r.document_type)).toEqual(["termos", "privacidade"]);
    for (const row of records) {
      expect(row.buyer_name).toBe("Comprador Teste");
      expect(row.buyer_email).toBe("teste@example.invalid");
      expect(row.ip_address).toBe("192.0.2.1");
      expect(row.document_version).toBe("2026-10-25-provisorio-v1");
      expect(new Date(String(row.accepted_at)).getTime()).toBeGreaterThanOrEqual(before);
    }
  });
  it("não permite pagamento se o registro falhar", async () => {
    const admin = { from: () => ({ insert: async () => ({ error: { message: "indisponível" } }) }) };
    await expect(recordCheckoutConsent(admin as unknown as Parameters<typeof recordCheckoutConsent>[0],
      new Request("https://example.invalid", { headers: { "x-forwarded-for": "192.0.2.1" } }),
      { userId: "test-user", name: "Comprador Teste", email: "teste@example.invalid", plan: "tsa", method: "card", value: 6499.99 }))
      .rejects.toThrow("Não foi possível salvar o aceite");
  });
});