import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Profile {
  id: string;
  email: string;
  full_name: string;
  username: string | null;
  category: "engemase_employee" | "third_party" | "socios";
  role: "admin" | "employee" | "third_party";
  approved: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, category: "engemase_employee" | "third_party" | "socios") => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async (userId: string) => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        if (data && isMounted) {
          const profileData = data as unknown as Profile;
          setProfile({
            ...profileData,
            approved: (data as any).approved ?? true,
          });
        }
      } catch {
        // Profile fetch failed silently
      }
    };

    // Listener for ONGOING auth changes (does NOT control loading)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (!isMounted) return;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          setTimeout(() => {
            if (isMounted) fetchProfile(currentSession.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    // INITIAL load (controls loading state)
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!isMounted) return;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          await fetchProfile(currentSession.user.id);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (username: string, password: string) => {
    try {
      // Use secure function to get email from username
      const { data: email, error: lookupError } = await supabase
        .rpc("get_email_from_username", { _username: username });

      if (lookupError || !email) {
        return { error: { message: "Usuário não encontrado" } };
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password,
      });
      return { error };
    } catch (err) {
      return { error: { message: "Erro ao fazer login" } };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    category: "engemase_employee" | "third_party" | "socios"
  ) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          category: category,
          role: category === "engemase_employee" ? "employee" : "third_party",
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
