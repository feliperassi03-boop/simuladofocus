import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { BookOpen, LogOut, Shield, GraduationCap, History, FileText } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, signOut } = useAuth();
  const location = useLocation();

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

          <nav className="flex items-center gap-2">
            <Link to="/provas">
              <Button
                variant={location.pathname === "/provas" ? "default" : "ghost"}
                size="sm"
                className={location.pathname === "/provas" ? "gradient-primary text-primary-foreground" : ""}
              >
                <FileText className="w-4 h-4 mr-1" /> Provas
              </Button>
            </Link>
            <Link to="/historico">
              <Button
                variant={location.pathname === "/historico" ? "default" : "ghost"}
                size="sm"
                className={location.pathname === "/historico" ? "gradient-primary text-primary-foreground" : ""}
              >
                <History className="w-4 h-4 mr-1" /> Histórico
              </Button>
            </Link>
            {isAdmin && (
              <Link to="/admin">
                <Button
                  variant={location.pathname === "/admin" ? "default" : "ghost"}
                  size="sm"
                  className={location.pathname === "/admin" ? "gradient-primary text-primary-foreground" : ""}
                >
                  <Shield className="w-4 h-4 mr-1" /> Admin
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
