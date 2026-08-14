import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Copy, Trash2, Download, Search } from "lucide-react";

interface Signup {
  id: string;
  full_name: string;
  email: string;
  participant_type: string;
  created_at: string;
}

export default function SignupsTab() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Signup[]>([]);
  const [q, setQ] = useState("");

  const link = `${window.location.origin}/#/inscricao-simulado`;

  const fetchRows = async () => {
    const { data } = await supabase
      .from("simulado_signups")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setRows(data as Signup[]);
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("simulado_signups").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Inscrição removida" });
    fetchRows();
  };

  const exportCsv = () => {
    const header = "Nome,Email,Tipo,Data\n";
    const body = rows
      .map((r) => `"${r.full_name}","${r.email}","${r.participant_type}","${new Date(r.created_at).toLocaleString("pt-BR")}"`)
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inscricoes-simulado-aumakua.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = rows.filter(
    (r) =>
      r.full_name.toLowerCase().includes(q.toLowerCase()) ||
      r.email.toLowerCase().includes(q.toLowerCase())
  );

  const residentes = rows.filter((r) => r.participant_type === "residente").length;
  const anestesistas = rows.filter((r) => r.participant_type === "anestesista").length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Link de inscrição — Simulado Aumakua 13/09 08:00 (4h)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input readOnly value={link} className="text-sm" />
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(link);
                toast({ title: "Link copiado!" });
              }}
            >
              <Copy className="h-4 w-4 mr-1" /> Copiar
            </Button>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>Total: <strong className="text-foreground">{rows.length}</strong></span>
            <span>Residentes: <strong className="text-foreground">{residentes}</strong></span>
            <span>Anestesistas: <strong className="text-foreground">{anestesistas}</strong></span>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome ou email..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={!rows.length}>
          <Download className="h-4 w-4 mr-1" /> CSV
        </Button>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Data</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium break-words">{r.full_name}</TableCell>
                  <TableCell className="break-all">{r.email}</TableCell>
                  <TableCell className="capitalize">{r.participant_type}</TableCell>
                  <TableCell>{new Date(r.created_at).toLocaleString("pt-BR")}</TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(r.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!filtered.length && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhuma inscrição ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
