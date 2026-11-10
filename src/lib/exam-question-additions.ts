export function planQuestionAdditions(
  existing: { questionId: string; order: number }[],
  selectedIds: string[],
) {
  const seen = new Set(existing.map((row) => row.questionId));
  let order = existing.reduce((max, row) => Math.max(max, row.order), -1) + 1;
  return selectedIds.flatMap((questionId) => {
    if (seen.has(questionId)) return [];
    seen.add(questionId);
    return [{ questionId, order: order++ }];
  });
}

export function matchesQuestionSearch(text: string, search: string) {
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  const normalized = normalize(text);
  return normalize(search).trim().split(/\s+/).every((word) => normalized.includes(word));
}