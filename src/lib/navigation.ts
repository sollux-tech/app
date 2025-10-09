import { Home } from 'lucide-react';

interface RouteInfo {
  name: string;
  parent?: string;
  icon?: React.ComponentType<any>;
}

export const routeMap: Record<string, RouteInfo> = {
  '/pulse': { name: 'Pulse', icon: Home },
  '/id': { name: 'ID' },
  '/id/companies': { name: 'Gerenciar Empresas', parent: '/id' },
  '/id/users': { name: 'Gerenciar Perfil', parent: '/id' },
  '/connect': { name: 'Connect' },
  '/ops': { name: 'OPS' },
  '/core': { name: 'Core' },
  '/core/user-types': { name: 'Tipos de Usuário', parent: '/core' },
  '/core/pulse-informatives': { name: 'Informativos PULSE', parent: '/core' },
  '/core/pulse-informatives/new': { name: 'Novo Informativo', parent: '/core/pulse-informatives' },
  '/core/global-settings': { name: 'Configurações Globais', parent: '/core' },
  '/core/sidebar-settings': { name: 'Config. da Barra Lateral', parent: '/core' },
  '/core/notifications': { name: 'Notificações', parent: '/core' },
};

// Adiciona rotas dinâmicas que não estão no mapa estático
export const getDynamicRouteInfo = (path: string): RouteInfo | null => {
  const informativeEditMatch = path.match(/^\/core\/pulse-informatives\/([^/]+)$/);
  if (informativeEditMatch && informativeEditMatch[1] !== 'new') {
    return { name: 'Editar Informativo', parent: '/core/pulse-informatives' };
  }
  return null;
};