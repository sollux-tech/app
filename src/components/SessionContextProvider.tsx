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
    // Set loading to true initially. The listener below will set it to false
    // once the initial session is fetched.
    setIsLoading(true);

    // The onAuthStateChange listener is the single source of truth.
    // It fires immediately with the current session, so we don't need a separate getSession() call.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await fetchUserProfile(currentUser.id);
      } else {
        setProfile(null);
      }
      
      // This is crucial. The listener runs once on load, and then on subsequent changes.
      // We set loading to false after the first check is complete.
      setIsLoading(false);
    });

    return () => {
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
    const isLoginPage = location.pathname === '/login';

    if (!session && !isLoginPage && !isPublicInformativePage) {
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