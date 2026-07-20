import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircleQuestion } from "lucide-react";

type DoubtStatus = "pending" | "answered" | "resolved" | "archived";

interface Doubt {
  id: string;
  exam_title: string;
  question_number: number | null;
  question_text_snapshot: string | null;
  doubt_text: string;
  status: DoubtStatus;
  admin_response: string | null;
  admin_response_image_url: string | null;
  answered_at: string | null;
  created_at: string;
  read_by_student: boolean;
}

const statusLabel: Record<DoubtStatus, string> = {
  pending: "Pendente",
  answered: "Respondida",
  resolved: "Resolvida",
  archived: "Arquivada",
};

const statusBadge: Record<DoubtStatus, string> = {
  pending: "bg-warning/15 text-warning border-warning/30",
  answered: "bg-info/15 text-info border-info/30",
  resolved: "bg-success/15 text-success border-success/30",
  archived: "bg-muted text-muted-foreground border-border",
};

export default function MyDoubtsPage() {
  const { user } = useAuth();
  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDoubts = async () => {
    if (!user) return;
    setLoading(true);
    const email = user.email?.toLowerCase();
    const orFilter = email
      ? `user_id.eq.${user.id},student_email.ilike.${email}`
      : `user_id.eq.${user.id}`;
    const { data } = await supabase
      .from("question_doubts")
      .select("*")
      .or(orFilter)
      .order("created_at", { ascending: false });
    setDoubts((data || []) as Doubt[]);
    setLoading(false);

    // Mark unread answered doubts as read
    const unreadIds = (data || [])
      .filter((d: any) => d.admin_response && !d.read_by_student)
      .map((d: any) => d.id);
    if (unreadIds.length > 0) {
      await supabase
        .from("question_doubts")
        .update({ read_by_student: true })
        .in("id", unreadIds);
    }
  };

  useEffect(() => {
    fetchDoubts();
  }, [user?.id]);

  const grouped = useMemo(() => {
    const pending = doubts.filter((d) => !d.admin_response);
    const answered = doubts.filter((d) => d.admin_response);
    return { pending, answered };
  }, [doubts]);

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
          <MessageCircleQuestion className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Minhas Dúvidas</h1>
          <p className="text-sm text-muted-foreground">Acompanhe suas dúvidas enviadas e respostas.</p>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-8">Carregando...</p>
      ) : doubts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <MessageCircleQuestion className="w-10 h-10 mx-auto mb-2 opacity-50" />
            Você ainda não enviou nenhuma dúvida.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {doubts.map((d) => (
            <Card key={d.id} className="shadow-card">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={statusBadge[d.status]}>{statusLabel[d.status]}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(d.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground break-words">
                  {d.exam_title}{d.question_number ? ` — Questão ${d.question_number}` : ""}
                </p>
                {d.question_text_snapshot && (
                  <div className="text-xs bg-muted/40 rounded p-2 text-muted-foreground break-words whitespace-normal">
                    {d.question_text_snapshot}
                  </div>
                )}
                <div className="text-sm text-foreground break-words whitespace-normal">
                  <strong className="font-display">Sua dúvida:</strong> {d.doubt_text}
                </div>
                {d.admin_response ? (
                  <div className="text-sm bg-primary/5 border border-primary/20 rounded p-3 break-words whitespace-normal">
                    <strong className="font-display text-primary">Resposta:</strong> {d.admin_response}
                    {d.answered_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Respondida em {new Date(d.answered_at).toLocaleString("pt-BR")}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Aguardando resposta da equipe...</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
