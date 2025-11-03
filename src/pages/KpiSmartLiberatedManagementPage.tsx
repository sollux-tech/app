import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { KpiSmartLiberated, KpiSmartLiberatedFormData } from '@/types/kpiSmartLiberated';
import { KpiSmart } from '@/types/kpiSmart';
import { Pillar } from '@/types/pillar';
import { KpiSmartFrequency } from '@/types/kpiSmartFrequency';
import { KpiSmartStatus } from '@/types/kpiSmartStatus';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, Plus, Edit, Trash2 } from 'lucide-react';
import MultiSelect, { MultiSelectOption } from '@/components/MultiSelect';
import DatePicker from '@/components/DatePicker';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BasicProfileInfo } from '@/types/profile';
import { useCompany } from '@/components/CompanyContext';
import { Label } from '@/components/ui/label';

const formSchema = z.object({
  kpi_smart_id: z.string().min(1, { message: 'O KPI Smart é obrigatório.' }),
  pillar_id: z.string().min(1, { message: 'O pilar é obrigatório.' }),
  execution_user_ids: z.array(z.string()).optional().nullable(),
  view_user_ids: z.array(z.string()).optional().nullable(),
  kpi_smart_frequency_id: z.string().min(1, { message: 'A frequência de monitoramento é obrigatória.' }),
  kpi_smart_status_id: z.string().min(1, { message: 'O status é obrigatório.' }),

  // Campos para tipo 'Quantitativo'
  logical_comparator: z.string().optional().nullable(),
  base_value: z.coerce.number().min(0).optional().nullable(),
  target_value: z.coerce.number().min(0).optional().nullable(),
  deadline_date: z.date().optional().nullable(),

  // Campos para tipo 'Marco'
  planned_delivery_date: z.date().optional().nullable(),
  actual_delivery_date: z.date().optional().nullable(),
  progress_percentage: z.coerce.number().min(0).max(100).optional().nullable(),

  // Campos Frequência
  planned_frequency: z.string().optional().nullable(),
  planned_executions: z.coerce.number().int().positive().optional().nullable(),
  performed_executions: z.coerce.number().int().positive().optional().nullable(),

  // Campos Intervalo
  min_value: z.coerce.number().optional().nullable(),
  max_value: z.coerce.number().optional().nullable(),
  current_value: z.coerce.number().optional().nullable(),
});

const KpiSmartLiberatedManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { selectedCompany } = useCompany();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingKpiSmartLiberated, setEditingKpiSmartLiberated] = useState<KpiSmartLiberated | null>(null);

  // Estados para os filtros
  const [selectedPillarFilter, setSelectedPillarFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  const form = useForm<KpiSmartLiberatedFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      kpi_smart_id: '',
      pillar_id: '',
      execution_user_ids: [],
      view_user_ids: [],
      kpi_smart_frequency_id: '',
      kpi_smart_status_id: '',
      logical_comparator: null,
      base_value: null,
      target_value: null,
      deadline_date: null,
      planned_delivery_date: null,
      actual_delivery_date: null,
      progress_percentage: null,
      planned_frequency: null,
      planned_executions: null,
      performed_executions: null,
      min_value: null,
      max_value: null,
      current_value: null,
    },
  });

  useEffect(() => {
    if (editingKpiSmartLiberated) {
      form.reset({
        kpi_smart_id: editingKpiSmartLiberated.kpi_smart_id,
        pillar_id: editingKpiSmartLiberated.pillar_id || '',
        execution_user_ids: editingKpiSmartLiberated.execution_user_ids || [],
        view_user_ids: editingKpiSmartLiberated.view_user_ids || [],
        kpi_smart_frequency_id: editingKpiSmartLiberated.kpi_smart_frequency_id || '',
        kpi_smart_status_id: editingKpiSmartLiberated.kpi_smart_status_id || '',
        logical_comparator: editingKpiSmartLiberated.logical_comparator || null,
        base_value: editingKpiSmartLiberated.base_value || null,
        target_value: editingKpiSmartLiberated.target_value || null,
        deadline_date: editingKpiSmartLiberated.deadline_date ? new Date(editingKpiSmartLiberated.deadline_date + 'T00:00:00') : null,
        planned_delivery_date: editingKpiSmartLiberated.planned_delivery_date ? new Date(editingKpiSmartLiberated.planned_delivery_date + 'T00:00:00') : null,
        actual_delivery_date: editingKpiSmartLiberated.actual_delivery_date ? new Date(editingKpiSmartLiberated.actual_delivery_date + 'T00:00:00') : null,
        progress_percentage: editingKpiSmartLiberated.progress_percentage || null,
        planned_frequency: editingKpiSmartLiberated.planned_frequency || null,
        planned_executions: editingKpiSmartLiberated.planned_executions || null,
        performed_executions: editingKpiSmartLiberated.performed_executions || null,
        min_value: editingKpiSmartLiberated.min_value || null,
        max_value: editingKpiSmartLiberated.max_value || null,
        current_value: editingKpiSmartLiberated.current_value || null,
      });
    } else {
      form.reset({
        kpi_smart_id: '',
        pillar_id: '',
        execution_user_ids: [],
        view_user_ids: [],
        kpi_smart_frequency_id: '',
        kpi_smart_status_id: '',
        logical_comparator: null,
        base_value: null,
        target_value: null,
        deadline_date: null,
        planned_delivery_date: null,
        actual_delivery_date: null,
        progress_percentage: null,
        planned_frequency: null,
        planned_executions: null,
        performed_executions: null,
        min_value: null,
        max_value: null,
        current_value: null,
      });
    }
  }, [editingKpiSmartLiberated, form, isDialogOpen]);

  const { data: kpiSmartsLiberated, isLoading: isLoadingKpiSmartsLiberated, error: errorKpiSmartsLiberated } = useQuery<KpiSmartLiberated[], Error>({
    queryKey: ['kpiSmartsLiberated', user?.id, selectedCompany?.id, selectedPillarFilter, selectedTypeFilter, selectedStatusFilter],
    queryFn: async () => {
      if (!user?.id || !selectedCompany?.id) return [];
      let query = supabase
        .from('kpi_smarts_liberated')
        .select(`
          *,
          kpi_smarts(description, pillar_id, kpi_smart_types(description, code), kpi_smart_action_verbs(description), kpi_smart_focuses(description), kpi_smart_units(description)),
          pillars(description),
          kpi_smart_frequencies(description),
          kpi_smart_statuses(description)
        `)
        .eq('user_id', user.id)
        .eq('company_id', selectedCompany.id);
      
      if (selectedPillarFilter !== 'all') {
        query = query.eq('pillar_id', selectedPillarFilter);
      }
      if (selectedTypeFilter !== 'all') {
        query = query.eq('kpi_smarts.kpi_smart_type_id', selectedTypeFilter);
      }
      if (selectedStatusFilter !== 'all') {
        query = query.eq('kpi_smart_status_id', selectedStatusFilter);
      }

      query = query.order('code', { ascending: true });
      const { data, error } = await query;
      if (error) throw error;
      return data.map(item => ({
        ...item,
        kpi_smarts: Array.isArray(item.kpi_smarts) ? item.kpi_smarts[0] : item.kpi_smarts,
        pillars: Array.isArray(item.pillars) ? item.pillars[0] : item.pillars,
        kpi_smart_frequencies: Array.isArray(item.kpi_smart_frequencies) ? item.kpi_smart_frequencies[0] : item.kpi_smart_frequencies,
        kpi_smart_statuses: Array.isArray(item.kpi_smart_statuses) ? item.kpi_smart_statuses[0] : item.kpi_smart_statuses,
      }));
    },
    enabled: !!user?.id && !!selectedCompany?.id,
  });

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

  const { data: kpiSmartTypes, isLoading: isLoadingKpiSmartTypes } = useQuery<any[], Error>({
    queryKey: ['kpiSmartTypesListForKpiSmartLiberated', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('kpi_smart_types')
        .select('*')
        .eq('user_id', user.id)
        .order('description', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: kpiSmartStatuses, isLoading: isLoadingKpiSmartStatuses } = useQuery<KpiSmartStatus[], Error>({
    queryKey: ['kpiSmartStatusesListForKpiSmartLiberated', user?.id],
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

  const deleteKpiSmartLiberatedMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id || !selectedCompany?.id) throw new Error("Usuário não autenticado ou empresa não selecionada.");
      const { error, count } = await supabase
        .from('kpi_smarts_liberated')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
        .eq('company_id', selectedCompany.id);
      
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

  const handleAddClick = () => {
    setEditingKpiSmartLiberated(null);
    navigate('/ops/shift/kpi-smarts-liberated/new');
  };

  const handleEditClick = (kpiSmartLiberated: KpiSmartLiberated) => {
    navigate(`/ops/shift/kpi-smarts-liberated/${kpiSmartLiberated.id}`);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este KPI Smart Liberado?')) {
      deleteKpiSmartLiberatedMutation.mutate(id);
    }
  };

  const isMutating = deleteKpiSmartLiberatedMutation.isPending;
  const isLoadingPage = isLoadingKpiSmartsLiberated || isLoadingPillars || isLoadingKpiSmartTypes || isLoadingKpiSmartStatuses;

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
          <div>
            <CardTitle className="text-foreground uppercase font-bold">Gerenciar KPIs Smart Liberados</CardTitle>
            <CardDescription className="text-muted-foreground">
              KPIs Smart disponíveis para a empresa: <span className="font-semibold">{selectedCompany.name}</span>
            </CardDescription>
          </div>
          <Button onClick={handleAddClick} className="bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg">
            <Plus className="mr-2 h-4 w-4" /> Liberar Novo KPI Smart
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Filtro por Pilar */}
            <div>
              <Label htmlFor="pillar-filter" className="text-foreground">Filtrar por Pilar</Label>
              <Select
                value={selectedPillarFilter}
                onValueChange={setSelectedPillarFilter}
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

            {/* Filtro por Tipo */}
            <div>
              <Label htmlFor="type-filter" className="text-foreground">Filtrar por Tipo</Label>
              <Select
                value={selectedTypeFilter}
                onValueChange={setSelectedTypeFilter}
                disabled={isLoadingKpiSmartTypes}
              >
                <SelectTrigger id="type-filter" className="rounded-lg">
                  <SelectValue placeholder="Todos os Tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Tipos</SelectItem>
                  {kpiSmartTypes?.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Status */}
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
                <TableHead className="text-foreground">Pilar</TableHead>
                <TableHead className="text-foreground">Tipo</TableHead>
                <TableHead className="text-foreground">Status</TableHead>
                <TableHead className="text-right text-foreground">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kpiSmartsLiberated?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhum KPI Smart Liberado encontrado para esta empresa.
                  </TableCell>
                </TableRow>
              ) : (
                kpiSmartsLiberated?.map((kpi) => (
                  <TableRow key={kpi.id}>
                    <TableCell className="font-medium text-foreground">{kpi.code}</TableCell>
                    <TableCell className="text-muted-foreground">{kpi.kpi_smarts?.description || 'N/A'}</TableCell>
                    <TableCell className="text-muted-foreground">{kpi.pillars?.description || 'N/A'}</TableCell>
                    <TableCell className="text-muted-foreground">{kpi.kpi_smarts?.kpi_smart_types?.description || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={kpi.kpi_smart_statuses?.description === 'Ativo' ? 'default' : 'secondary'}
                        className={kpi.kpi_smart_statuses?.description === 'Ativo' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-800 border-gray-200'}
                      >
                        {kpi.kpi_smart_statuses?.description || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(kpi)}
                        className="mr-2 text-foreground hover:bg-accent rounded-lg"
                        disabled={isMutating}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick(kpi.id)}
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