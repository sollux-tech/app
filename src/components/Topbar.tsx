import React, { useState, useEffect, useMemo } from 'react';
import { Menu, Bell, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import Sidebar from './Sidebar';
import { useCompany } from './CompanyContext';
import { cn } from '@/lib/utils';
import { useLocation } from 'react-router-dom';
import { useSession } from './SessionContextProvider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Notification } from '@/types/notification';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TopbarProps {
  className?: string;
}

interface UserNotification extends Notification {
  is_read: boolean;
}

const Topbar: React.FC<TopbarProps> = ({ className }) => {
  const isMobile = useIsMobile();
  const { selectedCompany } = useCompany();
  const { user, profile } = useSession();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const location = useLocation();
  const queryClient = useQueryClient();

  const { data: notifications } = useQuery<Notification[], Error>({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: readNotifications } = useQuery<{ notification_id: string }[], Error>({
    queryKey: ['notification_reads', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('notification_reads')
        .select('notification_id')
        .eq('user_id', user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    const channel = supabase.channel('public:notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => {
        queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user?.id]);

  const userNotifications = useMemo((): UserNotification[] => {
    if (!notifications || !user) return [];
    const readIds = new Set(readNotifications?.map(r => r.notification_id));
    
    return notifications
      .filter(notification => {
        if (notification.target_type === 'all') return true;
        if (notification.target_type === 'users' && notification.target_user_ids?.includes(user.id)) return true;
        if (notification.target_type === 'companies' && selectedCompany && notification.target_company_ids?.includes(selectedCompany.id)) return true;
        return false;
      })
      .map(notification => ({
        ...notification,
        is_read: readIds.has(notification.id),
      }));
  }, [notifications, user, selectedCompany, readNotifications]);

  const unreadCount = useMemo(() => {
    return userNotifications.filter(n => !n.is_read).length;
  }, [userNotifications]);

  const markNotificationsAsRead = async () => {
    const unreadIds = userNotifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0 || !user) return;

    const recordsToInsert = unreadIds.map(id => ({
      notification_id: id,
      user_id: user.id,
    }));

    const { error } = await supabase.from('notification_reads').insert(recordsToInsert);
    if (error) {
      console.error("Erro ao marcar notificações como lidas:", error);
    } else {
      queryClient.invalidateQueries({ queryKey: ['notification_reads', user?.id] });
    }
  };

  useEffect(() => {
    if (isPopoverOpen) {
      markNotificationsAsRead();
    }
  }, [isPopoverOpen]);

  const getPageTitle = () => {
    if (location.pathname.startsWith('/core/pulse-informatives/new')) return 'CORE | NOVO INFORMATIVO';
    if (location.pathname.startsWith('/core/pulse-informatives/') && location.pathname !== '/core/pulse-informatives') return 'CORE | EDITAR INFORMATIVO';
    if (location.pathname.startsWith('/informative/')) return 'INFORMATIVO PÚBLICO';
    switch (location.pathname) {
      case '/pulse': return 'PULSE';
      case '/id': return 'ID';
      case '/id/companies': return 'ID | EMPRESAS';
      case '/id/users': return 'ID | USUÁRIOS';
      case '/connect': return 'CONNECT';
      case '/ops': return 'OPS';
      case '/core': return 'CORE';
      case '/core/user-types': return 'CORE | TIPOS DE USUÁRIO';
      case '/core/pulse-informatives': return 'CORE | INFORMATIVOS PULSE';
      case '/core/global-settings': return 'CORE | CONFIGURAÇÕES GLOBAIS';
      case '/core/sidebar-settings': return 'CORE | CONFIG. BARRA LATERAL';
      case '/core/notifications': return 'CORE | NOTIFICAÇÕES';
      default: return 'DASHBOARD';
    }
  };

  return (
    <header className={cn("fixed top-0 right-0 h-16 bg-white border-b border-gray-200 shadow-sm z-50", className)}>
      <div className="h-full px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {isMobile && (
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-gray-600">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 bg-sollux-dark-gray border-r-0">
                <Sidebar isMobileSheet={true} onLinkClick={() => setIsSheetOpen(false)} />
              </SheetContent>
            </Sheet>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xl font-semibold text-sollux-black">SOLLUX FLOW</span>
            <span className="text-xl font-semibold text-sollux-red">| {getPageTitle()}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative text-gray-600 hover:bg-gray-100 rounded-lg">
                {unreadCount > 0 && (
                  <div className="w-3 h-3 bg-sollux-red rounded-full absolute -top-1 -right-1 border-2 border-white"></div>
                )}
                <Bell className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 mt-2 bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg border border-sollux-card-border">
              <div className="p-2">
                <h4 className="font-medium leading-none mb-4 text-sollux-black">Notificações</h4>
                {userNotifications.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {userNotifications.map(notification => (
                      <div key={notification.id} className={cn(
                        "p-3 rounded-lg border border-gray-200 bg-white/50 transition-opacity",
                        notification.is_read && "opacity-60"
                      )}>
                        <p className="font-semibold text-sollux-black">{notification.title}</p>
                        <p className="text-sm text-gray-700">{notification.message}</p>
                        <p className="text-xs text-gray-500 mt-1 text-right">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">Nenhuma notificação nova.</p>
                )}
              </div>
            </PopoverContent>
          </Popover>
          <div className="flex items-center gap-2 bg-gray-100 p-2 rounded-full pr-4">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-gray-600" />
            </div>
            <span className="text-sm font-medium text-sollux-black hidden md:block">
              Olá, {profile?.first_name || 'Usuário'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;