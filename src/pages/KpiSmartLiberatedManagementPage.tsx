import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { KpiSmartLiberated, KpiSmartLiberatedFormData } from '@/types/kpiSmartLiberated';
import { KpiSmart } from '@/types/kpiSmart';
import { Pillar } from '@/types/pillar';
import { KpiSmartFrequency } from '@/types/kpiSmartFrequency';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/components/CompanyContext';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formSchema = z.object({
  kpi_smart_id: z.string().min(1, { message: 'O KPI Smart é obrigatório.' }),
});

const KpiSmartLiberatedManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingKpiSmartLiberated, setEditingKpiSmartLiberated] = useState<KpiSmartLiberated | null>(null);

  // Estados para os filtros da tabela
  const [selectedPillarFilter, setSelectedPillarFilter] = useState<string>('all');
  const [selectedKpiSmartFilter, setSelectedKpiSmartFilter] = useState<string>('all');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      kpi_smart_id: '',
    },
  });

  useEffect(() => {
    if (editingKpiSmartLiberated) {
      form.reset({
        kpi_smart_id: editingKpiSmartLiberated.kpi_smart_id,
      });
    } else {
      form.reset({
        kpi_smart_id: '',
      });
    }
  }, [editingKpiSmartLiberated, form, isDialogOpen]);

  // Query para buscar todos os KPIs Smart Liberados
  const { data: kpiSmartsLiberated, isLoading: isLoadingKpiSmartsLiberated, error: errorKpiSmartsLiberated } = useQuery<KpiSmartLiberated[], Error>({
    queryKey: ['kpiSmartsLiberated', user?.id, selectedPillarFilter, selectedKpiSmartFilter],
    queryFn: async () => {
      if (!user?.id) return [];
      let query = supabase
        .from('kpi_smarts_liberated')
        .select(`
          *,
          kpi_smarts(description, pillar_id, kpi_smart_types(description, code), kpi_smart_focuses(description), kpi_smart_units(description)),
          kpi_smart_frequencies(description)
        `)
        .eq('user_id', user.id);

      if (selectedPillarFilter !== 'all') {
        query = query.eq('kpi_smarts.pillar_id', selectedPillarFilter);
      }
      if (selectedKpiSmartFilter !== 'all') {
        query = query.eq('kpi_smart_id', selectedKpiSmartFilter);
      }

      query = query.order('code', { ascending: true });
      const { data, error } = await query;
      if (error) throw error;
      return data.map(item => ({
        ...item,
        kpi_smarts: Array.isArray(item.kpi_smarts) ? item.kpi_smarts[0] : item.kpi_smarts,
        kpi_smart_frequencies: Array.isArray(item.kpi_smart_frequencies) ? item.kpi_smart_frequencies[0] : item.kpi_smart_frequencies,
      }));
    },
    enabled: !!user?.id,
  });

  // Query para buscar todos os Pilares (para filtros e formulário)
  const { data: pillars, isLoading: isLoadingPillars } = useQuery<Pillar[], Error>({
    queryKey: ['pillarsListForKpiSmartLiberated', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('pillars')
        .select('*')
        .eq('user_id', user.id)
        .order('description', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Query para buscar KPIs Smart ativos (para filtros e formulário)
  const { data: kpiSmarts, isLoading: isLoadingKpiSmarts } = useQuery<KpiSmart[], Error>({
    queryKey: ['kpiSmartsListForLiberated', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('kpi_smarts')
        .select('id, description, pillar_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('description', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const filteredKpiSmartsForFilter = useMemo(() => {
    if (!kpiSmarts) return [];
    if (selectedPillarFilter === 'all') return kpiSmarts;
    return kpiSmarts.filter(kpi => kpi.pillar_id === selectedPillarFilter);
  }, [kpiSmarts, selectedPillarFilter]);

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpiSmartsLiberated', user?.id] });
      setIsDialogOpen(false);
      setEditingKpiSmartLiberated(null);
    },
    onError: (error: Error) => {
      showError(`Erro: ${error.message}`);
    },
  };

  const deleteKpiSmartLiberatedMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { error, count } = await supabase
        .from('kpi_smarts_liberated')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) {
        throw error;
      }
      if (count === 0) {
        throw new Error("KPI Smart Liberado não encontrado ou você não tem permissão para excluí-lo.");
      }
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('KPI Smart Liberado excluído com sucesso!');
    },
  });

  const handleDeleteClick = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este KPI Smart Liberado?')) {
      deleteKpiSmartLiberatedMutation.mutate(id);
    }
  };

  const isMutating = deleteKpiSmartLiberatedMutation.isPending;
  const isLoadingPage = isLoadingKpiSmartsLiberated || isLoadingPillars || isLoadingKpiSmarts;

  return (
    <div className="space-y-6">
      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground uppercase font-bold">Gerenciar KPIs Smart Liberados</CardTitle>
          <Button onClick={() => navigate('/ops/shift/kpi-smarts-liberated/new')} className="bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg">
            <Plus className="mr-2 h-4 w-4" /> Liberar Novo KPI Smart
          </Button>
        </CardHeader>
        <CardContent>
          {/* Filtros da Tabela */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <Label htmlFor="pillar-filter" className="text-foreground">Filtrar por Pilar</Label>
              <Select
                value={selectedPillarFilter}
                onValueChange={(value) => {
                  setSelectedPillarFilter(value);
                  setSelectedKpiSmartFilter('all'); // Resetar filtro de KPI Smart ao mudar o pilar
                }}
                disabled={isLoadingPillars}
              >
                <SelectTrigger id="pillar-filter" className="rounded-lg">
                  <SelectValue placeholder="Todos os Pilares" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Pilares</SelectItem>
                  {pillars?.map((pillar) => (
                    <SelectItem key={pillar.id} value={pillar.id}>
                      {pillar.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="kpi-smart-filter" className="text-foreground">Filtrar por KPI Smart</Label>
              <Select
                value={selectedKpiSmartFilter}
                onValueChange={setSelectedKpiSmartFilter}
                disabled={isLoadingKpiSmarts || (selectedPillarFilter !== 'all' && filteredKpiSmartsForFilter.length === 0)}
              >
                <SelectTrigger id="kpi-smart-filter" className="rounded-lg">
                  <SelectValue placeholder="Todos os KPIs Smart" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os KPIs Smart</SelectItem>
                  {filteredKpiSmartsForFilter.length === 0 ? (
                    <SelectItem value="no-kpis" disabled>Nenhum KPI Smart para este pilar</SelectItem>
                  ) : (
                    filteredKpiSmartsForFilter.map((kpi) => (
                      <SelectItem key={kpi.id} value={kpi.id}>
                        {kpi.description}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-foreground">Código</TableHead>
                <TableHead className="text-foreground">KPI Smart</TableHead>
                <TableHead className="text-foreground">Tipo</TableHead>
                <TableHead className="text-foreground">Foco</TableHead>
                <TableHead className="text-foreground">Unidade</TableHead>
                <TableHead className="text-foreground">Frequência</TableHead>
                <TableHead className="text-foreground">Criado em</TableHead>
                <TableHead className="text-right text-foreground">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kpiSmartsLiberated?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    Nenhum KPI Smart Liberado encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                kpiSmartsLiberated?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-foreground">{item.code}</TableCell>
                    <TableCell className="text-muted-foreground">{item.kpi_smarts?.description || 'N/A'}</TableCell>
                    <TableCell className="text-muted-foreground">{item.kpi_smarts?.kpi_smart_types?.description || 'N/A'}</TableCell>
                    <TableCell className="text-muted-foreground">{item.kpi_smarts?.kpi_smart_focuses?.description || 'N/A'}</TableCell>
                    <TableCell className="text-muted-foreground">{item.kpi_smarts?.kpi_smart_units?.description || 'N/A'}</TableCell>
                    <TableCell className="text-muted-foreground">{item.kpi_smart_frequencies?.description || 'N/A'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(item.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/ops/shift/kpi-smarts-liberated/${item.id}`)}
                        className="mr-2 text-foreground hover:bg-accent rounded-lg"
                        disabled={isMutating}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick(item.id)}
                        className="bg-sollux-red hover:bg-red-700 text-white rounded-lg"
                        disabled={isMutating}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default KpiSmartLiberatedManagementPage;