import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SYSTEM_PROMPT = `Você é um extrator de provas de múltipla escolha em PDF.

FORMATO DO PDF:
- Cada questão começa com o número seguido de ")" — ex: "1)", "2)", "10)".
- O enunciado vem logo depois do número.
- Alternativas: "A)", "B)", "C)", "D)".
- Gabarito: "RESPOSTA: X".
- Justificativa: texto após "Justificativa:" com o comentário da questão.

Retorne SOMENTE JSON válido (sem markdown) no formato:
{
  "titulo": "nome da prova",
  "questoes": [
    { "numero": 1, "enunciado": "...", "alternativas": {"A":"...","B":"...","C":"...","D":"..."}, "gabarito": "A", "comentario": "..." }
  ]
}

REGRAS:
- Extraia TODAS as questões, em ordem.
- 4 alternativas (A-D). Se houver E, ignore.
- gabarito é uma única letra A/B/C/D.
- comentario = todo o texto após "Justificativa:" até a próxima questão. "" se não houver.
- Não invente questões.`;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk) as unknown as number[]);
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { storagePath, fileName } = await req.json();
    if (!storagePath) {
      return new Response(JSON.stringify({ error: "storagePath é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download PDF from storage using service role
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: fileBlob, error: dlErr } = await admin.storage.from("exam-pdfs").download(storagePath);
    if (dlErr || !fileBlob) {
      console.error("Storage download error:", dlErr);
      return new Response(JSON.stringify({ error: "Não foi possível baixar o PDF do storage" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const buf = new Uint8Array(await fileBlob.arrayBuffer());
    const pdfBase64 = bytesToBase64(buf);
    console.log(`PDF baixado: ${buf.length} bytes`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
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

    const rawText = await response.text();
    if (!response.ok) {
      console.error("AI gateway error:", response.status, rawText.slice(0, 500));
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos ao Lovable AI." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `IA retornou erro ${response.status}: ${rawText.slice(0, 200)}` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let data: any;
    try { data = JSON.parse(rawText); } catch {
      console.error("Resposta não-JSON da IA:", rawText.slice(0, 500));
      return new Response(JSON.stringify({ error: "Resposta inválida da IA" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const content = data.choices?.[0]?.message?.content || "{}";
    let parsed;
    try { parsed = JSON.parse(content); }
    catch {
      const match = content.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { titulo: "", questoes: [] };
    }

    // Cleanup PDF
    await admin.storage.from("exam-pdfs").remove([storagePath]).catch(() => {});

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("import-exam-pdf error:", err);
    return new Response(JSON.stringify({ error: err.message || "erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
