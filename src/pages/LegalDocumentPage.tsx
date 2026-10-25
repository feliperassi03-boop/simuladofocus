import { DOCUMENT_VERSIONS } from "../../supabase/functions/_shared/checkout-consent";

export default function LegalDocumentPage({ document }: { document: "termos" | "privacidade" }) {
  return <main className="min-h-screen bg-background text-foreground px-6 py-12">
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="font-display text-2xl font-bold">{document === "termos" ? "Termos de Uso" : "Política de Privacidade"}</h1>
      <p>Documento em elaboração</p>
      <p className="text-xs text-muted-foreground">Versão: {DOCUMENT_VERSIONS[document]}</p>
    </div>
  </main>;
}