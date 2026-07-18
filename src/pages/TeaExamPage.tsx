import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { normalizeQuestionText } from "@/lib/utils";
import { Lock, ArrowRight, ArrowLeft, Trophy, Eye, EyeOff, CheckCircle, XCircle, Home } from "lucide-react";
import QuestionVideo from "@/components/QuestionVideo";

const POINTS_PER_ITEM = 0.52;

interface TeaQ {
  id: string;
  question_text: string;
  image_url: string | null;
  video_url: string | null;
  comment: string | null;
  comment_image_url: string | null;
  sub1_text: string; sub1_answer_key: string; sub1_image_url: string | null;
  sub2_text: string; sub2_answer_key: string; sub2_image_url: string | null;
  sub3_text: string; sub3_answer_key: string; sub3_image_url: string | null;
}
interface Exam { id: string; title: string; password: string; is_active: boolean; }
type State = "password" | "playing" | "finished" | "error";

export default function TeaExamPage() {
  const { id: examId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<TeaQ[]>([]);
  const [state, setState] = useState<State>("password");
  const [pw, setPw] = useState("");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { s1: string; s2: string; s3: string }>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [selfCheck, setSelfCheck] = useState<Record<string, { s1: boolean; s2: boolean; s3: boolean }>>({});
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [finalScore, setFinalScore] = useState(0);

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    if (!examId) return;
    (async () => {
      const { data } = await supabase.from("exams").select("*").eq("id", examId).eq("exam_type", "tea").maybeSingle();
      if (!data || !data.is_active) { setState("error"); setLoading(false); return; }
      setExam(data as Exam);
      setLoading(false);
    })();
  }, [examId, user]);

  const startAfterPassword = async () => {
    if (!exam || pw !== exam.password) { toast({ title: "Senha incorreta", variant: "destructive" }); return; }
    const { data: eq } = await supabase.from("tea_exam_questions").select("tea_question_id, question_order").eq("exam_id", exam.id).order("question_order");
    const ids = (eq ?? []).map((r) => r.tea_question_id);
    if (ids.length === 0) { toast({ title: "Prova sem questões", variant: "destructive" }); return; }
    const { data: qs } = await supabase.from("tea_questions").select("*").in("id", ids);
    const map = new Map((qs ?? []).map((q: any) => [q.id, q]));
    const ordered = ids.map((i) => map.get(i)).filter(Boolean) as TeaQ[];
    setQuestions(ordered);
    const { data: attempt } = await supabase.from("tea_attempts").insert({
      user_id: user!.id, exam_id: exam.id, total_items: ordered.length * 3,
    }).select().single();
    setAttemptId(attempt?.id ?? null);
    setState("playing");
  };

  const q = questions[current];
  const ans = q ? (answers[q.id] ?? { s1: "", s2: "", s3: "" }) : { s1: "", s2: "", s3: "" };
  const check = q ? (selfCheck[q.id] ?? { s1: false, s2: false, s3: false }) : { s1: false, s2: false, s3: false };

  const setAns = (k: "s1" | "s2" | "s3", v: string) => setAnswers((a) => ({ ...a, [q.id]: { ...ans, [k]: v } }));
  const toggleReveal = () => setRevealed((r) => ({ ...r, [q.id]: !r[q.id] }));
  const setCheck = (k: "s1" | "s2" | "s3", v: boolean) => setSelfCheck((c) => ({ ...c, [q.id]: { ...check, [k]: v } }));

  const finish = async () => {
    let correct = 0;
    questions.forEach((qq) => {
      const c = selfCheck[qq.id] ?? { s1: false, s2: false, s3: false };
      if (c.s1) correct++; if (c.s2) correct++; if (c.s3) correct++;
    });
    const score = +(correct * POINTS_PER_ITEM).toFixed(2);
    setFinalScore(score);
    if (attemptId) {
      await supabase.from("tea_attempts").update({
        correct_items: correct, score, completed_at: new Date().toISOString(),
      }).eq("id", attemptId);
      const rows = questions.flatMap((qq) => {
        const a = answers[qq.id] ?? { s1: "", s2: "", s3: "" };
        const c = selfCheck[qq.id] ?? { s1: false, s2: false, s3: false };
        return [1, 2, 3].map((n) => ({
          attempt_id: attemptId,
          tea_question_id: qq.id,
          sub_index: n,
          student_answer: (a as any)["s" + n] || null,
          is_correct: (c as any)["s" + n],
        }));
      });
      if (rows.length) await supabase.from("tea_answers").insert(rows);
    }
    setState("finished");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (state === "error") return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card><CardContent className="py-8 text-center"><p>Prova não encontrada ou indisponível.</p><Button onClick={() => navigate("/")} className="mt-4">Voltar</Button></CardContent></Card>
    </div>
  );

  if (state === "password") return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle className="font-display flex items-center gap-2"><Lock className="w-5 h-5" /> {exam?.title}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Prova TEA 2ª Fase — cada item vale {POINTS_PER_ITEM.toFixed(2)} pontos.</p>
          <Label>Senha de acesso</Label>
          <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && startAfterPassword()} />
          <Button onClick={startAfterPassword} className="w-full gradient-primary text-primary-foreground">Iniciar</Button>
        </CardContent>
      </Card>
    </div>
  );

  if (state === "finished") {
    const maxScore = +(questions.length * 3 * POINTS_PER_ITEM).toFixed(2);
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 rounded-full gradient-primary flex items-center justify-center mb-2"><Trophy className="w-8 h-8 text-primary-foreground" /></div>
            <CardTitle className="font-display text-2xl">Prova finalizada!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-4xl font-display font-bold text-primary">{finalScore.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">de {maxScore.toFixed(2)} pontos possíveis</p>
            <Button onClick={() => navigate("/")} className="gradient-primary text-primary-foreground"><Home className="w-4 h-4 mr-2" /> Voltar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // playing
  const progress = ((current + 1) / questions.length) * 100;
  const isRevealed = !!revealed[q.id];

  return (
    <div className="min-h-screen p-4 pb-24">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Questão {current + 1} de {questions.length}</span>
          <span className="text-xs text-muted-foreground">Cada item vale {POINTS_PER_ITEM.toFixed(2)}</span>
        </div>
        <Progress value={progress} className="h-2" />

        <Card>
          <CardHeader>
            <CardTitle className="text-lg leading-relaxed whitespace-pre-wrap break-words">
              {normalizeQuestionText(q.question_text)}
            </CardTitle>
            {q.image_url && <img src={q.image_url} alt="" className="mt-3 rounded max-h-80 object-contain bg-muted" />}
            {q.video_url && <QuestionVideo src={q.video_url} />}
          </CardHeader>
        </Card>

        {[1, 2, 3].map((n) => {
          const k = ("s" + n) as "s1" | "s2" | "s3";
          const subText = (q as any)[`sub${n}_text`] as string;
          const subKey = (q as any)[`sub${n}_answer_key`] as string;
          const subImg = (q as any)[`sub${n}_image_url`] as string | null;
          return (
            <Card key={n} className="border-primary/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Pergunta {n}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm whitespace-pre-wrap">{normalizeQuestionText(subText)}</p>
                {subImg && <img src={subImg} alt="" className="rounded max-h-64 object-contain bg-muted" />}
                <Textarea rows={4} placeholder="Sua resposta..." value={ans[k]} onChange={(e) => setAns(k, e.target.value)} />
                {isRevealed && (
                  <div className="rounded-lg border bg-secondary/40 p-3 space-y-2">
                    <p className="text-xs font-semibold text-primary">Gabarito</p>
                    <p className="text-sm whitespace-pre-wrap">{normalizeQuestionText(subKey)}</p>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant={check[k] ? "default" : "outline"} onClick={() => setCheck(k, true)} className={check[k] ? "bg-success hover:bg-success text-white" : ""}>
                        <CheckCircle className="w-4 h-4 mr-1" /> Acertei
                      </Button>
                      <Button size="sm" variant={!check[k] && (check as any)[`_${k}Marked`] ? "destructive" : "outline"} onClick={() => setCheck(k, false)}>
                        <XCircle className="w-4 h-4 mr-1" /> Errei
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" onClick={toggleReveal}>
            {isRevealed ? <><EyeOff className="w-4 h-4 mr-1" /> Ocultar gabarito</> : <><Eye className="w-4 h-4 mr-1" /> Ver gabarito</>}
          </Button>
          {q.comment && isRevealed && (
            <p className="text-xs text-muted-foreground flex-1 mx-3 italic line-clamp-2">💡 {q.comment}</p>
          )}
        </div>
        {isRevealed && q.comment_image_url && <img src={q.comment_image_url} alt="" className="rounded max-h-80 object-contain bg-muted" />}

        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Anterior
          </Button>
          {current < questions.length - 1 ? (
            <Button className="gradient-primary text-primary-foreground" onClick={() => setCurrent((c) => c + 1)}>
              Próxima <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button className="gradient-primary text-primary-foreground" onClick={finish}>
              Finalizar prova
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
