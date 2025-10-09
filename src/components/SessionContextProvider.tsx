import React, { useState, useEffect, createContext, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
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

  const fetchUserProfile = async (userId: string) => {
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
  };

  const refetchProfile = async () => {
    if (user?.id) {
      await fetchUserProfile(user.id);
    }
  };

  useEffect(() => {
    const initializeSession = async () => {
      setIsLoading(true);
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        setSession(initialSession);
        const currentUser = initialSession?.user || null;
        setUser(currentUser);
        if (currentUser) {
          await fetchUserProfile(currentUser.id);
        }
        
        if (!initialSession && window.location.pathname !== '/login') {
          navigate('/login');
        } else if (initialSession && window.location.pathname === '/login') {
          navigate('/');
        }
      } catch (error) {
        console.error("Erro ao inicializar a sessão:", error);
        setSession(null);
        setUser(null);
        setProfile(null);
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    };

    initializeSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setIsLoading(true);
      try {
        setSession(currentSession);
        const currentUser = currentSession?.user || null;
        setUser(currentUser);
        
        if (currentUser) {
          await fetchUserProfile(currentUser.id);
        } else {
          setProfile(null);
        }

        if (event === 'SIGNED_OUT') {
          navigate('/login');
        } else if (event === 'SIGNED_IN' && window.location.pathname === '/login') {
          navigate('/');
        }
      } catch (error) {
        console.error("Erro na mudança de estado de autenticação:", error);
      } finally {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

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