import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, ArrowRight, ArrowLeft, Trophy, Lock, Send, Clock, User } from "lucide-react";

const getDurationByQuestionCount = (count: number) =>
  count <= 25 ? 3900 : 7200; // 65 min para ≤25 questões, 120 min para mais

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  image_url: string | null;
}

interface Exam {
  id: string;
  title: string;
  password: string;
  is_active: boolean;
}

type ExamState = "password" | "identify" | "playing" | "reviewing" | "error";

export default function ExamPage() {
  const { id: examId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [state, setState] = useState<ExamState>("password");
  const [passwordInput, setPasswordInput] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(7200);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSubmitRef = useRef(false);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");

  useEffect(() => {
    const fetchExam = async () => {
      if (!examId) return;
      const { data, error } = await supabase
        .from("exams")
        .select("*")
        .eq("id", examId)
        .maybeSingle();

      if (error || !data || !data.is_active) {
        setState("error");
      } else {
        setExam(data);
      }
      setLoading(false);
    };
    fetchExam();
  }, [examId]);

  const handlePasswordSubmit = async () => {
    if (!exam) return;
    if (passwordInput !== exam.password) {
      toast({ title: "Senha incorreta", variant: "destructive" });
      return;
    }
    setState("identify");
  };

  const handleIdentifySubmit = async () => {
    if (!guestName.trim()) {
      toast({ title: "Digite seu nome para continuar.", variant: "destructive" });
      return;
    }

    const { data: eqData } = await supabase
      .from("exam_questions")
      .select("question_id, sort_order")
      .eq("exam_id", exam!.id)
      .order("sort_order");

    if (!eqData || eqData.length === 0) {
      toast({ title: "Esta prova não tem perguntas.", variant: "destructive" });
      return;
    }

    const questionIds = eqData.map((eq) => eq.question_id);
    const { data: qData } = await supabase
      .from("questions")
      .select("*")
      .in("id", questionIds);

    if (!qData) return;

    const orderMap = new Map(eqData.map((eq) => [eq.question_id, eq.sort_order]));
    const sorted = qData.sort((a, b) => (orderMap.get(a.id) || 0) - (orderMap.get(b.id) || 0));
    setQuestions(sorted);

    const { data: attempt, error } = await supabase
      .from("quiz_attempts")
      .insert({
        ...(user ? { user_id: user.id } : {}),
        total_questions: sorted.length,
        exam_id: exam!.id,
        guest_name: guestName.trim(),
        guest_email: guestEmail.trim() || null,
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Erro ao iniciar prova", description: error.message, variant: "destructive" });
      return;
    }

    setAttemptId(attempt.id);
    setTimeLeft(getDurationByQuestionCount(sorted.length));
    setState("playing");
  };

  // Timer effect
  useEffect(() => {
    if (state === "playing") {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            autoSubmitRef.current = true;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (autoSubmitRef.current && timeLeft === 0 && state === "playing") {
      autoSubmitRef.current = false;
      handleForceSubmit();
    }
  }, [timeLeft, state]);

  const handleForceSubmit = async () => {
    setSubmitting(true);
    let totalScore = 0;
    const answerRows = questions.map((q) => {
      const selected = answers[q.id] || null;
      const isCorrect = selected === q.correct_option;
      if (isCorrect) totalScore++;
      return {
        attempt_id: attemptId!,
        question_id: q.id,
        selected_option: selected,
        is_correct: selected ? isCorrect : false,
      };
    });

    await supabase.from("quiz_answers").insert(answerRows);
    await supabase
      .from("quiz_attempts")
      .update({ score: totalScore, completed_at: new Date().toISOString() })
      .eq("id", attemptId);

    setScore(totalScore);
    setState("reviewing");
    setCurrentIndex(0);
    setSubmitting(false);
    toast({ title: "Tempo esgotado! Prova enviada automaticamente." });
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleSelect = (option: string) => {
    const questionId = questions[currentIndex].id;
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const goToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentIndex(index);
    }
  };

  const handleSubmit = async () => {
    const unanswered = questions.filter((q) => !answers[q.id]);
    if (unanswered.length > 0) {
      toast({
        title: `Faltam ${unanswered.length} questão(ões)`,
        description: "Responda todas as questões antes de enviar.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    let totalScore = 0;
    const answerRows = questions.map((q) => {
      const selected = answers[q.id];
      const isCorrect = selected === q.correct_option;
      if (isCorrect) totalScore++;
      return {
        attempt_id: attemptId!,
        question_id: q.id,
        selected_option: selected,
        is_correct: isCorrect,
      };
    });

    await supabase.from("quiz_answers").insert(answerRows);
    await supabase
      .from("quiz_attempts")
      .update({ score: totalScore, completed_at: new Date().toISOString() })
      .eq("id", attemptId);

    setScore(totalScore);
    setState("reviewing");
    setCurrentIndex(0);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center shadow-elevated">
          <CardHeader>
            <CardTitle className="font-display text-xl">Prova não encontrada</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Esta prova não existe ou não está mais disponível.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "password") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-elevated animate-fade-in">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-4 shadow-glow">
              <Lock className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="font-display text-2xl">{exam?.title}</CardTitle>
            <p className="text-muted-foreground mt-2">Digite a senha para iniciar a prova</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Senha da prova"
              onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
            />
            <Button onClick={handlePasswordSubmit} className="w-full gradient-primary text-primary-foreground">
              Iniciar Prova
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "identify") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-elevated animate-fade-in">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-4 shadow-glow">
              <User className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="font-display text-2xl">{exam?.title}</CardTitle>
            <p className="text-muted-foreground mt-2">Identifique-se para iniciar a prova</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="guestName">Nome completo *</Label>
              <Input
                id="guestName"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Seu nome completo"
                onKeyDown={(e) => e.key === "Enter" && handleIdentifySubmit()}
              />
            </div>
            <div>
              <Label htmlFor="guestEmail">E-mail (opcional)</Label>
              <Input
                id="guestEmail"
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="seu@email.com"
                onKeyDown={(e) => e.key === "Enter" && handleIdentifySubmit()}
              />
            </div>
            <Button onClick={handleIdentifySubmit} className="w-full gradient-primary text-primary-foreground">
              Iniciar Prova
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Reviewing state — show results with correct/wrong feedback
  if (state === "reviewing") {
    const percentage = Math.round((score / questions.length) * 100);
    const currentQuestion = questions[currentIndex];
    const selectedOption = answers[currentQuestion.id];
    const options = [
      { key: "A", text: currentQuestion.option_a },
      { key: "B", text: currentQuestion.option_b },
      { key: "C", text: currentQuestion.option_c },
      { key: "D", text: currentQuestion.option_d },
    ];

    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-2xl mx-auto animate-fade-in">
          {/* Score summary */}
          <Card className="shadow-elevated mb-6 text-center">
            <CardContent className="pt-6 pb-4">
              <div className="flex items-center justify-center gap-3 mb-2">
                <Trophy className="w-8 h-8 text-primary" />
                <span className="text-4xl font-bold font-display text-primary">{percentage}%</span>
              </div>
              <p className="text-muted-foreground">
                Você acertou {score} de {questions.length} perguntas
              </p>
              <Progress value={percentage} className="h-3 mt-3" />
            </CardContent>
          </Card>

          {/* Question navigation */}
          <div className="flex flex-wrap gap-2 mb-4">
            {questions.map((q, i) => {
              const ans = answers[q.id];
              const isCorrect = ans === q.correct_option;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(i)}
                  className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${
                    i === currentIndex
                      ? "ring-2 ring-primary"
                      : ""
                  } ${
                    isCorrect
                      ? "bg-success/20 text-success"
                      : "bg-destructive/20 text-destructive"
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
                <img
                  src={currentQuestion.image_url}
                  alt="Imagem da questão"
                  className="mt-3 rounded-lg w-full max-h-64 object-contain bg-muted"
                />
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
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => goToQuestion(currentIndex - 1)}
              disabled={currentIndex === 0}
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Anterior
            </Button>
            <Button
              variant="outline"
              onClick={() => goToQuestion(currentIndex + 1)}
              disabled={currentIndex >= questions.length - 1}
            >
              Próxima <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Playing state — no feedback, just selection
  const currentQuestion = questions[currentIndex];
  const selectedOption = answers[currentQuestion?.id];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const allAnswered = questions.every((q) => answers[q.id]);
  const options = [
    { key: "A", text: currentQuestion?.option_a },
    { key: "B", text: currentQuestion?.option_b },
    { key: "C", text: currentQuestion?.option_c },
    { key: "D", text: currentQuestion?.option_d },
  ];

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-display font-bold text-foreground">{exam?.title}</h2>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-sm font-bold ${
              timeLeft <= 300 ? "bg-destructive/10 text-destructive animate-pulse" : "bg-secondary text-secondary-foreground"
            }`}>
              <Clock className="w-4 h-4" />
              {formatTime(timeLeft)}
            </div>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Pergunta {currentIndex + 1} de {questions.length}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {Object.keys(answers).length}/{questions.length} respondidas
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question number pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          {questions.map((q, i) => {
            const hasAnswer = !!answers[q.id];
            return (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(i)}
                className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${
                  i === currentIndex
                    ? "gradient-primary text-primary-foreground shadow-glow"
                    : hasAnswer
                    ? "bg-primary/20 text-primary"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        <Card className="shadow-elevated mb-6">
          <CardHeader>
            <CardTitle className="font-display text-xl leading-relaxed">
              {currentQuestion?.question_text}
            </CardTitle>
            {currentQuestion?.image_url && (
              <img
                src={currentQuestion.image_url}
                alt="Imagem da questão"
                className="mt-3 rounded-lg w-full max-h-64 object-contain bg-muted"
              />
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {options.map((opt) => {
              const isSelected = selectedOption === opt.key;
              let extraClass = "w-full justify-start text-left h-auto py-3 px-4 text-base transition-all break-words whitespace-normal max-w-full overflow-hidden ";

              if (isSelected) {
                extraClass += "border-primary bg-primary/10 text-primary ring-2 ring-primary/30";
              } else {
                extraClass += "hover:border-primary hover:bg-primary/5";
              }

              return (
                <Button
                  key={opt.key}
                  variant="outline"
                  className={extraClass}
                  onClick={() => handleSelect(opt.key)}
                >
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-secondary text-secondary-foreground font-bold mr-3 shrink-0">
                    {opt.key}
                  </span>
                  <span className="flex-1 break-words whitespace-normal overflow-hidden max-w-full">{opt.text}</span>
                </Button>
              );
            })}
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => goToQuestion(currentIndex - 1)}
            disabled={currentIndex === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Anterior
          </Button>

          {currentIndex + 1 < questions.length ? (
            <Button
              onClick={() => goToQuestion(currentIndex + 1)}
              disabled={!selectedOption}
              className="gradient-primary text-primary-foreground"
            >
              Próxima <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!allAnswered || submitting}
              className="gradient-primary text-primary-foreground"
            >
              {submitting ? "Enviando..." : "Finalizar Prova"}
              <Send className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
