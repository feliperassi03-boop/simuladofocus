import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

const STATUSES = ["pendente", "ativo", "atrasado", "cancelado", "estornado"] as const;
type Status = (typeof STATUSES)[number];
type Row = {
  id: string; aluno_nome: string; aluno_email: string | null; plano: string; status: Status;
  data_expiracao: string | null; asaas_customer_id: string | null; asaas_subscription_id: string | null;
};

const empty = { aluno_nome: "", aluno_email: "", plano: "", status: "pendente" as Status, data_expiracao: "", asaas_customer_id: "", asaas_subscription_id: "" };

export default function AssinaturasTab() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState(empty);

  const load = async () => {
    const { data } = await supabase.from("assinaturas").select("*").order("created_at", { ascending: false });
    setRows((data as Row[]) || []);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!form.plano.trim()) return toast({ title: "Informe o plano.", variant: "destructive" });
    const { error } = await supabase.from("assinaturas").insert({
      aluno_nome: form.aluno_nome.trim(), aluno_email: form.aluno_email.trim() || null, plano: form.plano.trim(),
      status: form.status, data_expiracao: form.data_expiracao || null,
      asaas_customer_id: form.asaas_customer_id.trim() || null, asaas_subscription_id: form.asaas_subscription_id.trim() || null,
    });
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setForm(empty);
    load();
  };

  const updateStatus = async (id: string, status: Status) => {
    await supabase.from("assinaturas").update({ status }).eq("id", id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta assinatura?")) return;
    await supabase.from("assinaturas").delete().eq("id", id);
    load();
  };

  const f = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="font-display">Nova assinatura</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div><Label>Nome do aluno</Label><Input value={form.aluno_nome} onChange={f("aluno_nome")} /></div>
          <div><Label>E-mail do aluno</Label><Input type="email" value={form.aluno_email} onChange={f("aluno_email")} /></div>
          <div><Label>Plano *</Label><Input value={form.plano} onChange={f("plano")} placeholder="Ex.: Mensal" /></div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Status })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Data de expiração</Label><Input type="date" value={form.data_expiracao} onChange={f("data_expiracao")} /></div>
          <div><Label>ID do cliente no Asaas</Label><Input value={form.asaas_customer_id} onChange={f("asaas_customer_id")} placeholder="cus_..." /></div>
          <div><Label>ID da assinatura no Asaas</Label><Input value={form.asaas_subscription_id} onChange={f("asaas_subscription_id")} placeholder="sub_..." /></div>
          <div className="flex items-end"><Button onClick={add}><Plus className="w-4 h-4 mr-1" /> Adicionar</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-display">Assinaturas ({rows.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aluno</TableHead><TableHead>Plano</TableHead><TableHead>Status</TableHead>
                <TableHead>Expiração</TableHead><TableHead>Cliente Asaas</TableHead><TableHead>Assinatura Asaas</TableHead><TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && <TableRow><TableCell colSpan={7} className="text-muted-foreground">Nenhuma assinatura ainda.</TableCell></TableRow>}
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell><div className="font-medium">{r.aluno_nome || "—"}</div><div className="text-xs text-muted-foreground">{r.aluno_email}</div></TableCell>
                  <TableCell>{r.plano}</TableCell>
                  <TableCell>
                    <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v as Status)}>
                      <SelectTrigger className="w-32"><SelectValue><Badge variant={r.status === "ativo" ? "default" : "secondary"} className="capitalize">{r.status}</Badge></SelectValue></SelectTrigger>
                      <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{r.data_expiracao ? new Date(r.data_expiracao + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{r.asaas_customer_id || "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{r.asaas_subscription_id || "—"}</TableCell>
                  <TableCell><Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="w-4 h-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
