import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Briefcase, Settings, LogOut, User, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useSession } from '@/components/SessionContextProvider'; // Caminho corrigido
import { supabase } from '@/integrations/supabase/client'; // Caminho corrigido
import { showError, showSuccess } from '@/utils/toast';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from '@/hooks/use-mobile';

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  requiresAuth?: boolean;
}

const navItems: NavItem[] = [
  { to: '/', icon: Home, label: 'Início' },
  { to: '/profile', icon: User, label: 'Perfil', requiresAuth: true },
  { to: '/companies', icon: Building2, label: 'Empresas', requiresAuth: true },
  { to: '/jobs', icon: Briefcase, label: 'Vagas', requiresAuth: true },
  { to: '/settings', icon: Settings, label: 'Configurações', requiresAuth: true },
];

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { session, isLoading: isSessionLoading } = useSession();
  const isAuthenticated = !!session;
  const isMobile = useIsMobile();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      showSuccess('Você foi desconectado com sucesso!');
    } catch (error: any) {
      showError(`Erro ao desconectar: ${error.message}`);
    }
  };

  const filteredNavItems = navItems.filter(item => !item.requiresAuth || isAuthenticated);

  return (
    <aside className="flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border shadow-md">
      <div className="p-4 border-b border-sidebar-border">
        <h1 className="text-2xl font-bold text-sidebar-primary">Sollux</h1>
      </div>

      {/* Navegação */}
      <nav className="space-y-2 flex-1 px-2 pt-4">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.to) && item.to !== '/';
          const isHomeActive = location.pathname === '/' && item.to === '/';
          const activeClass = (isActive && item.to !== '/') || isHomeActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground';

          return (
            <Tooltip key={item.to}>
              <TooltipTrigger asChild>
                <Link
                  to={item.to}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    activeClass,
                    isMobile ? 'justify-center' : ''
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {!isMobile && item.label}
                </Link>
              </TooltipTrigger>
              {isMobile && <TooltipContent side="right">{item.label}</TooltipContent>}
            </Tooltip>
          );
        })}
      </nav>

      {/* Rodapé da barra lateral (Logout) */}
      <div className="p-4 border-t border-sidebar-border">
        {isAuthenticated && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                onClick={handleLogout}
                className={cn(
                  'w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors',
                  isMobile ? 'justify-center' : ''
                )}
                disabled={isSessionLoading}
              >
                <LogOut className="h-5 w-5" />
                {!isMobile && 'Sair'}
              </Button>
            </TooltipTrigger>
            {isMobile && <TooltipContent side="right">Sair</TooltipContent>}
          </Tooltip>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;