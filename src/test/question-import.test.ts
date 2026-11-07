import { describe, expect, it } from "vitest";
import example from "./fixtures/catecolaminas.txt?raw";
import { normalizeImportLines, parseQuestionImport } from "@/lib/question-import";

describe("pasted question import", () => {
  it("separates the uploaded alternatives and identifies answer C", () => {
    const parsed = parseQuestionImport(example);
    expect(parsed.enunciado).toBe(example.split("\n")[0]);
    expect(parsed.A).toBe("A noradrenalina aumenta o retorno venoso sobretudo por ação β2 nas veias hepáticas, com efeito α pouco expressivo nesse território.");
    expect(parsed.B).toBe("A dopamina em doses baixas reduz o fluxo sanguíneo portal, efeito atenuado pelo propranolol e acentuado pela fenoxibenzamina.");
    expect(parsed.C).toBe("Agonistas β2 seletivos podem elevar o retorno venoso em cerca de um terço, por aumento do fluxo esplâncnico e queda da resistência venosa esplâncnica.");
    expect(parsed.D).toBe("Na hipovolemia grave, a estimulação α adicional amplia o retorno venoso por esvaziamento mais completo do reservatório esplâncnico.");
    expect(parsed.gabarito).toBe("C");
    expect(parsed.comentario).toBe(example.split("Gabarito: C")[1].trim());
  });

  it.each(["\n", "\r\n", "\r", "\u2028", "\u2029", "\u0085"])("handles separator %j and multiline alternatives", (separator) => {
    const parsed = parseQuestionImport(["Questão", "A) Alfa", "continuação", "B. Beta", "C- Gama", "D: Delta", "Resposta correta: letra B", "Comentário: explicação completa", "A) citado no comentário"].join(separator));
    expect(parsed).toEqual({ enunciado: "Questão", A: "Alfa\ncontinuação", B: "Beta", C: "Gama", D: "Delta", gabarito: "B", comentario: "explicação completa\nA) citado no comentário" });
  });

  it("does not invent an answer when the key is absent", () => {
    expect(parseQuestionImport("Questão\nA) Alfa\nB) Beta\nC) Gama\nD) Delta").gabarito).toBe("");
  });

  it("preserves explanation on the answer line", () => {
    expect(parseQuestionImport("Questão\nA) Alfa\nB) Beta\nC) Gama\nD) Delta\nGabarito: C — Comentário: explicação").comentario).toBe("explicação");
  });

  it("normalizes TEA block separators without flattening question or answer text", () => {
    expect(normalizeImportLines("Caso\u20281) Pergunta\u2028Gabarito: resposta\u20292) Outra pergunta\rGabarito: outra resposta")).toBe("Caso\n1) Pergunta\nGabarito: resposta\n2) Outra pergunta\nGabarito: outra resposta");
  });
});