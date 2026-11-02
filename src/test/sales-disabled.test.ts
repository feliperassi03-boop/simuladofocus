import { describe, expect, it } from "vitest";
import { SALES_ENABLED, salesUnavailableResponse } from "../../supabase/functions/_shared/sales-status";

describe("Vendas desativadas", () => {
  it("desativa novas compras no Pix", async () => {
    expect(SALES_ENABLED).toBe(false);
    const response = salesUnavailableResponse({});
    expect(response?.status).toBe(403);
    expect(await response?.json()).toMatchObject({ code: "SALES_DISABLED" });
  });
  it("desativa novas compras no cartão", async () => {
    const response = salesUnavailableResponse({});
    expect(response?.status).toBe(403);
    expect(await response?.json()).toMatchObject({ code: "SALES_DISABLED" });
  });
});