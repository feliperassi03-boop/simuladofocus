import { SALES_DISABLED_MESSAGE } from "../../supabase/functions/_shared/sales-status";

export default function SalesUnavailable() {
  return <div className="min-h-[70vh] flex items-center justify-center p-4">
    <div className="w-full max-w-lg text-center space-y-4">
      <p className="font-display text-lg font-semibold text-primary">AUMAKUA</p>
      <h1 className="font-display text-2xl font-semibold text-foreground">Vendas temporariamente indisponíveis</h1>
      <p className="text-muted-foreground">{SALES_DISABLED_MESSAGE}</p>
    </div>
  </div>;
}