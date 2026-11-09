export type SecondPhaseType = "tea" | "tsa2";

export function isSecondPhase(examType: string | null | undefined): examType is SecondPhaseType {
  return examType === "tea" || examType === "tsa2";
}

export function secondPhaseLabel(examType: SecondPhaseType) {
  return examType === "tsa2" ? "TSA" : "TEA";
}

export function examPath(examType: string | null | undefined, id: string) {
  if (examType === "tsa2") return `/prova-tsa2/${id}`;
  if (examType === "tea") return `/prova-tea/${id}`;
  return `/prova/${id}`;
}

export function matchesExamView(examType: string | null | undefined, view: "standard" | SecondPhaseType) {
  return view === "standard" ? !isSecondPhase(examType) : examType === view;
}