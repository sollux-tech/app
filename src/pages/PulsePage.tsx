import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { HeartPulse, TrendingUp, Activity, Bell, Settings, Search, Briefcase, Users, Calendar, FileText, MessageSquareText, CheckCircle } from 'lucide-react'; 
import FeatureCard from '@/components/FeatureCard';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PulseInformative } from '@/types/pulseInformative';
import { Job } from '@/types/job';
import { Form as FormType } from '@/types/form'; // Importar o tipo Form
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
      try {
        console.log(`PulsePage: Buscando informativo para a data: ${today}`); // Log para depuração
        const { data, error } = await supabase
          .from('pulse_informatives')
          .select('*')
          .eq('publication_date', today)
          .order('created_at', { ascending: false }) // Ordenar por data de criação para pegar o mais recente
          .limit(1); // Limitar a um resultado
        
        if (error) {
          console.error("PulsePage: Erro na consulta de informativo:", error); // Log de erro
          throw error; // Re-lança quaisquer erros reais
        }
        console.log("PulsePage: Dados brutos do informativo:", data); // Log dos dados brutos
        return data.length > 0 ? data[0] : null; // Retorna o primeiro item do array ou null
      } catch (e: any) {
        console.error("PulsePage: Erro inesperado ao buscar informativo:", e); // Log de erro inesperado
        throw e;
      }
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

  // Query para formulários criados nos últimos 30 dias
  const { data: recentForms, isLoading: isLoadingForms } = useQuery<FormType[], Error>({
    queryKey: ['recentForms', selectedCompany?.id, thirtyDaysAgo],
    queryFn: async () => {
      if (!selectedCompany) return [];

      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('company_id', selectedCompany.id)
        .gte('created_at', `${thirtyDaysAgo}T00:00:00.000Z`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompany,
  });

  // Calcular estatísticas de vagas
  const totalJobs = recentJobs?.length || 0;
  const activeJobs = recentJobs?.filter(job => job.status === 'active').length || 0;
  const inactiveJobs = totalJobs - activeJobs;
  const avgSalary = recentJobs?.reduce((sum, job) => {
    if (job.salary_min && job.salary_max) {
      return sum + ((job.salary_min + job.salary_max) / 2);
    }
    return sum;
  }, 0) / totalJobs || 0;

  // Calcular estatísticas de formulários
  const totalForms = recentForms?.length || 0;
  const publishedForms = recentForms?.filter(form => form.status === 'published').length || 0;
  const draftForms = totalForms - publishedForms;
  const totalFormResponses = recentForms?.reduce((sum, form) => sum + (form.response_count || 0), 0) || 0;


  return (
    <div className="space-y-6">
      {/* Informativo PULSE do Dia */}
      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground uppercase font-bold">PULSE do Dia</CardTitle>
          <Link to="/pulse/informatives"> {/* Rota atualizada aqui */}
            <Button variant="outline" size="sm" className="rounded-lg text-foreground border-border hover:bg-accent">
              Ver Todos
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {isLoadingInformative ? (
            <p className="text-muted-foreground text-center">Carregando informativo...</p>
          ) : errorInformative ? (
            <p className="text-destructive text-center">Erro ao carregar informativo: {errorInformative.message}</p>
          ) : informativeToday ? (
            <div className="space-y-4">
              {/* Removido: <h3 className="text-2xl font-bold text-sollux-red">{informativeToday.title}</h3> */}
              {/* Removido: <p className="text-sm text-muted-foreground">
                Publicado em: {informativeToday.publication_date ? format(new Date(informativeToday.publication_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}
              </p> */}
              {informativeToday.short_summary && (
                <div className="prose max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: informativeToday.short_summary }} />
              )}
              <div className="mt-4 text-right">
                <Link to={`/informative/${informativeToday.id}`}>
                  <Button variant="link" className="text-sollux-red hover:underline">
                    Ler na Íntegra
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center">Nenhum informativo PULSE publicado para hoje.</p>
          )}
        </CardContent>
      </Card>

      {/* Dashboard de Vagas Publicadas */}
      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-foreground uppercase font-bold">Dashboard de Vagas Publicadas</CardTitle>
            <CardDescription className="text-muted-foreground">
              {selectedCompany ? `Últimos 30 dias - ${selectedCompany.name}` : 'Selecione uma empresa para ver as estatísticas'}
            </CardDescription>
          </div>
          {selectedCompany && (
            <Link to="/connect/jobs">
              <Button variant="outline" size="sm" className="rounded-lg text-foreground border-border hover:bg-accent">
                Gerenciar Vagas
              </Button>
            </Link>
          )}
        </CardHeader>
        <CardContent>
          {!selectedCompany ? (
            <p className="text-center text-muted-foreground py-8">Por favor, selecione uma empresa na barra lateral para ver as estatísticas de vagas.</p>
          ) : isLoadingJobs ? (
            <p className="text-center text-muted-foreground">Carregando estatísticas...</p>
          ) : (
            <div className="space-y-6">
              {/* Estatísticas Principais */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Total de Vagas</span>
                  </div>
                  <div className="2xl font-bold text-blue-900">{totalJobs}</div>
                  <p className="text-xs text-blue-700">Últimos 30 dias</p>
                </div>
                
                <div className="bg-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-green-900">Vagas Ativas</span>
                  </div>
                  <div className="2xl font-bold text-green-900">{activeJobs}</div>
                  <p className="text-xs text-green-700">Disponíveis para candidatos</p>
                </div>
                
                <div className="bg-muted p-4 rounded-lg border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">Vagas Inativas</span>
                  </div>
                  <div className="2xl font-bold text-foreground">{inactiveJobs}</div>
                  <p className="text-xs text-muted-foreground">Pausadas ou encerradas</p>
                </div>
                
                <div className="bg-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-medium text-purple-900">Média Salarial</span>
                  </div>
                  <div className="2xl font-bold text-purple-900">
                    {avgSalary > 0 ? `R$ ${avgSalary.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}` : 'N/A'}
                  </div>
                  <p className="text-xs text-purple-700">Baseado nas vagas publicadas</p>
                </div>
              </div>

              {/* Vagas Recentes */}
              {recentJobs && recentJobs.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-foreground mb-4">Vagas Recentes</h4>
                  <div className="space-y-3">
                    {recentJobs.slice(0, 5).map((job) => (
                      <div key={job.id} className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border">
                        <div className="flex-1">
                          <h5 className="font-medium text-foreground">{job.title}</h5>
                          <p className="text-sm text-muted-foreground">
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
                        <Button variant="outline" className="text-foreground border-border hover:bg-accent">
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

      {/* Novo Dashboard de Formulários */}
      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-foreground uppercase font-bold">Dashboard de Formulários</CardTitle>
            <CardDescription className="text-muted-foreground">
              {selectedCompany ? `Últimos 30 dias - ${selectedCompany.name}` : 'Selecione uma empresa para ver as estatísticas'}
            </CardDescription>
          </div>
          {selectedCompany && (
            <Link to="/connect/forms">
              <Button variant="outline" size="sm" className="rounded-lg text-foreground border-border hover:bg-accent">
                Gerenciar Formulários
              </Button>
            </Link>
          )}
        </CardHeader>
        <CardContent>
          {!selectedCompany ? (
            <p className="text-center text-muted-foreground py-8">Por favor, selecione uma empresa na barra lateral para ver as estatísticas de formulários.</p>
          ) : isLoadingForms ? (
            <p className="text-center text-muted-foreground">Carregando estatísticas...</p>
          ) : (
            <div className="space-y-6">
              {/* Estatísticas Principais de Formulários */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Total de Formulários</span>
                  </div>
                  <div className="2xl font-bold text-blue-900">{totalForms}</div>
                  <p className="text-xs text-blue-700">Últimos 30 dias</p>
                </div>
                
                <div className="bg-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-green-900">Formulários Publicados</span>
                  </div>
                  <div className="2xl font-bold text-green-900">{publishedForms}</div>
                  <p className="text-xs text-green-700">Disponíveis para respostas</p>
                </div>
                
                <div className="bg-muted p-4 rounded-lg border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">Formulários em Rascunho</span>
                  </div>
                  <div className="2xl font-bold text-foreground">{draftForms}</div>
                  <p className="text-xs text-muted-foreground">Aguardando edição</p>
                </div>
                
                <div className="bg-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquareText className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-medium text-purple-900">Total de Respostas</span>
                  </div>
                  <div className="2xl font-bold text-purple-900">{totalFormResponses}</div>
                  <p className="text-xs text-purple-700">Recebidas nos formulários</p>
                </div>
              </div>

              {/* Formulários Recentes */}
              {recentForms && recentForms.length > 0 && (
                <div>
                  <h4 className="lg font-semibold text-foreground mb-4">Formulários Recentes</h4>
                  <div className="space-y-3">
                    {recentForms.slice(0, 5).map((formItem) => (
                      <div key={formItem.id} className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border">
                        <div className="flex-1">
                          <h5 className="font-medium text-foreground">{formItem.title}</h5>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(formItem.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            formItem.status === 'published' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {formItem.status === 'published' ? 'Publicado' : 'Rascunho'}
                          </span>
                          <Link to={`/form/${formItem.id}`}>
                            <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50 rounded-lg">
                              Ver
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                  {recentForms.length > 5 && (
                    <div className="text-center mt-4">
                      <Link to="/connect/forms">
                        <Button variant="outline" className="text-foreground border-border hover:bg-accent">
                          Ver todos os formulários
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
    </div>
  );
};

export default PulsePage;