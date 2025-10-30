import { Home, ListChecks, ListTodo, Blocks, Scale, Target, Store, FileText, Tag, ClipboardCheck, Brain, ClipboardList, MessageSquareText, Award, TrendingUp, ShoppingBag, Lightbulb, Ruler } from 'lucide-react';

interface RouteInfo {
  name: string;
  parent?: string;
  icon?: React.ComponentType<any>;
}

export const routeMap: Record<string, RouteInfo> = {
  '/pulse': { name: 'Pulse', icon: Home },
  '/pulse/informatives': { name: 'Todos os Informativos', parent: '/pulse' },
  '/id': { name: 'ID' },
  '/id/companies': { name: 'Gerenciar Empresas', parent: '/id' },
  '/id/companies/new': { name: 'Nova Empresa', parent: '/id/companies' },
  '/id/companies/:id': { name: 'Editar Empresa', parent: '/id/companies' },
  '/id/users': { name: 'Gerenciar Perfil', parent: '/id' },
  '/id/sharing': { name: 'Compartilhamento', parent: '/id' },
  '/id/documents': { name: 'Documentos', parent: '/id', icon: FileText },
  '/connect': { name: 'Connect' },
  '/connect/jobs': { name: 'Gerenciar Vagas', parent: '/connect' },
  '/connect/jobs/new': { name: 'Nova Vaga', parent: '/connect/jobs' },
  '/connect/forms': { name: 'Formulários', parent: '/connect' },
  '/connect/forms/new': { name: 'Novo Formulário', parent: '/connect/forms' },
  '/connect/calc': { name: 'SOLLUX CALC™', parent: '/connect' },
  '/ops': { name: 'OPS' },
  '/ops/insight': { name: 'SOLLUX INSIGHT™', parent: '/ops', icon: Brain },
  '/ops/diagnostics': { name: 'Gerenciar Diagnósticos', parent: '/ops/insight', icon: ClipboardCheck },
  '/ops/insight/questionnaires': { name: 'Gerenciar Perguntas do Diagnóstico', parent: '/ops/insight', icon: ClipboardList },
  '/ops/insight/answer-questionnaire': { name: 'Responder Questionário', parent: '/ops/insight', icon: MessageSquareText }, 
  '/ops/insight/evaluation': { name: 'Avaliação do Diagnóstico', parent: '/ops/insight', icon: Award },
  '/ops/flow': { name: 'SOLLUX FLOW™', parent: '/ops', icon: TrendingUp },
  '/ops/flow/diagnostic-results/:id': { name: 'Resultados do Diagnóstico', parent: '/ops/flow' }, // Nova rota
  '/core': { name: 'Core' },
  '/core/user-types': { name: 'Tipos de Usuário', parent: '/core' },
  '/core/pulse-informatives': { name: 'Informativos PULSE', parent: '/core' },
  '/core/pulse-informatives/new': { name: 'Novo Informativo', parent: '/core/pulse-informatives' },
  '/core/pulse-informatives/:id': { name: 'Editar Informativo', parent: '/core/pulse-informatives' },
  '/informative/:id': { name: 'Informativo Público', parent: '/pulse' }, // Rota pública
  '/core/global-settings': { name: 'Configurações Globais', parent: '/core' },
  '/core/global-settings/jobs': { name: 'Configurações de Vagas', parent: '/core/global-settings' },
  '/core/global-settings/job-sectors': { name: 'Jobs - Áreas/Setores', parent: '/core/global-settings/jobs' },
  '/core/global-settings/contract-types': { name: 'Jobs - Tipos de Contrato', parent: '/core/global-settings/jobs' },
  '/core/global-settings/work-models': { name: 'Jobs - Modelos de Trabalho', parent: '/core/global-settings/jobs' },
  '/core/global-settings/ops': { name: 'Configurações do OPS', parent: '/core/global-settings' },
  '/core/global-settings/ops/pillar-types': { name: 'OPS - Tipos de Pilares', parent: '/core/global-settings/ops', icon: ListChecks },
  '/core/global-settings/ops/pillars': { name: 'OPS - Pilares', parent: '/core/global-settings/ops', icon: ListTodo },
  '/core/global-settings/ops/pillar-blocks': { name: 'OPS - Blocos dos Pilares', parent: '/core/global-settings/ops', icon: Blocks },
  '/core/global-settings/ops/scoring-scale': { name: 'OPS - Régua de Pontuação', parent: '/core/global-settings/ops', icon: Scale },
  '/core/global-settings/ops/kpis': { name: 'OPS - KPIs de Diagnóstico', parent: '/core/global-settings/ops', icon: Target },
  '/core/global-settings/ops/tags': { name: 'OPS - Tags', parent: '/core/global-settings/ops', icon: Tag },
  '/core/global-settings/ops/diagnostic-statuses': { name: 'OPS - Status do Diagnósticos', parent: '/core/global-settings/ops', icon: ClipboardCheck },
  '/core/global-settings/ops/classification-scale': { name: 'OPS - Régua de Classificação', parent: '/core/global-settings/ops', icon: Award },
  '/core/global-settings/ops/kpi-smart-types': { name: 'OPS - Tipo KPI Smart', parent: '/core/global-settings/ops', icon: Lightbulb },
  '/core/global-settings/ops/kpi-smart-units': { name: 'OPS - Unidades de Medida KPI Smart', parent: '/core/global-settings/ops', icon: Ruler }, // Nova rota
  '/core/sidebar-settings': { name: 'Config. da Barra Lateral', parent: '/core/global-settings' },
  '/core/notifications': { name: 'Notificações', parent: '/core' },
  '/core/all-companies': { name: 'Todas as Empresas', parent: '/core' },
  '/core/data-doctor': { name: 'Diagnóstico de Dados', parent: '/core' },
  '/core/markets': { name: 'Gerenciar Mercados', parent: '/core', icon: Store },
  '/core/documents': { name: 'Documentos', parent: '/core', icon: FileText },
  '/shop': { name: 'SHOP', icon: ShoppingBag }, // Nova rota para ShopPage
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

  const companyEditMatch = path.match(/^\/id\/companies\/([^/]+)$/);
  if (companyEditMatch && companyEditMatch[1] !== 'new') {
    return { name: 'Editar Empresa', parent: '/id/companies' };
  }

  // Rotas dinâmicas para formulários
  const formEditMatch = path.match(/^\/connect\/forms\/([^/]+)\/edit$/);
  if (formEditMatch) {
    return { name: 'Editar Formulário', parent: '/connect/forms' };
  }

  const formResponsesMatch = path.match(/^\/connect\/forms\/([^/]+)\/responses$/);
  if (formResponsesMatch) {
    return { name: 'Respostas', parent: '/connect/forms' };
  }

  const diagnosticResultsMatch = path.match(/^\/ops\/flow\/diagnostic-results\/([^/]+)$/);
  if (diagnosticResultsMatch) {
    return { name: 'Resultados do Diagnóstico', parent: '/ops/flow' };
  }

  return null;
};