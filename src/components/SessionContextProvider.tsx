import React, { useState, useEffect, createContext, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Profile } from '@/types/profile'; // Importar o tipo Profile

interface SessionContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null; // Adicionar profile ao contexto
  isLoading: boolean;
  refetchProfile: () => Promise<void>; // Adicionar função para recarregar o perfil
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null); // Estado para o perfil
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const fetchUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error('Erro ao buscar perfil do usuário:', error);
      setProfile(null);
    } else if (data) {
      setProfile(data);
    } else {
      setProfile(null);
    }
  };

  const refetchProfile = async () => {
    if (user?.id) {
      await fetchUserProfile(user.id);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setIsLoading(true);
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        setSession(currentSession);
        setUser(currentSession?.user || null);
        if (currentSession?.user) {
          await fetchUserProfile(currentSession.user.id);
        }
        if (currentSession && window.location.pathname === '/login') {
          navigate('/');
        }
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setProfile(null); // Limpar perfil ao deslogar
        navigate('/login');
      }
      setIsLoading(false);
    });

    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      setIsLoading(true);
      setSession(initialSession);
      setUser(initialSession?.user || null);
      if (initialSession?.user) {
        await fetchUserProfile(initialSession.user.id);
      }
      setIsLoading(false);
      if (!initialSession && window.location.pathname !== '/login') {
        navigate('/login');
      } else if (initialSession && window.location.pathname === '/login') {
        navigate('/');
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