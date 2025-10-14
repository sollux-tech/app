import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { HeartPulse, TrendingUp, Activity, Bell, Settings, Search, Briefcase, Users, Calendar } from 'lucide-react'; 
import FeatureCard from '@/components/FeatureCard';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PulseInformative } from '@/types/pulseInformative';
import { Job } from '@/types/job';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useCompany } from '@/components/CompanyContext';

const PulsePage: React.FC = () => {
  const { selectedCompany } = useCompany();
  const today = format(new Date(), 'yyyy-MM-dd');
  const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');

  // Query para o informativo do dia
  const { data: informativeToday, isLoading: isLoadingInformative, error: errorInformative } = useQuery<PulseInformative | null, Error>({
    queryKey: ['pulseInformativeToday', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pulse_informatives')
        .select('*')
        .eq('publication_date', today)
        .single(); 
      
      if (error && error.code !== 'PGRST116') { 
        throw error;
      }
      return data || null;
    },
  });

  // Query para vagas publicadas nos últimos 30 dias
  const { data: recentJobs, isLoading: isLoadingJobs } = useQuery<Job[], Error>({
    queryKey: ['recentJobs', selectedCompany?.id, thirtyDaysAgo],
    queryFn: async () => {
      if (!selectedCompany) return [];
      
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('company_id', selectedCompany.id)
        .gte('created_at', `${thirtyDaysAgo}T00:00:00.000Z`)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompany,
  });

  // Calcular estatísticas
  const totalJobs = recentJobs?.length || 0;
  const activeJobs = recentJobs?.filter(job => job.status === 'active').length || 0;
  const inactiveJobs = totalJobs - activeJobs;
  const avgSalary = recentJobs?.reduce((sum, job) => {
    if (job.salary_min && job.salary_max) {
      return sum + ((job.salary_min + job.salary_max) / 2);
    }
    return sum;
  }, 0) / totalJobs || 0;

  return (
    <div className="space-y-6">
      {/* Informativo PULSE do Dia */}
      <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sollux-black uppercase font-bold">Informativo PULSE do Dia</CardTitle>
          <Link to="/core/pulse-informatives">
            <Button variant="outline" size="sm" className="rounded-lg text-sollux-black border-sollux-gray hover:bg-gray-100">
              Ver Todos
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {isLoadingInformative ? (
            <p className="text-gray-600 text-center">Carregando informativo...</p>
          ) : errorInformative ? (
            <p className="text-red-600 text-center">Erro ao carregar informativo: {errorInformative.message}</p>
          ) : informativeToday ? (
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-sollux-red">{informativeToday.title}</h3>
              <p className="text-sm text-gray-500">
                Publicado em: {informativeToday.publication_date ? format(new Date(informativeToday.publication_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}
              </p>
              <div className="prose max-w-none text-sollux-black" dangerouslySetInnerHTML={{ __html: informativeToday.content }} />
              <div className="mt-4 text-right">
                <Link to={`/informative/${informativeToday.id}`}>
                  <Button variant="link" className="text-sollux-red hover:underline">
                    Ler na íntegra
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-gray-600 text-center">Nenhum informativo PULSE publicado para hoje.</p>
          )}
        </CardContent>
      </Card>

      {/* Dashboard de Vagas Publicadas */}
      <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sollux-black uppercase font-bold">Dashboard de Vagas Publicadas</CardTitle>
            <CardDescription>
              {selectedCompany ? `Últimos 30 dias - ${selectedCompany.name}` : 'Selecione uma empresa para ver as estatísticas'}
            </CardDescription>
          </div>
          {selectedCompany && (
            <Link to="/connect/jobs">
              <Button variant="outline" size="sm" className="rounded-lg text-sollux-black border-sollux-gray hover:bg-gray-100">
                Gerenciar Vagas
              </Button>
            </Link>
          )}
        </CardHeader>
        <CardContent>
          {!selectedCompany ? (
            <p className="text-center text-gray-500 py-8">Por favor, selecione uma empresa na barra lateral para ver as estatísticas de vagas.</p>
          ) : isLoadingJobs ? (
            <p className="text-center text-gray-600">Carregando estatísticas...</p>
          ) : (
            <div className="space-y-6">
              {/* Estatísticas Principais */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Total de Vagas</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-900">{totalJobs}</div>
                  <p className="text-xs text-blue-700">Últimos 30 dias</p>
                </div>
                
                <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-green-900">Vagas Ativas</span>
                  </div>
                  <div className="text-2xl font-bold text-green-900">{activeJobs}</div>
                  <p className="text-xs text-green-700">Disponíveis para candidatos</p>
                </div>
                
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-5 w-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">Vagas Inativas</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{inactiveJobs}</div>
                  <p className="text-xs text-gray-700">Pausadas ou encerradas</p>
                </div>
                
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-medium text-purple-900">Média Salarial</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-900">
                    {avgSalary > 0 ? `R$ ${avgSalary.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}` : 'N/A'}
                  </div>
                  <p className="text-xs text-purple-700">Baseado nas vagas publicadas</p>
                </div>
              </div>

              {/* Vagas Recentes */}
              {recentJobs && recentJobs.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-sollux-black mb-4">Vagas Recentes</h4>
                  <div className="space-y-3">
                    {recentJobs.slice(0, 5).map((job) => (
                      <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex-1">
                          <h5 className="font-medium text-sollux-black">{job.title}</h5>
                          <p className="text-sm text-gray-600">
                            {format(new Date(job.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            job.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {job.status === 'active' ? 'Ativa' : 'Inativa'}
                          </span>
                          <Link to={`/jobs/${job.id}`}>
                            <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50 rounded-lg">
                              Ver
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                  {recentJobs.length > 5 && (
                    <div className="text-center mt-4">
                      <Link to="/connect/jobs">
                        <Button variant="outline" className="text-sollux-black border-sollux-gray hover:bg-gray-100">
                          Ver todas as vagas
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"> {/* Ajustado para 3 colunas */}
        <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-sollux-black uppercase">Status Geral</CardTitle>
            <span className="text-gray-500 text-lg">...</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Operacional</div>
            <p className="text-xs text-gray-500">+10% desde o mês passado</p>
          </CardContent>
        </Card>
        
        <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-sollux-black uppercase">Alertas Ativos</CardTitle>
            <span className="text-gray-500 text-lg">...</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-sollux-red">2</div>
            <p className="text-xs text-gray-500">Críticos: 1, Advertências: 1</p>
          </CardContent>
        </Card>
        
        <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-sollux-black uppercase">Uptime Médio</CardTitle>
            <span className="text-gray-500 text-lg">...</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-sollux-black">99.9%</div>
            <p className="text-xs text-gray-500">Últimos 30 dias</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content - Visão Geral do PULSE */}
      <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sollux-black uppercase font-bold">Visão Geral do PULSE</CardTitle>
          <span className="text-gray-500 text-lg">...</span>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FeatureCard
              title="Monitoramento de Desempenho"
              description="Visualize gráficos e dados de desempenho em tempo real."
              icon={TrendingUp}
              onClick={() => alert('Monitoramento de Desempenho em breve!')}
            />
            <FeatureCard
              title="Gerenciamento de Incidentes"
              description="Acompanhe e resolva incidentes rapidamente."
              icon={Bell}
              onClick={() => alert('Gerenciamento de Incidentes em breve!')}
            />
            <FeatureCard
              title="Logs de Atividade"
              description="Analise os logs para identificar padrões e problemas."
              icon={Activity}
              onClick={() => alert('Logs de Atividade em breve!')}
            />
            <FeatureCard
              title="Configurações de Alerta"
              description="Personalize as notificações e limiares de alerta."
              icon={Settings}
              onClick={() => alert('Configurações de Alerta em breve!')}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PulsePage;