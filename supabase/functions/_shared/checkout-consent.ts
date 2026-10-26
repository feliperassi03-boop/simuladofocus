export const DOCUMENT_VERSIONS = {
  termos: "2026-10-26-v2",
  privacidade: "2026-10-26-v2",
} as const;

export const INITIAL_CONSENT = { terms: false, privacy: false };

export function canProceedToPayment(terms: boolean, privacy: boolean) {
  return terms === true && privacy === true;
}

export function isCurrentConsent(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const consent = value as Record<string, unknown>;
  return canProceedToPayment(consent.terms === true, consent.privacy === true) &&
    consent.termsVersion === DOCUMENT_VERSIONS.termos &&
    consent.privacyVersion === DOCUMENT_VERSIONS.privacidade;
}