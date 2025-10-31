import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
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
import { Loader2, Edit, Trash2 } from 'lucide-react'; // Importar Edit e Trash2
import MultiSelect, { MultiSelectOption } from '@/components/MultiSelect';
import DatePicker from '@/components/DatePicker';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge'; // Importar Badge
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'; // Importar Table, etc.

// Helper para converter string vazia para undefined para campos opcionais de número
const emptyStringToUndefined = z.preprocess(
  (val) => (val === "" ? undefined : val),
  z.any()
);

const formSchema = z.object({
  kpi_smart_id: z.string().min(1, { message: 'O KPI Smart é obrigatório.' }),
  pillar_id: z.string().min(1, { message: 'O pilar é obrigatório.' }),
  execution_user_types: z.array(z.string()).optional(),
  view_user_types: z.array(z.string()).optional(),
  kpi_smart_frequency_id: z.string().min(1, { message: 'A frequência de monitoramento é obrigatória.' }),
  kpi_smart_status_id: z.string().min(1, { message: 'O status é obrigatório.' }), // Adicionado ao schema

  // Campos para tipo 'Quantitativo'
  logical_comparator: z.string().optional().nullable(),
  base_value: emptyStringToUndefined.pipe(z.coerce.number().optional().nullable()),
  target_value: emptyStringToUndefined.pipe(z.coerce.number().optional().nullable()),
  deadline_date: z.date().optional().nullable(), // Novo campo para prazo

  // Campos para tipo 'Marco'
  planned_delivery_date: z.date().optional().nullable(),
  actual_delivery_date: z.date().optional().nullable(),
  progress_percentage: emptyStringToUndefined.pipe(z.coerce.number().min(0).max(100).optional().nullable()),

  // Campos para tipo 'Frequência'
  planned_frequency: z.string().optional().nullable(),
  planned_executions: emptyStringToUndefined.pipe(z.coerce.number().int().positive().optional().nullable()),
  performed_executions: emptyStringToUndefined.pipe(z.coerce.number().int().positive().optional().nullable()),

  // Campos para tipo 'Intervalo'
  min_value: emptyStringToUndefined.pipe(z.coerce.number().optional().nullable()),
  max_value: emptyStringToUndefined.pipe(z.coerce.number().optional().nullable()),
  current_value: emptyStringToUndefined.pipe(z.coerce.number().optional().nullable()),
});

