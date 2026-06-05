import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, LogOut, Shield, History, FileText, MessageCircleQuestion } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const [unreadDoubts, setUnreadDoubts] = useState(0);
  const [pendingDoubts, setPendingDoubts] = useState(0);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      if (isAdmin) {
        const { count } = await supabase
          .from("question_doubts")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending");
        setPendingDoubts(count || 0);
      } else {
        const { count } = await supabase
          .from("question_doubts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("read_by_student", false)
          .not("admin_response", "is", null);
        setUnreadDoubts(count || 0);
      }
    };
    load();
    const channel = supabase
      .channel("doubts-nav")
      .on("postgres_changes", { event: "*", schema: "public", table: "question_doubts" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, isAdmin, location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg text-foreground">QuizMaster</span>
          </Link>

          <nav className="flex items-center gap-2 flex-wrap">
            {!isAdmin && (
              <Link to="/provas">
                <Button
                  variant={location.pathname === "/provas" ? "default" : "ghost"}
                  size="sm"
                  className={location.pathname === "/provas" ? "gradient-primary text-primary-foreground" : ""}
                >
                  <FileText className="w-4 h-4 mr-1" /> Provas
                </Button>
              </Link>
            )}
            <Link to="/historico">
              <Button
                variant={location.pathname === "/historico" ? "default" : "ghost"}
                size="sm"
                className={location.pathname === "/historico" ? "gradient-primary text-primary-foreground" : ""}
              >
                <History className="w-4 h-4 mr-1" /> Histórico
              </Button>
            </Link>
            {!isAdmin && (
              <Link to="/duvidas">
                <Button
                  variant={location.pathname === "/duvidas" ? "default" : "ghost"}
                  size="sm"
                  className={`relative ${location.pathname === "/duvidas" ? "gradient-primary text-primary-foreground" : ""}`}
                >
                  <MessageCircleQuestion className="w-4 h-4 mr-1" /> Minhas Dúvidas
                  {unreadDoubts > 0 && (
                    <Badge className="ml-1.5 h-5 min-w-5 px-1 bg-destructive text-destructive-foreground">
                      {unreadDoubts}
                    </Badge>
                  )}
                </Button>
              </Link>
            )}
            {isAdmin && (
              <Link to="/admin">
                <Button
                  variant={location.pathname === "/admin" ? "default" : "ghost"}
                  size="sm"
                  className={`relative ${location.pathname === "/admin" ? "gradient-primary text-primary-foreground" : ""}`}
                >
                  <Shield className="w-4 h-4 mr-1" /> Admin
                  {pendingDoubts > 0 && (
                    <Badge className="ml-1.5 h-5 min-w-5 px-1 bg-destructive text-destructive-foreground">
                      {pendingDoubts}
                    </Badge>
                  )}
                </Button>
              </Link>
            )}
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-1" /> Sair
            </Button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
