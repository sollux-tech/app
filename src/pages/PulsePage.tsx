import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { HeartPulse, TrendingUp, Activity, Bell, Settings, Search } from 'lucide-react'; 
import FeatureCard from '@/components/FeatureCard';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PulseInformative } from '@/types/pulseInformative';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const PulsePage: React.FC = () => {
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: informativeToday, isLoading: isLoadingInformative, error: errorInformative } = useQuery<PulseInformative | null, Error>({
    queryKey: ['pulseInformativeToday', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pulse_informatives')
        .select('*')
        .eq('publication_date', today)
        .single(); // Tenta buscar um único informativo para a data de hoje
      
      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        throw error;
      }
      return data || null;
    },
  });

  return (
    <div className="space-y-6">
      {/* Campos de entrada inspirados na imagem */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl p-4 flex items-center">
          <Search className="h-5 w-5 text-gray-400 mr-3" />
          <Input placeholder="Buscar..." className="flex-1 border-none bg-transparent focus-visible:ring-0 text-sollux-black" />
        </Card>
        <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl p-4 flex items-center col-span-2">
          <Input placeholder="Outro campo de entrada..." className="flex-1 border-none bg-transparent focus-visible:ring-0 text-sollux-black" />
        </Card>
      </div>

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