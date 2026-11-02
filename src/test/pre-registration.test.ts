import { expect, it } from "vitest";
import { recordPreRegistration } from "../../supabase/functions/_shared/record-pre-registration";
it("preserva dados e aceites sem presumir mentoria, valor ou liberar acesso", async () => {
  let saved: Record<string, unknown> = {};
  const tables: string[] = [];
  const admin = { from: (table: "checkout_pre_registrations") => {
    tables.push(table);
    return { insert: async (row: Record<string, unknown>) => { saved = row; return { error: null }; } };
  } };
  await recordPreRegistration(admin, new Request("https://example.invalid", { headers: { "x-real-ip": "192.0.2.1" } }), {
    name: "Comprador", email: "teste@example.invalid", cpf: "52998224725", phone: "11999999999", address: { city: "São Paulo" },
  });
  expect(tables).toEqual(["checkout_pre_registrations"]);
  expect(saved.buyer_name).toBe("Comprador");
  expect(saved.terms_version).toBe("2026-11-02-v3");
  expect(saved.privacy_version).toBe("2026-11-02-v3");
  expect(saved).not.toHaveProperty("plan");
  expect(saved).not.toHaveProperty("valor");
  expect(saved).not.toHaveProperty("status");
});