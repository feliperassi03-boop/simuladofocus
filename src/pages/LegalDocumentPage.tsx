import { DOCUMENT_VERSIONS } from "../../supabase/functions/_shared/checkout-consent";
import { CONTRATO, PRIVACIDADE, TERMOS, type LegalBlock, type LegalDocument } from "@/content/legalDocuments";

const DOCS: Record<string, { doc: LegalDocument; version: string }> = {
  termos: { doc: TERMOS, version: DOCUMENT_VERSIONS.termos },
  privacidade: { doc: PRIVACIDADE, version: DOCUMENT_VERSIONS.privacidade },
  contrato: { doc: CONTRATO, version: DOCUMENT_VERSIONS.termos },
};

function Block({ block }: { block: LegalBlock }) {
  switch (block.type) {
    case "h2":
      return <h2 className="font-display text-lg font-semibold pt-4 break-words">{block.text}</h2>;
    case "p":
      return <p className="text-sm leading-relaxed break-words">{block.text}</p>;
    case "ul":
      return (
        <ul className="list-disc pl-5 space-y-1 text-sm leading-relaxed">
          {block.items.map((item, i) => <li key={i} className="break-words">{item}</li>)}
        </ul>
      );
    case "ol":
      return (
        <ol className="list-decimal pl-5 space-y-1 text-sm leading-relaxed">
          {block.items.map((item, i) => <li key={i} className="break-words">{item}</li>)}
        </ol>
      );
    case "table":
      return (
        <div className="overflow-x-auto -mx-2 px-2">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                {block.head.map((h) => (
                  <th key={h} className="border border-border bg-muted px-2 py-1.5 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j} className="border border-border px-2 py-1.5 align-top break-words">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

export default function LegalDocumentPage({ document: docKey }: { document: "termos" | "privacidade" | "contrato" }) {
  const { doc, version } = DOCS[docKey];
  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-12">
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="font-display text-2xl font-bold break-words">{doc.title}</h1>
        {doc.intro?.map((p, i) => <p key={i} className="text-sm leading-relaxed break-words">{p}</p>)}
        {doc.blocks.map((block, i) => <Block key={i} block={block} />)}
        {doc.footer && (
          <div className="pt-6 space-y-1 text-sm">
            {doc.footer.map((line, i) => <p key={i} className="break-words">{line}</p>)}
          </div>
        )}
        <p className="text-xs text-muted-foreground pt-4">Versão: {version}</p>
      </div>
    </main>
  );
}
