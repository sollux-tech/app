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
import { KpiSmartStatus } from '@/types/kpiSmartStatus'; // Importar KpiSmartStatus
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate, useParams } from 'react-router-dom';
import { useCompany } from '@/components/CompanyContext';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formSchema = z.object({
  kpi_smart_id: z.string().min(1, { message: 'O KPI Smart é obrigatório.' }),
  kpi_smart_status_id: z.string().min(1, { message: 'O status é obrigatório.' }), // Adicionado ao schema
});

const KpiSmartLiberatedManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const { id: kpiSmartLiberatedId } = useParams<{ id: string }>();
  const isEditing = !!kpiSmartLiberatedId;

  // Estados para os filtros da tabela
  const [selectedPillarFilter, setSelectedPillarFilter] = useState<string>('all');
  const [selectedKpiSmartFilter, setSelectedKpiSmartFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingKpiSmartLiberated, setEditingKpiSmartLiberated] = useState<KpiSmartLiberated | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      kpi_smart_id: '',
      kpi_smart_status_id: '', // Adicionado ao defaultValues
    },
  });

  useEffect(() => {
    if (editingKpiSmartLiberated) {
      form.reset({
        kpi_smart_id: editingKpiSmartLiberated.kpi_smart_id,
        kpi_smart_status_id: editingKpiSmartLiberated.kpi_smart_status_id || '', // Adicionado ao reset
      });
    } else {
      form.reset({
        kpi_smart_id: '',
        kpi_smart_status_id: '', // Adicionado ao reset
      });
    }
  }, [editingKpiSmartLiberated, form, isDialogOpen]);

  // Query para buscar todos os KPIs Smart Liberados
  const { data: kpiSmartsLiberated, isLoading: isLoadingKpiSmartsLiberated, error: errorKpiSmartsLiberated } = useQuery<KpiSmartLiberated[], Error>({
    queryKey: ['kpiSmartsLiberated', user?.id, selectedPillarFilter, selectedKpiSmartFilter, selectedStatusFilter],
    queryFn: async () => {
      if (!user?.id) return [];
      let query = supabase
        .from('kpi_smarts_liberated')
        .select(`
          *,
          kpi_smarts(description, kpi_smart_types(description, code), kpi_smart_focuses(description), kpi_smart_units(description), pillar_id),
          kpi_smart_frequencies(description),
          kpi_smart_statuses(description)
        `)
        .eq('user_id', user.id);

      if (selectedPillarFilter !== 'all') {
        query = query.eq('kpi_smarts.pillar_id', selectedPillarFilter);
      }
      if (selectedKpiSmartFilter !== 'all') {
        query = query.eq('kpi_smart_id', selectedKpiSmartFilter);
      }
      if (selectedStatusFilter !== 'all') {
        query = query.eq('kpi_smart_status_id', selectedStatusFilter); // Filtrar pela nova coluna
      }

      query = query.order('code', { ascending: true });
      const { data, error } = await query;
      if (error) throw error;
      return data.map((item: any) => ({
        ...item,
        kpi_smarts: Array.isArray(item.kpi_smarts) ? item.kpi_smarts[0] : item.kpi_smarts,
        kpi_smart_frequencies: Array.isArray(item.kpi_smart_frequencies) ? item.kpi_smart_frequencies[0] : item.kpi_smart_frequencies,
        kpi_smart_statuses: Array.isArray(item.kpi_smart_statuses) ? item.kpi_smart_statuses[0] : item.kpi_smart_statuses,
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
        .select('*, kpi_smart_types(description, code), kpi_smart_focuses(description), kpi_smart_units(description)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('description', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Query para buscar todos os Status de KPI Smart (para filtros e formulário)
  const { data: kpiSmartStatuses, isLoading: isLoadingKpiSmartStatuses } = useQuery<KpiSmartStatus[], Error>({
    queryKey: ['kpiSmartStatusesListForLiberated', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('kpi_smart_statuses')
        .select('*')
        .eq('user_id', user.id)
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
      queryClient.invalidateQueries({ queryKey: ['kpiSmartsLiberated', user?.id, selectedCompany?.id] });
      setIsDialogOpen(false);
      setEditingKpiSmartLiberated(null);
    },
    onError: (error: Error) => {
      showError(`Erro: ${error.message}`);
    },
  };

  const createKpiSmartLiberatedMutation = useMutation({
    mutationFn: async (data: KpiSmartLiberatedFormData) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { data: newKpiSmartLiberated, error } = await supabase
        .from('kpi_smarts_liberated')
        .insert({
          kpi_smart_id: data.kpi_smart_id,
          user_id: user.id,
          execution_user_types: data.execution_user_types,
          view_user_types: data.view_user_types,
          kpi_smart_frequency_id: data.kpi_smart_frequency_id,
          kpi_smart_status_id: data.kpi_smart_status_id, // Adicionado
          
          // Campos Quantitativos
          logical_comparator: data.logical_comparator,
          base_value: data.base_value,
          target_value: data.target_value,
          deadline_date: data.deadline_date ? format(data.deadline_date, 'yyyy-MM-dd') : null,

          // Campos Marco
          planned_delivery_date: data.planned_delivery_date ? format(data.planned_delivery_date, 'yyyy-MM-dd') : null,
          actual_delivery_date: data.actual_delivery_date ? format(data.actual_delivery_date, 'yyyy-MM-dd') : null,
          progress_percentage: data.progress_percentage,

          // Campos Frequência
          planned_frequency: data.planned_frequency,
          planned_executions: data.planned_executions,
          performed_executions: data.performed_executions,

          // Campos Intervalo
          min_value: data.min_value,
          max_value: data.max_value,
          current_value: data.current_value,
        })
        .select()
        .single();
      if (error) throw error;
      return newKpiSmartLiberated;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('KPI Smart Liberado com sucesso!');
    },
  });

  const updateKpiSmartLiberatedMutation = useMutation({
    mutationFn: async (data: KpiSmartLiberatedFormData) => {
      if (!kpiSmartLiberatedId) throw new Error("ID do KPI Smart Liberado está faltando.");
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { data: updatedKpiSmartLiberated, error } = await supabase
        .from('kpi_smarts_liberated')
        .update({
          kpi_smart_id: data.kpi_smart_id,
          execution_user_types: data.execution_user_types,
          view_user_types: data.view_user_types,
          kpi_smart_frequency_id: data.kpi_smart_frequency_id,
          kpi_smart_status_id: data.kpi_smart_status_id, // Adicionado

          // Campos Quantitativos
          logical_comparator: data.logical_comparator,
          base_value: data.base_value,
          target_value: data.target_value,
          deadline_date: data.deadline_date ? format(data.deadline_date, 'yyyy-MM-dd') : null,

          // Campos Marco
          planned_delivery_date: data.planned_delivery_date ? format(data.planned_delivery_date, 'yyyy-MM-dd') : null,
          actual_delivery_date: data.actual_delivery_date ? format(data.actual_delivery_date, 'yyyy-MM-dd') : null,
          progress_percentage: data.progress_percentage,

          // Campos Frequência
          planned_frequency: data.planned_frequency,
          planned_executions: data.planned_executions,
          performed_executions: data.performed_executions,

          // Campos Intervalo
          min_value: data.min_value,
          max_value: data.max_value,
          current_value: data.current_value,
        })
        .eq('id', kpiSmartLiberatedId)
        .eq('user_id', user.id)
        .select()
        .single();
      if (error) throw error;
      return updatedKpiSmartLiberated;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('KPI Smart Liberado atualizado com sucesso!');
    },
  });

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

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    // The formSchema only has kpi_smart_id and kpi_smart_status_id, but the mutations expect KpiSmartLiberatedFormData.
    // This means the form is not correctly typed for all fields.
    // For now, we'll construct the payload explicitly.
    const payload: KpiSmartLiberatedFormData = {
      kpi_smart_id: data.kpi_smart_id,
      kpi_smart_status_id: data.kpi_smart_status_id, // Adicionado
      // Default or empty values for other fields if not part of this form
      execution_user_types: [],
      view_user_types: [],
      kpi_smart_frequency_id: '',
    };

    if (isEditing) {
      updateKpiSmartLiberatedMutation.mutate(payload);
    } else {
      createKpiSmartLiberatedMutation.mutate(payload);
    }
  };

  const handleAddClick = () => {
    setEditingKpiSmartLiberated(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (kpiSmartLiberated: KpiSmartLiberated) => {
    setEditingKpiSmartLiberated(kpiSmartLiberated);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este KPI Smart Liberado?')) {
      deleteKpiSmartLiberatedMutation.mutate(id);
    }
  };

  const isMutating = createKpiSmartLiberatedMutation.isPending || updateKpiSmartLiberatedMutation.isPending || deleteKpiSmartLiberatedMutation.isPending;
  const isLoadingPage = isLoadingKpiSmartsLiberated || isLoadingKpiSmarts || isLoadingPillars || isLoadingKpiSmartStatuses;

  if (!selectedCompany) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Por favor, selecione uma empresa na barra lateral para gerenciar os KPIs Smart Liberados.
      </div>
    );
  }

  if (isLoadingPage) {
    return <div className="text-center text-muted-foreground">Carregando KPIs Smart Liberados...</div>;
  }

  if (errorKpiSmartsLiberated) {
    return <div className="text-center text-destructive">Erro ao carregar KPIs Smart Liberados: {errorKpiSmartsLiberated.message}</div>;
  }

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
            <div>
              <Label htmlFor="status-filter" className="text-foreground">Filtrar por Status</Label>
              <Select
                value={selectedStatusFilter}
                onValueChange={setSelectedStatusFilter}
                disabled={isLoadingKpiSmartStatuses}
              >
                <SelectTrigger id="status-filter" className="rounded-lg">
                  <SelectValue placeholder="Todos os Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  {kpiSmartStatuses?.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      {status.description}
                    </SelectItem>
                  ))}
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
                <TableHead className="text-foreground">Status</TableHead>
                <TableHead className="text-right text-foreground">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kpiSmartsLiberated?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
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
                    <TableCell>
                      <Badge
                        variant={item.kpi_smart_statuses?.description === 'Ativo' ? 'default' : 'secondary'}
                        className={item.kpi_smart_statuses?.description === 'Ativo' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-800 border-gray-200'}
                      >
                        {item.kpi_smart_statuses?.description || 'N/A'}
                      </Badge>
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