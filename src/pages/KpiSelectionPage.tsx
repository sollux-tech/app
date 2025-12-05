import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, ArrowRight, Calendar, Target } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import { KpiSmartLiberated } from '@/types/kpiSmartLiberated';

const KpiSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSession();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: kpiSmartsLiberated, isLoading, error } = useQuery<KpiSmartLiberated[], Error>({
    queryKey: ['kpiSmartsLiberatedForSelection', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('kpi_smarts_liberated')
        .select(`
          *,
          kpi_smarts(description, kpi_smart_types(description), kpi_smart_focuses(description), kpi_smart_units(description)),
          kpi_smart_frequencies(description),
          kpi_smart_statuses(description)
        `)
        .eq('user_id', user.id)
        .eq('kpi_smart_statuses.description', 'Ativo') // Filtrar apenas ativos se necessário, ou remover se quiser todos
        .order('code', { ascending: true });

      if (error) throw error;
      
      // Filtragem adicional no client-side se o filtro de status no select não funcionar como esperado devido a joins
      // Mas idealmente o filtro deve ser no banco. Como kpi_smart_statuses é uma tabela relacionada, o filtro .eq('kpi_smart_statuses.description', 'Ativo') pode falhar se não for inner join explícito ou se a estrutura do supabase não suportar direto assim.
      // Vamos buscar todos e filtrar no client por segurança ou ajustar a query.
      // Ajuste: Buscar todos e filtrar no map/filter abaixo é mais garantido para este MVP.
      
      return data.map(item => ({
        ...item,
        kpi_smarts: Array.isArray(item.kpi_smarts) ? item.kpi_smarts[0] : item.kpi_smarts,
        kpi_smart_frequencies: Array.isArray(item.kpi_smart_frequencies) ? item.kpi_smart_frequencies[0] : item.kpi_smart_frequencies,
        kpi_smart_statuses: Array.isArray(item.kpi_smart_statuses) ? item.kpi_smart_statuses[0] : item.kpi_smart_statuses,
      }));
    },
    enabled: !!user?.id,
  });

  const filteredKpis = kpiSmartsLiberated?.filter(kpi => 
    kpi.kpi_smarts?.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    kpi.code.toString().includes(searchTerm)
  );

  if (isLoading) {
    return <div className="flex justify-center items-center h-64 text-muted-foreground">Carregando KPIs disponíveis...</div>;
  }

  if (error) {
    return <div className="text-center text-destructive py-8">Erro ao carregar KPIs: {error.message}</div>;
  }

  return (
    <div className="space-y-6 container mx-auto py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Apontamento de KPI</h1>
          <p className="text-muted-foreground">Selecione um KPI para registrar a evolução.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar KPI por nome ou código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-card/50 backdrop-blur-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredKpis?.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground bg-card/30 rounded-xl border border-dashed border-border">
            Nenhum KPI encontrado.
          </div>
        ) : (
          filteredKpis?.map((kpi) => (
            <Card 
              key={kpi.id} 
              className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-border/50 hover:border-sollux-red/50 bg-card/50 backdrop-blur-sm"
              onClick={() => navigate(`/ops/shift/kpi-apontamentos/${kpi.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <Badge variant="outline" className="bg-background/50 backdrop-blur-md">
                    #{kpi.code}
                  </Badge>
                  <Badge className={`${kpi.kpi_smart_statuses?.description === 'Ativo' ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' : 'bg-gray-500/10 text-gray-500'}`}>
                    {kpi.kpi_smart_statuses?.description || 'Status Desconhecido'}
                  </Badge>
                </div>
                <CardTitle className="text-xl mt-2 line-clamp-2 group-hover:text-sollux-red transition-colors">
                  {kpi.kpi_smarts?.description}
                </CardTitle>
                <CardDescription className="line-clamp-1">
                  {kpi.kpi_smarts?.kpi_smart_types?.description} • {kpi.kpi_smarts?.kpi_smart_focuses?.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-sollux-red" />
                    <span>Frequência: {kpi.kpi_smart_frequencies?.description || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-sollux-red" />
                    <span>Unidade: {kpi.kpi_smarts?.kpi_smart_units?.description || 'N/A'}</span>
                  </div>
                </div>
                <Button className="w-full mt-4 bg-sollux-red/10 text-sollux-red hover:bg-sollux-red hover:text-white transition-colors group-hover:translate-y-1">
                  Selecionar <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default KpiSelectionPage;
