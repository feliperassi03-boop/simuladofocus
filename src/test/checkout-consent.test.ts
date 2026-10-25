import { describe, expect, it } from "vitest";
import { canProceedToPayment, DOCUMENT_VERSIONS, INITIAL_CONSENT, isCurrentConsent } from "../../supabase/functions/_shared/checkout-consent";

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
});