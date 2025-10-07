import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Briefcase, Settings, LogOut, User, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession } from './SessionContextProvider';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user, isLoading: isSessionLoading } = useSession();

  const { data: userProfile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError('Erro ao fazer logout: ' + error.message);
    } else {
      showSuccess('Logout realizado com sucesso!');
    }
  };

  const navItems = [
    { to: '/', icon: Home, label: 'Início' },
    { to: '/companies', icon: Building2, label: 'Empresas' },
    { to: '/settings', icon: Settings, label: 'Configurações' },
  ];

  const firstName = userProfile?.first_name;
  const avatarUrl = userProfile?.avatar_url;
  const fallbackInitials = (firstName ? firstName[0] : user?.email?.[0] || 'U').toUpperCase();

  return (
    <div className="w-64 bg-sollux-sidebar-bg text-sollux-black flex flex-col h-full border-r border-sollux-card-border shadow-lg">
      <div className="p-4 border-b border-sollux-card-border flex items-center justify-center">
        <img src="/logo.png" alt="Sollux Logo" className="h-10" />
      </div>

      {/* Informações do Usuário */}
      {user && (
        <div className="p-4 flex items-center space-x-3 border-b border-sollux-card-border">
          <Avatar className="h-9 w-9">
            <AvatarImage src={avatarUrl || undefined} alt={firstName || "User"} />
            <AvatarFallback>{fallbackInitials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-sollux-black">
              Olá, {firstName || 'Usuário'}
            </span>
            <span className="text-xs text-sollux-gray-text">
              {user.email}
            </span>
          </div>
        </div>
      )}

      {/* Navegação */}
      <nav className="space-y-2 flex-1 px-2 pt-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.to) && item.to !== '/';
          const isHomeActive = location.pathname === '/' && item.to === '/';

          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-sollux-hover-bg ${
                (isActive || isHomeActive) ? 'bg-sollux-red text-white hover:bg-sollux-orange' : 'text-sollux-black'
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Botão de Logout */}
      <div className="p-4 border-t border-sollux-card-border">
        <Button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sollux-black transition-all hover:bg-sollux-hover-bg"
          variant="ghost"
        >
          <LogOut className="h-5 w-5" />
          Sair
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;