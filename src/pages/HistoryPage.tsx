import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, ArrowLeft, ArrowRight, Trophy, BookOpen, Clock, MessageSquareText, Eye } from "lucide-react";
import QuestionVideo from "@/components/QuestionVideo";

interface Attempt {
  id: string;
  score: number | null;
  total_questions: number | null;
  completed_at: string | null;
  created_at: string;
  exam_id: string | null;
  guest_name: string | null;
  exam_title?: string;
}

interface AnswerDetail {
  question_id: string;
  selected_option: string | null;
  is_correct: boolean | null;
}

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  image_url: string | null;
  video_url: string | null;
  comment: string | null;
}

type ViewMode = "list" | "review";

export default function HistoryPage() {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // Review state
  const [reviewAttempt, setReviewAttempt] = useState<Attempt | null>(null);
  const [reviewAnswers, setReviewAnswers] = useState<Record<string, string>>({});
  const [reviewQuestions, setReviewQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetchAttempts();
  }, [user]);

  const fetchAttempts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("quiz_attempts")
      .select("*")
      .eq("user_id", user!.id)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false });

    if (!data) {
      setLoading(false);
      return;
    }

    // Fetch exam titles
    const examIds = [...new Set(data.filter(a => a.exam_id).map(a => a.exam_id!))];
    let examMap: Record<string, string> = {};
    if (examIds.length > 0) {
      const { data: exams } = await supabase
        .from("exams")
        .select("id, title")
        .in("id", examIds);
      if (exams) {
        examMap = Object.fromEntries(exams.map(e => [e.id, e.title]));
      }
    }

    setAttempts(data.map(a => ({
      ...a,
      exam_title: a.exam_id ? examMap[a.exam_id] || "Prova" : "Simulado Focus",
    })));
    setLoading(false);
  };

  const openReview = async (attempt: Attempt) => {
    // Fetch answers for this attempt
    const { data: answerData } = await supabase
      .from("quiz_answers")
      .select("question_id, selected_option, is_correct")
      .eq("attempt_id", attempt.id);

    if (!answerData) return;

    const questionIds = answerData.map(a => a.question_id);
    const { data: qData } = await supabase
      .from("questions")
      .select("*")
      .in("id", questionIds);

    if (!qData) return;

    // If it's an exam attempt, get sort order
    let orderedQuestions = qData;
    if (attempt.exam_id) {
      const { data: eqData } = await supabase
        .from("exam_questions")
        .select("question_id, sort_order")
        .eq("exam_id", attempt.exam_id)
        .order("sort_order");
      if (eqData) {
        const orderMap = new Map(eqData.map(eq => [eq.question_id, eq.sort_order]));
        orderedQuestions = qData.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
      }
    }

    const answersMap: Record<string, string> = {};
    answerData.forEach(a => {
      if (a.selected_option) answersMap[a.question_id] = a.selected_option;
    });

    setReviewAttempt(attempt);
    setReviewAnswers(answersMap);
    setReviewQuestions(orderedQuestions);
    setCurrentIndex(0);
    setViewMode("review");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (viewMode === "review" && reviewAttempt) {
    const score = reviewAttempt.score ?? 0;
    const total = reviewQuestions.length;
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    const currentQuestion = reviewQuestions[currentIndex];

    if (!currentQuestion) return null;

    const selectedOption = reviewAnswers[currentQuestion.id];
    const options = [
      { key: "A", text: currentQuestion.option_a },
      { key: "B", text: currentQuestion.option_b },
      { key: "C", text: currentQuestion.option_c },
      { key: "D", text: currentQuestion.option_d },
    ];

    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" size="sm" onClick={() => setViewMode("list")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Histórico
          </Button>
          <h2 className="text-lg font-display font-bold text-foreground truncate ml-2">
            {reviewAttempt.exam_title}
          </h2>
        </div>

        {/* Score summary */}
        <Card className="shadow-elevated mb-6 text-center">
          <CardContent className="pt-6 pb-4">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Trophy className="w-8 h-8 text-primary" />
              <span className="text-4xl font-bold font-display text-primary">{percentage}%</span>
            </div>
            <p className="text-muted-foreground">
              Você acertou {score} de {total} perguntas
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              <Clock className="w-3 h-3 inline mr-1" />
              {reviewAttempt.completed_at
                ? new Date(reviewAttempt.completed_at).toLocaleString("pt-BR")
                : ""}
            </p>
            <Progress value={percentage} className="h-3 mt-3" />
          </CardContent>
        </Card>

        {/* Question navigation */}
        <div className="flex flex-wrap gap-2 mb-4">
          {reviewQuestions.map((q, i) => {
            const ans = reviewAnswers[q.id];
            const isCorrect = ans === q.correct_option;
            return (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(i)}
                className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${
                  i === currentIndex ? "ring-2 ring-primary" : ""
                } ${
                  ans
                    ? isCorrect
                      ? "bg-success/20 text-success"
                      : "bg-destructive/20 text-destructive"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        {/* Question review */}
        <Card className="shadow-elevated mb-6">
          <CardHeader>
            <CardTitle className="font-display text-xl leading-relaxed">
              {currentQuestion.question_text}
            </CardTitle>
            {currentQuestion.image_url && (
              <img src={currentQuestion.image_url} alt="Imagem da questão" className="mt-3 rounded-lg w-full max-h-64 object-contain bg-muted" />
            )}
            {currentQuestion.video_url && (
              <QuestionVideo key={currentQuestion.id} src={currentQuestion.video_url} />
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {options.map((opt) => {
              const isSelected = selectedOption === opt.key;
              const isCorrect = opt.key === currentQuestion.correct_option;
              let classes = "w-full justify-start text-left h-auto py-3 px-4 text-base break-words whitespace-normal max-w-full overflow-hidden ";

              if (isCorrect) {
                classes += "border-success bg-success/10 text-success";
              } else if (isSelected && !isCorrect) {
                classes += "border-destructive bg-destructive/10 text-destructive";
              }

              return (
                <Button key={opt.key} variant="outline" className={classes} disabled>
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-secondary text-secondary-foreground font-bold mr-3 shrink-0">
                    {opt.key}
                  </span>
                  <span className="flex-1 break-words whitespace-normal overflow-hidden max-w-full">{opt.text}</span>
                  {isCorrect && <CheckCircle className="w-5 h-5 text-success ml-2 shrink-0" />}
                  {isSelected && !isCorrect && <XCircle className="w-5 h-5 text-destructive ml-2 shrink-0" />}
                </Button>
              );
            })}

            {currentQuestion.comment && (
              <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquareText className="w-5 h-5 text-primary" />
                  <span className="font-display font-semibold text-foreground">Comentário</span>
                </div>
                <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {currentQuestion.comment}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setCurrentIndex(i => Math.max(0, i - 1))} disabled={currentIndex === 0}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Anterior
          </Button>
          <Button variant="outline" onClick={() => setCurrentIndex(i => Math.min(reviewQuestions.length - 1, i + 1))} disabled={currentIndex >= reviewQuestions.length - 1}>
            Próxima <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <h1 className="text-2xl font-display font-bold text-foreground mb-6 flex items-center gap-2">
        <BookOpen className="w-6 h-6 text-primary" />
        Meus Simulados
      </h1>

      {attempts.length === 0 ? (
        <Card className="shadow-elevated text-center">
          <CardContent className="py-12">
            <p className="text-muted-foreground">Você ainda não realizou nenhum simulado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {attempts.map((attempt) => {
            const score = attempt.score ?? 0;
            const total = attempt.total_questions ?? 0;
            const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

            return (
              <Card key={attempt.id} className="shadow-elevated hover:shadow-lg transition-shadow cursor-pointer" onClick={() => openReview(attempt)}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display font-semibold text-foreground truncate">
                        {attempt.exam_title}
                      </h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" />
                        {attempt.completed_at
                          ? new Date(attempt.completed_at).toLocaleString("pt-BR")
                          : "Em andamento"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className={`text-2xl font-bold font-display ${percentage >= 70 ? "text-success" : percentage >= 50 ? "text-primary" : "text-destructive"}`}>
                          {percentage}%
                        </span>
                        <p className="text-xs text-muted-foreground">{score}/{total}</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
