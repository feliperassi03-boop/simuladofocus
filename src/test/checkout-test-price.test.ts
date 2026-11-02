import { describe, expect, it } from "vitest";
import checkout from "../../supabase/functions/asaas-checkout-public/index.ts?raw";
import webhook from "../../supabase/functions/asaas-webhook/index.ts?raw";

describe("Compra temporária de teste", () => {
  it("cobra exatamente R$ 10,00 no cartão", () => {
    const value = checkout.match(/teste:\s*\{[^}]*card:\s*([\d.]+)/)?.[1];
    expect(Number(value)).toBe(10);
  });
  it("recusa Pix e limita o teste ao link temporário", () => {
    expect(checkout).toContain('isTest && (method !== "card"');
    expect(checkout).toContain('2026-11-03T15:32:00Z');
  });
  it("não libera mentoria pelo pagamento de teste", () => {
    const branch = webhook.slice(webhook.indexOf('if (row.plano === "Teste de pagamento AUMAKUA")'), webhook.indexOf('if (PAID.has(evt.event))'));
    expect(branch).toContain('"pago_teste"');
    expect(branch).toContain('return error ?');
    expect(branch).not.toContain('allowed_emails');
  });
});