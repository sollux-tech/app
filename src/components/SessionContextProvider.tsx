import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { Profile } from '@/types/profile';

interface SessionContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  refetchProfile: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchUserProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao buscar perfil do usuário:', error);
      setProfile(null);
    } else {
      setProfile(data || null);
    }
  }, []);

  const refetchProfile = useCallback(async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser?.id) {
      await fetchUserProfile(currentUser.id);
    }
  }, [fetchUserProfile]);

  useEffect(() => {
    let mounted = true;

    const initializeSession = async () => {
      try {
        console.log("SessionContextProvider: Iniciando verificação de sessão...");
        setIsLoading(true);

        // Verifica a sessão atual explicitamente
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("SessionContextProvider: Erro ao obter sessão inicial:", sessionError);
          if (mounted) setIsLoading(false);
          return;
        }

        if (mounted) {
          if (initialSession) {
            console.log("SessionContextProvider: Sessão inicial encontrada para:", initialSession.user.email);
            setSession(initialSession);
            setUser(initialSession.user);
            await fetchUserProfile(initialSession.user.id);
          } else {
            console.log("SessionContextProvider: Nenhuma sessão inicial encontrada.");
            setSession(null);
            setUser(null);
            setProfile(null);
          }
          setIsLoading(false);
        }
      } catch (error) {
        console.error("SessionContextProvider: Erro inesperado na inicialização:", error);
        if (mounted) setIsLoading(false);
      }
    };

    initializeSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`SessionContextProvider: Evento de Auth disparado: ${event}`);

      if (mounted) {
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          console.log("SessionContextProvider: Atualizando perfil para usuário:", currentUser.email);
          await fetchUserProfile(currentUser.id);
        } else {
          console.log("SessionContextProvider: Usuário desconectado, limpando perfil.");
          setProfile(null);
        }

        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  useEffect(() => {
    // This effect handles navigation based on session state.
    // It waits until the initial loading is complete.
    if (isLoading) {
      return;
    }

    const isPublicInformativePage = location.pathname.startsWith('/informative/');
    const isPublicJobPage = location.pathname.startsWith('/jobs/');
    const isPublicFormPage = location.pathname.startsWith('/form/');
    const isPublicDiagnosticResultsPage = location.pathname.startsWith('/ops/flow/diagnostic-results/');
    const isLoginPage = location.pathname === '/login';

    const isPublicPage = isPublicInformativePage || isPublicJobPage || isPublicFormPage || isPublicDiagnosticResultsPage;

    if (!session && !isLoginPage && !isPublicPage) {
      // If no session, not on login, and not on a public page, redirect to login.
      navigate('/login', { replace: true });
    } else if (session && isLoginPage) {
      // If there is a session and user is on the login page, redirect to home.
      navigate('/', { replace: true });
    }
  }, [session, isLoading, navigate, location.pathname]);

  return (
    <SessionContext.Provider value={{ session, user, profile, isLoading, refetchProfile }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionContextProvider');
  }
  return context;
};