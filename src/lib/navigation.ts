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
  '/id/sharing': { name: 'Compartilhamento', parent: '/id' },
  '/connect': { name: 'Connect' },
  '/connect/jobs': { name: 'Gerenciar Vagas', parent: '/connect' },
  '/connect/jobs/new': { name: 'Nova Vaga', parent: '/connect/jobs' },
  '/ops': { name: 'OPS' },
  '/core': { name: 'Core' },
  '/core/user-types': { name: 'Tipos de Usuário', parent: '/core' },
  '/core/pulse-informatives': { name: 'Informativos PULSE', parent: '/core' },
  '/core/pulse-informatives/new': { name: 'Novo Informativo', parent: '/core/pulse-informatives' },
  '/core/global-settings': { name: 'Configurações Globais', parent: '/core' },
  '/core/global-settings/job-sectors': { name: 'Jobs - Áreas/Setores', parent: '/core/global-settings' },
  '/core/global-settings/contract-types': { name: 'Jobs - Tipos de Contrato', parent: '/core/global-settings' },
  '/core/global-settings/work-models': { name: 'Jobs - Modelos de Trabalho', parent: '/core/global-settings' },
  '/core/sidebar-settings': { name: 'Config. da Barra Lateral', parent: '/core/global-settings' },
  '/core/notifications': { name: 'Notificações', parent: '/core' },
  '/core/all-companies': { name: 'Todas as Empresas', parent: '/core' },
  '/core/data-doctor': { name: 'Diagnóstico de Dados', parent: '/core' },
};

// Adiciona rotas dinâmicas que não estão no mapa estático
export const getDynamicRouteInfo = (path: string): RouteInfo | null => {
  const informativeEditMatch = path.match(/^\/core\/pulse-informatives\/([^/]+)$/);
  if (informativeEditMatch && informativeEditMatch[1] !== 'new') {
    return { name: 'Editar Informativo', parent: '/core/pulse-informatives' };
  }

  const jobEditMatch = path.match(/^\/connect\/jobs\/([^/]+)$/);
  if (jobEditMatch && jobEditMatch[1] !== 'new') {
    return { name: 'Editar Vaga', parent: '/connect/jobs' };
  }

  return null;
};