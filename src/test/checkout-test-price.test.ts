import { describe, expect, it } from "vitest";
import { z } from "zod";
import { PUBLIC_PLAN_KEYS } from "../../supabase/functions/_shared/public-plans";
import webhook from "../../supabase/functions/asaas-webhook/index.ts?raw";

describe("Remoção da compra temporária de teste", () => {
  it("recusa o plano de teste de R$ 10,00 e aceita somente os planos oficiais", () => {
    const plan = z.enum(PUBLIC_PLAN_KEYS);
    expect(plan.safeParse("teste").success).toBe(false);
    expect(PUBLIC_PLAN_KEYS).toEqual(["tsa", "tea"]);
    expect(plan.safeParse("tsa").success).toBe(true);
    expect(plan.safeParse("tea").success).toBe(true);
  });
  it("não libera mentoria pelo pagamento de teste", () => {
    const branch = webhook.slice(webhook.indexOf('if (row.plano === "Teste de pagamento AUMAKUA")'), webhook.indexOf('if (PAID.has(evt.event))'));
    expect(branch).toContain('"pago_teste"');
    expect(branch).toContain('return error ?');
    expect(branch).not.toContain('allowed_emails');
  });
});