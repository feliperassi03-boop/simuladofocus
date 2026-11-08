import { describe, expect, it } from "vitest";
import { shouldShowQuestionEagle, TSA_2026_EXAM_ID } from "@/lib/question-branding";

describe("exibição da águia nas questões", () => {
  it("mantém a águia na prova TSA 2026", () => {
    expect(shouldShowQuestionEagle("TSA 2026", TSA_2026_EXAM_ID)).toBe(true);
  });

  it("não mostra a águia nas demais provas com TSA no nome", () => {
    expect(shouldShowQuestionEagle("TSA 2027", "outra-prova")).toBe(false);
    expect(shouldShowQuestionEagle("Simulado TSA Cardiologia", "outra-prova")).toBe(false);
  });

  it("mostra a águia nas demais provas", () => {
    expect(shouldShowQuestionEagle("TEA 2 Fase", "prova-tea")).toBe(true);
    expect(shouldShowQuestionEagle("Cardiologia 1", "prova-cardio")).toBe(true);
  });
});
