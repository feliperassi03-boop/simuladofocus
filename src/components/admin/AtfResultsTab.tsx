import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Download, Trophy } from "lucide-react";

const EXAM_ID = "3599ded6-c8da-4a34-837f-6a95a38b7e1a";

interface Row {
  id: string;
  guest_name: string | null;
  guest_email: string | null;
  score: number | null;
  total_questions: number | null;
  completed_at: string | null;
  created_at: string;
}

export default function AtfResultsTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("quiz_attempts")
      .select("id, guest_name, guest_email, score, total_questions, completed_at, created_at")
      .eq("exam_id", EXAM_ID)
      .order("score", { ascending: false, nullsFirst: false });
    setRows((data as Row[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("atf-attempts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quiz_attempts", filter: `exam_id=eq.${EXAM_ID}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const filtered = rows.filter((r) => {
    const t = `${r.guest_name || ""} ${r.guest_email || ""}`.toLowerCase();
    return t.includes(search.toLowerCase());
  });

  const finished = filtered.filter((r) => r.completed_at);

  const exportCsv = () => {
    const header = "Nome,E-mail,Nota,Total,Percentual,Finalizado em\n";
    const body = filtered
      .map((r) => {
        const pct = r.total_questions ? Math.round(((r.score || 0) / r.total_questions) * 100) : 0;
        return [
          `"${r.guest_name || ""}"`,
          `"${r.guest_email || ""}"`,
          r.score ?? "",
          r.total_questions ?? "",
          `${pct}%`,
          r.completed_at ? new Date(r.completed_at).toLocaleString("pt-BR") : "em andamento",
        ].join(",");
      })
      .join("\n");
    const url = URL.createObjectURL(new Blob([header + body], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "notas-atf-i.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          Notas ATF I ({finished.length} finalizadas)
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}>
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          placeholder="Buscar por nome ou e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma prova realizada ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 pr-3">Nome</th>
                  <th className="py-2 pr-3">E-mail</th>
                  <th className="py-2 pr-3">Nota</th>
                  <th className="py-2 pr-3">%</th>
                  <th className="py-2">Finalizado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const pct = r.total_questions
                    ? Math.round(((r.score || 0) / r.total_questions) * 100)
                    : 0;
                  return (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 text-muted-foreground">{i + 1}</td>
                      <td className="py-2 pr-3 break-words">{r.guest_name || "—"}</td>
                      <td className="py-2 pr-3 break-words">{r.guest_email || "—"}</td>
                      <td className="py-2 pr-3 font-semibold">
                        {r.completed_at ? `${r.score ?? 0}/${r.total_questions ?? 0}` : "—"}
                      </td>
                      <td className="py-2 pr-3">{r.completed_at ? `${pct}%` : "—"}</td>
                      <td className="py-2 text-muted-foreground">
                        {r.completed_at
                          ? new Date(r.completed_at).toLocaleString("pt-BR")
                          : "em andamento"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
