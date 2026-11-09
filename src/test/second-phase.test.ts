import { describe, expect, it } from "vitest";
import { examPath, isSecondPhase, matchesExamView } from "@/lib/second-phase";

describe("second-phase exam separation", () => {
  it("uses the TEA model for TSA second phase", () => {
    expect(isSecondPhase("tsa2")).toBe(true);
    expect(isSecondPhase("tea")).toBe(true);
    expect(isSecondPhase("standard")).toBe(false);
  });
  it("keeps TSA second phase separate from TEA and TSA first phase", () => {
    expect(matchesExamView("tsa2", "tsa2")).toBe(true);
    expect(matchesExamView("tsa2", "tea")).toBe(false);
    expect(matchesExamView("tsa2", "standard")).toBe(false);
    expect(matchesExamView("tea", "tsa2")).toBe(false);
    expect(matchesExamView("standard", "standard")).toBe(true);
  });
  it("opens each exam with its matching question model", () => {
    expect(examPath("tsa2", "123")).toBe("/prova-tsa2/123");
    expect(examPath("tea", "123")).toBe("/prova-tea/123");
    expect(examPath("standard", "123")).toBe("/prova/123");
  });
});