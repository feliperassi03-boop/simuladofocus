import { createContext, useContext, useEffect, useState, ReactNode, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY_PREFIX = "app_session_id_";
const HEARTBEAT_MS = 30_000;

function getLocalSessionId(userId: string): string | null {
  return localStorage.getItem(SESSION_KEY_PREFIX + userId);
}
function setLocalSessionId(userId: string, sid: string) {
  localStorage.setItem(SESSION_KEY_PREFIX + userId, sid);
}
function clearLocalSessionId(userId: string) {
  localStorage.removeItem(SESSION_KEY_PREFIX + userId);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);
  const heartbeatRef = useRef<number | null>(null);
  const kickedRef = useRef(false);

  const checkAdmin = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
    } catch (error) {
      console.error("Error checking admin role:", error);
      setIsAdmin(false);
    } finally {
      setAdminChecked(true);
    }
  };

  const forceLogoutOtherDevice = async (userId: string) => {
    if (kickedRef.current) return;
    kickedRef.current = true;
    clearLocalSessionId(userId);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("signOut error", e);
    }
    toast({
      title: "Sessão encerrada",
      description:
        "Sua sessão foi encerrada porque sua conta foi acessada em outro dispositivo. Se você não reconhece este acesso, altere sua senha imediatamente.",
      variant: "destructive",
    });
    if (window.location.hash !== "#/auth") {
      window.location.hash = "#/auth";
    }
  };

  const verifySession = async (userId: string) => {
    const local = getLocalSessionId(userId);
    if (!local) return;
    const { data, error } = await supabase
      .from("user_sessions")
      .select("active_session_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      console.error("verifySession error", error);
      return;
    }
    if (!data) return;
    if (data.active_session_id !== local) {
      await forceLogoutOtherDevice(userId);
    }
  };

  const startHeartbeat = (userId: string) => {
    stopHeartbeat();
    heartbeatRef.current = window.setInterval(() => {
      verifySession(userId);
    }, HEARTBEAT_MS);
  };

  const stopHeartbeat = () => {
    if (heartbeatRef.current) {
      window.clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  };

  useEffect(() => {
    let mounted = true;

    const handleSession = (newSession: Session | null) => {
      if (!mounted) return;
      setSession((prev) => (prev?.user?.id === newSession?.user?.id ? prev : newSession));
      setUser((prev) => {
        const newUser = newSession?.user ?? null;
        return prev?.id === newUser?.id ? prev : newUser;
      });

      if (newSession?.user) {
        const uid = newSession.user.id;
        kickedRef.current = false;
        setAdminChecked(false);
        setTimeout(() => {
          if (!mounted) return;
          checkAdmin(uid);
          verifySession(uid);
          startHeartbeat(uid);
        }, 0);
      } else {
        stopHeartbeat();
        setIsAdmin(false);
        setAdminChecked(true);
      }
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => handleSession(newSession)
    );

    supabase.auth.getSession().then(({ data: { session } }) => handleSession(session));

    const onVisible = () => {
      if (document.visibilityState === "visible" && user?.id) {
        verifySession(user.id);
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      stopHeartbeat();
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw error;
  };

  const claimSession = async (userId: string) => {
    const sid =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setLocalSessionId(userId, sid);
    const { error } = await supabase
      .from("user_sessions")
      .upsert(
        { user_id: userId, active_session_id: sid, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    if (error) console.error("claimSession error", error);
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.user) {
      kickedRef.current = false;
      await claimSession(data.user.id);
    }
  };

  const signOut = async () => {
    if (user?.id) clearLocalSessionId(user.id);
    stopHeartbeat();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const fullLoading = loading || (!!user && !adminChecked);

  return (
    <AuthContext.Provider value={{ user, session, loading: fullLoading, isAdmin, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
