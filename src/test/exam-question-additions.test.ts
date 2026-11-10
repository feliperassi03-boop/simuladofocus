import { describe, expect, it } from "vitest";
import { matchesQuestionSearch, planQuestionAdditions } from "@/lib/exam-question-additions";

describe("bulk additions to existing exams", () => {
  it("appends after the highest order without replacing existing questions", () => {
    const existing = [{ questionId: "original", order: 0 }, { questionId: "last", order: 8 }];
    expect(planQuestionAdditions(existing, ["new1", "new2"])).toEqual([
      { questionId: "new1", order: 9 }, { questionId: "new2", order: 10 },
    ]);
    expect(existing).toEqual([{ questionId: "original", order: 0 }, { questionId: "last", order: 8 }]);
  });
  it("skips existing questions and duplicate selections", () => {
    expect(planQuestionAdditions([{ questionId: "a", order: 2 }], ["a", "b", "b"])).toEqual([{ questionId: "b", order: 3 }]);
  });
  it("starts an empty exam at zero", () => {
    expect(planQuestionAdditions([], ["a"])).toEqual([{ questionId: "a", order: 0 }]);
  });
  it("searches words regardless of accents or order", () => {
    expect(matchesQuestionSearch("Anestesia em cardiopatia congênita", "CONGENITA anestesia")).toBe(true);
    expect(matchesQuestionSearch("Anestesia em cardiopatia congênita", "anestesia renal")).toBe(false);
  });
});