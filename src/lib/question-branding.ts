export const TSA_2026_EXAM_ID = "ef94bcd5-7f7d-4348-a251-7be464488132";

export function shouldShowQuestionEagle(
  examTitle?: string | null,
  examId?: string | null,
): boolean {
  if (examId === TSA_2026_EXAM_ID) return true;
  return !(examTitle ?? "").toUpperCase().includes("TSA");
}
