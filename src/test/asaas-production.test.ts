import { describe, expect, it } from "vitest";
import publicCheckout from "../../supabase/functions/asaas-checkout-public/index.ts?raw";
import subscribe from "../../supabase/functions/asaas-subscribe/index.ts?raw";

describe.each([
  ["checkout público", publicCheckout],
  ["planos", subscribe],
])("Asaas de produção: %s", (_name, source) => {
  it("usa a API de produção solicitada", () => {
    const baseUrl = source.match(/const ASAAS_URL = "([^"]+)"/)?.[1];
    expect(baseUrl).toBe("https://api.asaas.com/v3");
  });

  it("não direciona pagamentos para o sandbox", () => {
    expect(source).not.toContain("sandbox.asaas.com");
    expect(source).toContain("https://www.asaas.com/checkoutSession/show?id=");
  });
});