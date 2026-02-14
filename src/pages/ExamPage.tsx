import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, ArrowRight, Trophy, Lock, BookOpen } from "lucide-react";

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

type ExamState = "password" | "playing" | "finished" | "error";

export default function ExamPage() {
  const { id: examId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [state, setState] = useState<ExamState>("password");
  const [passwordInput, setPasswordInput] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

    // Fetch exam questions
    const { data: eqData } = await supabase
      .from("exam_questions")
      .select("question_id, sort_order")
      .eq("exam_id", exam.id)
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

    // Sort by exam order
    const orderMap = new Map(eqData.map((eq) => [eq.question_id, eq.sort_order]));
    const sorted = qData.sort((a, b) => (orderMap.get(a.id) || 0) - (orderMap.get(b.id) || 0));
    setQuestions(sorted);

    // Create attempt
    const { data: attempt, error } = await supabase
      .from("quiz_attempts")
      .insert({
        ...(user ? { user_id: user.id } : {}),
        total_questions: sorted.length,
        exam_id: exam.id,
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Erro ao iniciar prova", description: error.message, variant: "destructive" });
      return;
    }

    setAttemptId(attempt.id);
    setState("playing");
  };

  const handleAnswer = async (option: string) => {
    if (answered) return;
    setSelectedOption(option);
    setAnswered(true);

    const question = questions[currentIndex];
    const isCorrect = option === question.correct_option;
    if (isCorrect) setScore((s) => s + 1);

    await supabase.from("quiz_answers").insert({
      attempt_id: attemptId,
      question_id: question.id,
      selected_option: option,
      is_correct: isCorrect,
    });
  };

  const nextQuestion = async () => {
    if (currentIndex + 1 >= questions.length) {
      await supabase
        .from("quiz_attempts")
        .update({ score, completed_at: new Date().toISOString() })
        .eq("id", attemptId);
      setState("finished");
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setAnswered(false);
    }
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

  if (state === "finished") {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-elevated animate-scale-in text-center">
          <CardHeader>
            <div className="mx-auto w-20 h-20 rounded-full gradient-primary flex items-center justify-center mb-4 shadow-glow">
              <Trophy className="w-10 h-10 text-primary-foreground" />
            </div>
            <CardTitle className="font-display text-3xl">Prova Finalizada!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-5xl font-bold font-display text-primary">{percentage}%</p>
              <p className="text-muted-foreground mt-2">
                Você acertou {score} de {questions.length} perguntas
              </p>
            </div>
            <Progress value={percentage} className="h-3" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Playing state
  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + (answered ? 1 : 0)) / questions.length) * 100;
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
          <h2 className="text-lg font-display font-bold text-foreground mb-2">{exam?.title}</h2>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Pergunta {currentIndex + 1} de {questions.length}
            </span>
            <span className="text-sm font-medium text-primary">Acertos: {score}</span>
          </div>
          <Progress value={progress} className="h-2" />
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
              const isCorrect = opt.key === currentQuestion?.correct_option;
              let extraClass = "w-full justify-start text-left h-auto py-3 px-4 text-base transition-all break-words whitespace-normal max-w-full overflow-hidden ";

              if (answered) {
                if (isCorrect) {
                  extraClass += "border-success bg-success/10 text-success";
                } else if (isSelected && !isCorrect) {
                  extraClass += "border-destructive bg-destructive/10 text-destructive";
                }
              } else {
                extraClass += "hover:border-primary hover:bg-primary/5";
              }

              return (
                <Button
                  key={opt.key}
                  variant="outline"
                  className={extraClass}
                  onClick={() => handleAnswer(opt.key)}
                  disabled={answered}
                >
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-secondary text-secondary-foreground font-bold mr-3 shrink-0">
                    {opt.key}
                  </span>
                  <span className="flex-1 break-words whitespace-normal overflow-hidden max-w-full">{opt.text}</span>
                  {answered && isCorrect && <CheckCircle className="w-5 h-5 text-success ml-2 shrink-0" />}
                  {answered && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-destructive ml-2 shrink-0" />}
                </Button>
              );
            })}
          </CardContent>
        </Card>

        {answered && (
          <div className="flex justify-end animate-fade-in">
            <Button onClick={nextQuestion} className="gradient-primary text-primary-foreground">
              {currentIndex + 1 >= questions.length ? "Ver Resultado" : "Próxima"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
