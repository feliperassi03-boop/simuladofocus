import { DOCUMENT_VERSIONS } from "../../supabase/functions/_shared/checkout-consent";
import { CONTRATO, PRIVACIDADE, TERMOS, type LegalBlock, type LegalDoc } from "../content/legalDocuments";

const DOCS: Record<string, { doc: LegalDoc; version: string }> = {
  termos: { doc: TERMOS, version: DOCUMENT_VERSIONS.termos },
  privacidade: { doc: PRIVACIDADE, version: DOCUMENT_VERSIONS.privacidade },
  contrato: { doc: CONTRATO, version: DOCUMENT_VERSIONS.termos },
};

function Block({ block }: { block: LegalBlock }) {
  switch (block.type) {
    case "h2":
      return <h2 className="font-display text-lg font-bold pt-4">{block.text}</h2>;
    case "p":
      return <p className="leading-relaxed">{block.text}</p>;
    case "ul":
      return <ul className="list-disc pl-6 space-y-1">{block.items.map((item, i) => <li key={i} className="leading-relaxed break-words">{item}</li>)}</ul>;
    case "ol":
      return <ol className="list-decimal pl-6 space-y-1">{block.items.map((item, i) => <li key={i} className="leading-relaxed break-words">{item}</li>)}</ol>;
    case "table":
      return <div className="overflow-x-auto"><table className="w-full text-sm border-collapse [&_td]:border [&_td]:border-border [&_td]:p-2 [&_td]:align-top [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:p-2 [&_th]:text-left [&_th]:align-top">
        <thead><tr>{block.headers.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
        <tbody>{block.rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j} className="break-words">{cell}</td>)}</tr>)}</tbody>
      </table></div>;
  }
}

export default function LegalDocumentPage({ document }: { document: "termos" | "privacidade" | "contrato" }) {
  const entry = DOCS[document];
  return <main className="min-h-screen bg-background text-foreground px-6 py-12">
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="font-display text-2xl font-bold">{entry.doc.title}</h1>
      {entry.doc.blocks.map((block, i) => <Block key={i} block={block} />)}
      <p className="text-xs text-muted-foreground">Versão: {entry.version}</p>
    </div>
  </main>;
}
