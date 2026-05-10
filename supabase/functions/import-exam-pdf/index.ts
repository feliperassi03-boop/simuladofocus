import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const SYSTEM_PROMPT = `Você é um extrator de provas de múltipla escolha em PDF.

FORMATO DO PDF:
- Cada questão começa com o número seguido de ")" — ex: "1)", "2)", "10)".
- O enunciado vem logo depois do número, na mesma linha ou nas seguintes.
- As alternativas são marcadas como "A)", "B)", "C)", "D)".
- O gabarito aparece como "RESPOSTA: X" (X = A, B, C ou D).
- Após "RESPOSTA:" pode haver "Justificativa:" com o comentário explicativo da questão.

Retorne SOMENTE JSON válido (sem markdown, sem texto extra) no formato:
{
  "titulo": "nome da prova (use o título do documento ou um nome curto descritivo)",
  "questoes": [
    {
      "numero": 1,
      "enunciado": "texto completo da questão (sem o número inicial)",
      "alternativas": { "A": "texto", "B": "texto", "C": "texto", "D": "texto" },
      "gabarito": "A",
      "comentario": "texto da justificativa, se houver"
    }
  ]
}

REGRAS:
- Extraia TODAS as questões do PDF, em ordem.
- Sempre 4 alternativas (A, B, C, D). Se houver 5, ignore a E.
- "gabarito" é uma única letra A, B, C ou D, pegue de "RESPOSTA: X".
- "comentario" deve conter todo o texto após "Justificativa:" até o início da próxima questão. String vazia se não houver.
- Preserve acentuação e quebras de parágrafo importantes.
- Não invente questões nem alternativas.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { pdfBase64, fileName } = await req.json();
    if (!pdfBase64) {
      return new Response(JSON.stringify({ error: "pdfBase64 é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: `Extraia a prova do arquivo ${fileName || "PDF"} no formato JSON especificado.` },
              { type: "file", file: { filename: fileName || "prova.pdf", file_data: `data:application/pdf;base64,${pdfBase64}` } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos no Lovable AI." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { titulo: "", questoes: [] };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("import-exam-pdf error:", err);
    return new Response(JSON.stringify({ error: err.message || "erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
