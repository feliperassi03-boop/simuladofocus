import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Mail } from "lucide-react";

interface AllowedEmail {
  id: string;
  email: string;
  created_at: string;
}

export default function AllowedEmailsTab() {
  const { toast } = useToast();
  const [emails, setEmails] = useState<AllowedEmail[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchEmails = async () => {
    const { data } = await supabase
      .from("allowed_emails")
      .select("*")
      .order("email", { ascending: true });
    if (data) setEmails(data);
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  const handleAdd = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      toast({ title: "Digite um email válido.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("allowed_emails").insert({ email });
    if (error) {
      toast({
        title: error.code === "23505" ? "Email já cadastrado." : "Erro ao adicionar",
        description: error.code === "23505" ? undefined : error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Email adicionado!" });
      setNewEmail("");
      fetchEmails();
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("allowed_emails").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Email removido!" });
      fetchEmails();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="email@exemplo.com"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button onClick={handleAdd} disabled={loading} className="gradient-primary text-primary-foreground shrink-0">
          <Plus className="w-4 h-4 mr-2" /> Adicionar
        </Button>
      </div>

      <Card className="shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead className="w-20">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {emails.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  {e.email}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {emails.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                  Nenhum email autorizado. Adicione emails acima.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