const KpiSmartLiberatedFormPage: React.FC = () => {
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
      pillar_id: '',
      execution_user_types: [],
      view_user_types: [],
      kpi_smart_frequency_id: '',
      kpi_smart_status_id: '', // Adicionado ao defaultValues
      logical_comparator: '',
      base_value: undefined,
      target_value: undefined,
      deadline_date: undefined, // Novo campo
      planned_delivery_date: undefined,
      actual_delivery_date: undefined,
      progress_percentage: undefined,
      planned_frequency: '',
      planned_executions: undefined,
      performed_executions: undefined,
      min_value: undefined,
      max_value: undefined,
      current_value: undefined,
    },
  });

  useEffect(() => {
    if (editingKpiSmartLiberated) {
      form.reset({
        kpi_smart_id: editingKpiSmartLiberated.kpi_smart_id,
        pillar_id: (editingKpiSmartLiberated.kpi_smarts as any)?.pillar_id || '',
        execution_user_types: editingKpiSmartLiberated.execution_user_types || [],
        view_user_types: editingKpiSmartLiberated.view_user_types || [],
        kpi_smart_frequency_id: editingKpiSmartLiberated.kpi_smart_frequency_id || '',
        kpi_smart_status_id: editingKpiSmartLiberated.kpi_smart_status_id || '', // Adicionado ao reset
        
        // Campos Quantitativos
        logical_comparator: editingKpiSmartLiberated.logical_comparator || '',
        base_value: editingKpiSmartLiberated.base_value || undefined,
        target_value: editingKpiSmartLiberated.target_value || undefined,
        deadline_date: editingKpiSmartLiberated.deadline_date ? new Date(editingKpiSmartLiberated.deadline_date + 'T00:00:00') : undefined, // Novo campo

        // Campos Marco
        planned_delivery_date: editingKpiSmartLiberated.planned_delivery_date ? new Date(editingKpiSmartLiberated.planned_delivery_date + 'T00:00:00') : undefined,
        actual_delivery_date: editingKpiSmartLiberated.actual_delivery_date ? new Date(editingKpiSmartLiberated.actual_delivery_date + 'T00:00:00') : undefined,
        progress_percentage: editingKpiSmartLiberated.progress_percentage || undefined,

        // Campos Frequência
        planned_frequency: editingKpiSmartLiberated.planned_frequency || '',
        planned_executions: editingKpiSmartLiberated.planned_executions || undefined,
        performed_executions: editingKpiSmartLiberated.performed_executions || undefined,

        // Campos Intervalo
        min_value: editingKpiSmartLiberated.min_value || undefined,
        max_value: editingKpiSmartLiberated.max_value || undefined,
        current_value: editingKpiSmartLiberated.current_value || undefined,
      });
      setSelectedPillarIdForKpiSmart((editingKpiSmartLiberated.kpi_smarts as any)?.pillar_id || '');
    } else if (!isEditing) {
      form.reset({
        kpi_smart_id: '',
        pillar_id: '',
        execution_user_types: [],
        view_user_types: [],
        kpi_smart_frequency_id: '',
        kpi_smart_status_id: '', // Adicionado ao reset
        logical_comparator: '',
        base_value: undefined,
        target_value: undefined,
        deadline_date: undefined, // Novo campo
        planned_delivery_date: undefined,
        actual_delivery_date: undefined,
        progress_percentage: undefined,
        planned_frequency: '',
        planned_executions: undefined,
        performed_executions: undefined,
        min_value: undefined,
        max_value: undefined,
        current_value: undefined,
      });
      setSelectedPillarIdForKpiSmart('');
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
        kpi_smart_statuses: Array.isArray(item.kpi_smart_statuses) ? item.kpi_smart_statuses[0] : item.kpi_smart_statuses, // Mapear o status
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

  // Query para buscar todos os Status de KPI Smart (para o formulário)
  const { data: kpiSmartStatuses, isLoading: isLoadingKpiSmartStatuses } = useQuery<KpiSmartStatus[], Error>({
    queryKey: ['kpiSmartStatusesListForLiberatedForm', user?.id],
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

  // Use companyUsers for MultiSelect options
  const userOptions: MultiSelectOption[] = useMemo(() => {
    return [];
  }, []);

  const selectedKpiSmart = kpiSmarts?.find(kpi => kpi.id === form.watch('kpi_smart_id'));
  const kpiSmartTypeCode = selectedKpiSmart?.kpi_smart_types?.code;

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
      const { error } = await supabase
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
        .eq('user_id', user.id)
        .eq('company_id', selectedCompany?.id); // Adicionado company_id
      
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
    const payload: KpiSmartLiberatedFormData = {
      kpi_smart_id: data.kpi_smart_id,
      execution_user_types: form.getValues('execution_user_types') || [],
      view_user_types: form.getValues('view_user_types') || [],
      kpi_smart_frequency_id: form.getValues('kpi_smart_frequency_id'),
      kpi_smart_status_id: data.kpi_smart_status_id, // Adicionado

      // Campos Quantitativos
      logical_comparator: form.getValues('logical_comparator'),
      base_value: form.getValues('base_value'),
      target_value: form.getValues('target_value'),
      deadline_date: form.getValues('deadline_date'),

      // Campos Marco
      planned_delivery_date: form.getValues('planned_delivery_date'),
      actual_delivery_date: form.getValues('actual_delivery_date'),
      progress_percentage: form.getValues('progress_percentage'),

      // Campos Frequência
      planned_frequency: form.getValues('planned_frequency'),
      planned_executions: form.getValues('planned_executions'),
      performed_executions: form.getValues('performed_executions'),

      // Campos Intervalo
      min_value: form.getValues('min_value'),
      max_value: form.getValues('max_value'),
      current_value: form.getValues('current_value'),
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
  const isLoadingPage = isLoadingKpiSmartsLiberated || isLoadingKpiSmarts || isLoadingPillars || isLoadingCompanyUsers || isLoadingKpiSmartFrequencies || isLoadingKpiSmartStatuses;

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

export default KpiSmartLiberatedFormPage;