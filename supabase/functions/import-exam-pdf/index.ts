import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const PROMPT = `Extraia todas as questões deste PDF de prova médica e retorne APENAS um JSON válido, sem texto adicional, neste formato exato:
{
  "titulo": "nome da prova",
  "questoes": [
    {
      "numero": 1,
      "enunciado": "texto completo do enunciado da questão",
      "alternativas": {
        "A": "texto da alternativa A",
        "B": "texto da alternativa B",
        "C": "texto da alternativa C",
        "D": "texto da alternativa D"
      },
      "gabarito": "A",
      "comentario": "texto completo da justificativa/explicação da resposta correta conforme consta no PDF"
    }
  ]
}

Regras:
- Enunciado: texto completo sem cortar, juntando linhas que cruzem páginas
- Alternativas: exatamente 4 (A, B, C, D), como estão no PDF. Se houver E), ignore.
- gabarito: apenas a letra (ex: "A")
- comentario: copie a justificativa completa do PDF, sem incluir referências bibliográficas (pare antes de "Bibliografia:")
- Ignore cabeçalhos/rodapés repetidos das páginas (ex: "PROVA (A) MARFIM", "A SBA preocupada com o meio ambiente", números de página)
- Ignore imagens, gráficos e figuras (apenas texto). Se o enunciado mencionar uma figura, adicione " [Esta questão contém uma imagem no PDF original]" ao final do enunciado.
- Extraia TODAS as questões em ordem numérica, sem pular nenhuma
- Retorne SOMENTE o JSON, sem nenhum texto antes ou depois, sem markdown`;

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
    console.log(`PDF baixado: ${buf.length} bytes — chamando Anthropic`);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 16000,
        messages: [{
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
            },
            { type: "text", text: PROMPT },
          ],
        }],
      }),
    });

    const rawText = await response.text();
    if (!response.ok) {
      console.error("Anthropic error:", response.status, rawText.slice(0, 800));
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições da Anthropic atingido. Tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 401 || response.status === 403) {
        return new Response(JSON.stringify({ error: "Chave da Anthropic inválida ou sem permissão." }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `Anthropic retornou erro ${response.status}: ${rawText.slice(0, 300)}` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let data: any;
    try { data = JSON.parse(rawText); } catch {
      console.error("Resposta não-JSON da Anthropic:", rawText.slice(0, 500));
      return new Response(JSON.stringify({ error: "Resposta inválida da Anthropic" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const texto: string = data?.content?.[0]?.text ?? "";
    let parsed: any;
    try { parsed = JSON.parse(texto); }
    catch {
      const match = texto.match(/\{[\s\S]*\}/);
      if (!match) {
        console.error("Texto sem JSON:", texto.slice(0, 500));
        return new Response(JSON.stringify({ error: "Não foi possível extrair JSON da resposta" }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      parsed = JSON.parse(match[0]);
    }

    // Normalize keys (accept alternativa_correta / gabarito_comentado as fallback)
    if (Array.isArray(parsed?.questoes)) {
      parsed.questoes = parsed.questoes.map((q: any) => ({
        numero: q.numero,
        enunciado: q.enunciado,
        alternativas: q.alternativas,
        gabarito: q.gabarito ?? q.alternativa_correta,
        comentario: q.comentario ?? q.gabarito_comentado ?? "",
      }));
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
