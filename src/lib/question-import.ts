export function normalizeImportLines(text: string) {
  return text.replace(/\r\n?|[\u2028\u2029\u0085\u000b\u000c]/g, "\n").trim();
}

export interface ParsedQuestion {
  enunciado: string;
  A: string;
  B: string;
  C: string;
  D: string;
  gabarito: string;
  comentario: string;
}

export function parseQuestionImport(text: string): ParsedQuestion {
  const lines = normalizeImportLines(text).split("\n");
  const altLineRe = /^\s*([A-Da-d])\s*[\)\.\-:]\s*(.*)$/;
  const answerLineRe = /^\s*(?:resposta(?:\s+correta)?|gabarito)\s*[:\-–—]?\s*(?:letra\s+)?([A-Da-d])\b[\s.)\-–—]*(.*)$/i;
  const commentLineRe = /^\s*(?:coment[áa]rio(?:\s+da\s+quest[ãa]o)?|comment)\s*[:\-–—]?\s*/i;
  let block: "enunciado" | "alt" | "comentario" = "enunciado";
  let currentAlt = "";
  const enunciado: string[] = [];
  const alts: Record<string, string[]> = { A: [], B: [], C: [], D: [] };
  const comentario: string[] = [];
  let gabarito = "";

  for (const line of lines) {
    const answer = block !== "comentario" ? line.match(answerLineRe) : null;
    if (answer) {
      gabarito = answer[1].toUpperCase();
      block = "comentario";
      if (answer[2]) comentario.push(answer[2].replace(commentLineRe, ""));
      continue;
    }
    if (commentLineRe.test(line)) {
      block = "comentario";
      comentario.push(line.replace(commentLineRe, ""));
      continue;
    }
    const alt = block !== "comentario" ? line.match(altLineRe) : null;
    if (alt) {
      currentAlt = alt[1].toUpperCase();
      block = "alt";
      if (alt[2]) alts[currentAlt].push(alt[2]);
      continue;
    }
    if (block === "enunciado") enunciado.push(line);
    else if (block === "alt" && currentAlt) alts[currentAlt].push(line);
    else if (block === "comentario") comentario.push(line);
  }

  return {
    enunciado: enunciado.join("\n").trim(),
    A: alts.A.join("\n").trim(),
    B: alts.B.join("\n").trim(),
    C: alts.C.join("\n").trim(),
    D: alts.D.join("\n").trim(),
    gabarito,
    comentario: comentario.join("\n").trim(),
  };
}