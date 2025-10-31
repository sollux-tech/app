import React, { useState, useEffect, useMemo } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
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
import { KpiSmartStatus } from '@/types/kpiSmartStatus';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate, useParams } from 'react-router-dom';
import { useCompany } from '@/components/CompanyContext';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import MultiSelect, { MultiSelectOption } from '@/components/MultiSelect';
import DatePicker from '@/components/DatePicker';

// Helper para converter string vazia para undefined para campos opcionais de número
const emptyStringToUndefined = z.preprocess(
  (val) => (val === "" ? undefined : val),
  z.any()
);

// Schema completo para o formulário
const formSchema = z.object({
  kpi_smart_id: z.string().min(1, { message: 'O KPI Smart é obrigatório.' }),
  pillar_id: z.string().min(1, { message: 'O pilar é obrigatório.' }),
  execution_user_types: z.array(z.string()).optional(),
  view_user_types: z.array(z.string()).optional(),
  kpi_smart_frequency_id: z.string().min(1, { message: 'A frequência de monitoramento é obrigatória.' }),
  kpi_smart_status_id: z.string().min(1, { message: 'O status é obrigatório.' }),
  logical_comparator: z.string().optional().nullable(),
  base_value: emptyStringToUndefined.pipe(z.coerce.number().optional().nullable()),
  target_value: emptyStringToUndefined.pipe(z.coerce.number().optional().nullable()),
  deadline_date: z.date().optional().nullable(),
  planned_delivery_date: z.date().optional().nullable(),
  actual_delivery_date: z.date().optional().nullable(),
  progress_percentage: emptyStringToUndefined.pipe(z.coerce.number().min(0).max(100).optional().nullable()),
  planned_frequency: z.string().optional().nullable(),
  planned_executions: emptyStringToUndefined.pipe(z.coerce.number().int().positive().optional().nullable()),
  performed_executions: emptyStringToUndefined.pipe(z.coerce.number().int().positive().optional().nullable()),
  min_value: emptyStringToUndefined.pipe(z.coerce.number().optional().nullable()),
  max_value: emptyStringToUndefined.pipe(z.coerce.number().optional().nullable()),
  current_value: emptyStringToUndefined.pipe(z.coerce.number().optional().nullable()),
});

type FormData = z.infer<typeof formSchema>;

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
  const [selectedPillarIdForKpiSmart, setSelectedPillarIdForKpiSmart] = useState<string>('');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      kpi_smart_id: '',
      pillar_id: '',
      execution_user_types: [],
      view_user_types: [],
      kpi_smart_frequency_id: '',
      kpi_smart_status_id: '',
      logical_comparator: '',
      base_value: undefined,
      target_value: undefined,
      deadline_date: undefined,
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

  // Definir isLoadingForm como combinação dos estados de loading
  const isLoadingForm = isLoadingEditingKpiSmartLiberated || isLoadingPillars || isLoadingKpiSmarts || isLoadingKpiSmartFrequencies || isLoadingKpiSmartStatuses;

  // Definir kpiSmartTypeCode baseado no KPI Smart selecionado
  const kpiSmartTypeCode = useMemo(() => {
    const selectedKpiSmartId = form.watch('kpi_smart_id');
    const kpiSmart = kpiSmarts?.find(kpi => kpi.id === selectedKpiSmartId);
    return kpiSmart?.kpi_smart_types?.code || 0;
  }, [form.watch('kpi_smart_id'), kpiSmarts]);

  useEffect(() => {
    if (editingKpiSmartLiberated) {
      const kpiSmartPillarId = (editingKpiSmartLiberated.kpi_smarts as any)?.pillar_id || '';
      form.reset({
        kpi_smart_id: editingKpiSmartLiberated.kpi_smart_id,
        pillar_id: kpiSmartPillarId,
        execution_user_types: editingKpiSmartLiberated.execution_user_types || [],
        view_user_types: editingKpiSmartLiberated.view_user_types || [],
        kpi_smart_frequency_id: editingKpiSmartLiberated.kpi_smart_frequency_id || '',
        kpi_smart_status_id: editingKpiSmartLiberated.kpi_smart_status_id || '',
        logical_comparator: editingKpiSmartLiberated.logical_comparator || '',
        base_value: editingKpiSmartLiberated.base_value || undefined,
        target_value: editingKpiSmartLiberated.target_value || undefined,
        deadline_date: editingKpiSmartLiberated.deadline_date ? new Date(editingKpiSmartLiberated.deadline_date + 'T00:00:00') : undefined,
        planned_delivery_date: editingKpiSmartLiberated.planned_delivery_date ? new Date(editingKpiSmartLiberated.planned_delivery_date + 'T00:00:00') : undefined,
        actual_delivery_date: editingKpiSmartLiberated.actual_delivery_date ? new Date(editingKpiSmartLiberated.actual_delivery_date + 'T00:00:00') : undefined,
        progress_percentage: editingKpiSmartLiberated.progress_percentage || undefined,
        planned_frequency: editingKpiSmartLiberated.planned_frequency || '',
        planned_executions: editingKpiSmartLiberated.planned_executions || undefined,
        performed_executions: editingKpiSmartLiberated.performed_executions || undefined,
        min_value: editingKpiSmartLiberated.min_value || undefined,
        max_value: editingKpiSmartLiberated.max_value || undefined,
        current_value: editingKpiSmartLiberated.current_value || undefined,
      });
      setSelectedPillarIdForKpiSmart(kpiSmartPillarId);
    } else {
      form.reset({
        kpi_smart_id: '',
        pillar_id: '',
        execution_user_types: [],
        view_user_types: [],
        kpi_smart_frequency_id: '',
        kpi_smart_status_id: '',
        logical_comparator: '',
        base_value: undefined,
        target_value: undefined,
        deadline_date: undefined,
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
  }, [editingKpiSmartLiberated, form]);

  // Fetch the KPI Smart Liberated data for editing
  const { data: editingKpiSmartLiberated, isLoading: isLoadingEditingKpiSmartLiberated } = useQuery<KpiSmartLiberated, Error>({
    queryKey: ['kpiSmartLiberated', kpiSmartLiberatedId],
    queryFn: async () => {
      if (!kpiSmartLiberatedId || !user?.id) throw new Error("ID do KPI Smart Liberado ou usuário faltando.");
      const { data, error } = await supabase
        .from('kpi_smarts_liberated')
        .select(`
          *,
          kpi_smarts(description, kpi_smart_types(description, code), kpi_smart_focuses(description), kpi_smart_units(description), pillar_id),
          kpi_smart_frequencies(description),
          kpi_smart_statuses(description)
        `)
        .eq('id', kpiSmartLiberatedId)
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      return {
        ...data,
        kpi_smarts: Array.isArray(data.kpi_smarts) ? data.kpi_smarts[0] : data.kpi_smarts,
        kpi_smart_frequencies: Array.isArray(data.kpi_smart_frequencies) ? data.kpi_smart_frequencies[0] : data.kpi_smart_frequencies,
        kpi_smart_statuses: Array.isArray(data.kpi_smart_statuses) ? data.kpi_smart_statuses[0] : data.kpi_smart_statuses,
      };
    },
    enabled: isEditing && !!user?.id,
    retry: false,
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
    queryKey: ['kpiSmartsListForLiberated', user?.id, selectedPillarIdForKpiSmart],
    queryFn: async () => {
      if (!user?.id || !selectedPillarIdForKpiSmart) return [];
      const { data, error } = await supabase
        .from('kpi_smarts')
        .select('*, kpi_smart_types(description, code), kpi_smart_focuses(description), kpi_smart_units(description)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .eq('pillar_id', selectedPillarIdForKpiSmart)
        .order('description', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!selectedPillarIdForKpiSmart,
  });

  // Query para buscar todos os Status de KPI Smart (para o formulário)
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

  const { data: kpiSmartFrequencies, isLoading: isLoadingKpiSmartFrequencies } = useQuery<KpiSmartFrequency[], Error>({
    queryKey: ['kpiSmartFrequenciesListForLiberated', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('kpi_smart_frequencies')
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

  const createKpiSmartLiberatedMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const payload: KpiSmartLiberatedFormData = {
        kpi_smart_id: data.kpi_smart_id,
        execution_user_types: data.execution_user_types,
        view_user_types: data.view_user_types,
        kpi_smart_frequency_id: data.kpi_smart_frequency_id,
        kpi_smart_status_id: data.kpi_smart_status_id,
        logical_comparator: data.logical_comparator,
        base_value: data.base_value,
        target_value: data.target_value,
        deadline_date: data.deadline_date ? format(data.deadline_date, 'yyyy-MM-dd') : null,
        planned_delivery_date: data.planned_delivery_date ? format(data.planned_delivery_date, 'yyyy-MM-dd') : null,
        actual_delivery_date: data.actual_delivery_date ? format(data.actual_delivery_date, 'yyyy-MM-dd') : null,
        progress_percentage: data.progress_percentage,
        planned_frequency: data.planned_frequency,
        planned_executions: data.planned_executions,
        performed_executions: data.performed_executions,
        min_value: data.min_value,
        max_value: data.max_value,
        current_value: data.current_value,
      };
      const { data: newKpiSmartLiberated, error } = await supabase
        .from('kpi_smarts_liberated')
        .insert(payload)
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
    mutationFn: async (data: FormData) => {
      if (!kpiSmartLiberatedId) throw new Error("ID do KPI Smart Liberado está faltando.");
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const payload: KpiSmartLiberatedFormData = {
        kpi_smart_id: data.kpi_smart_id,
        execution_user_types: data.execution_user_types,
        view_user_types: data.view_user_types,
        kpi_smart_frequency_id: data.kpi_smart_frequency_id,
        kpi_smart_status_id: data.kpi_smart_status_id,
        logical_comparator: data.logical_comparator,
        base_value: data.base_value,
        target_value: data.target_value,
        deadline_date: data.deadline_date ? format(data.deadline_date, 'yyyy-MM-dd') : null,
        planned_delivery_date: data.planned_delivery_date ? format(data.planned_delivery_date, 'yyyy-MM-dd') : null,
        actual_delivery_date: data.actual_delivery_date ? format(data.actual_delivery_date, 'yyyy-MM-dd') : null,
        progress_percentage: data.progress_percentage,
        planned_frequency: data.planned_frequency,
        planned_executions: data.planned_executions,
        performed_executions: data.performed_executions,
        min_value: data.min_value,
        max_value: data.max_value,
        current_value: data.current_value,
      };
      const { data: updatedKpiSmartLiberated, error } = await supabase
        .from('kpi_smarts_liberated')
        .update(payload)
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
      const { error } = await supabase
        .from('kpi_smarts_liberated')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('KPI Smart Liberado excluído com sucesso!');
    },
  });

  const onSubmit: SubmitHandler<FormData> = (data) => {
    if (isEditing) {
      updateKpiSmartLiberatedMutation.mutate(data);
    } else {
      createKpiSmartLiberatedMutation.mutate(data);
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
        query = query.eq('kpi_smart_status_id', selectedStatusFilter);
      }

      query = query.order('code', { ascending: true });
      const { data, error } = await query;
      if (error) throw error;
      return data.map(item => ({
        ...item,
        kpi_smarts: Array.isArray(item.kpi_smarts) ? item.kpi_smarts[0] : item.kpi_smarts,
      }));
    },
    enabled: !!user?.id,
  });

  const filteredKpiSmartsAcquired = useMemo(() => {
    if (!kpiSmartsLiberated) return [];
    return kpiSmartsLiberated.filter(item => {
      const matchesPillar = selectedPillarFilter === 'all' || item.kpi_smarts?.pillar_id === selectedPillarFilter;
      const matchesStatus = selectedStatusFilter === 'all' || item.kpi_smart_status_id === selectedStatusFilter;
      return matchesPillar && matchesStatus;
    });
  }, [kpiSmartsLiberated, selectedPillarFilter, selectedStatusFilter]);

  if (!selectedCompany) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Por favor, selecione uma empresa na barra lateral para gerenciar os KPIs Smart Liberados.
      </div>
    );
  }

  if (isLoadingKpiSmartsLiberated) {
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
          <Button onClick={handleAddClick} className="bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg">
            <Plus className="mr-2 h-4 w-4" /> Liberar Novo KPI Smart
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div>
              <Label className="text-foreground">Filtrar por Pilar</Label>
              <Select value={selectedPillarFilter} onValueChange={setSelectedPillarFilter}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="Todos os Pilares" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Pilares</SelectItem>
                  {pillars?.map((pillar) => (
                    <SelectItem key={pillar.id} value={pillar.id}>
                      {pillar.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-foreground">Filtrar por Status</Label>
              <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="Todos os Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
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
              {filteredKpiSmartsAcquired.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Nenhum KPI Smart Liberado encontrado para esta empresa.
                  </TableCell>
                </TableRow>
              ) : (
                filteredKpiSmartsAcquired.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-foreground">{item.code}</TableCell>
                    <TableCell className="text-muted-foreground">{item.kpi_smarts?.description || 'N/A'}</TableCell>
                    <TableCell className="text-muted-foreground">{item.kpi_smart_types?.description || 'N/A'}</TableCell>
                    <TableCell className="text-muted-foreground">{item.kpi_smart_focuses?.description || 'N/A'}</TableCell>
                    <TableCell className="text-muted-foreground">{item.kpi_smart_units?.description || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
                        {item.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant<think>[REDACTED]</think><dyad-write path="src/pages/KpiSmartLiberatedManagementPage.tsx" description="Fixing TypeScript compile-time errors by completing the form schema and conditional rendering.">
import React, { useState, useEffect, useMemo } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
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
import { KpiSmartStatus } from '@/types/kpiSmartStatus';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate, useParams } from 'react-router-dom';
import { useCompany } from '@/components/CompanyContext';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import MultiSelect, { MultiSelectOption } from '@/components/MultiSelect';
import DatePicker from '@/components/DatePicker';

// Helper para converter string vazia para undefined para campos opcionais de número
const emptyStringToUndefined = z.preprocess(
  (val) => (val === "" ? undefined : val),
  z.any()
);

// Schema completo para o formulário
const formSchema = z.object({
  kpi_smart_id: z.string().min(1, { message: 'O KPI Smart é obrigatório.' }),
  pillar_id: z.string().min(1, { message: 'O pilar é obrigatório.' }),
  execution_user_types: z.array(z.string()).optional(),
  view_user_types: z.array(z.string()).optional(),
  kpi_smart_frequency_id: z.string().min(1, { message: 'A frequência de monitoramento é obrigatória.' }),
  kpi_smart_status_id: z.string().min(1, { message: 'O status é obrigatório.' }),
  logical_comparator: z.string().optional().nullable(),
  base_value: emptyStringToUndefined.pipe(z.coerce.number().optional().nullable()),
  target_value: emptyStringToUndefined.pipe(z.coerce.number().optional().nullable()),
  deadline_date: z.date().optional().nullable(),
  planned_delivery_date: z.date().optional().nullable(),
  actual_delivery_date: z.date().optional().nullable(),
  progress_percentage: emptyStringToUndefined.pipe(z.coerce.number().min(0).max(100).optional().nullable()),
  planned_frequency: z.string().optional().nullable(),
  planned_executions: emptyStringToUndefined.pipe(z.coerce.number().int().positive().optional().nullable()),
  performed_executions: emptyStringToUndefined.pipe(z.coerce.number().int().positive().optional().nullable()),
  min_value: emptyStringToUndefined.pipe(z.coerce.number().optional().nullable()),
  max_value: emptyStringToUndefined.pipe(z.coerce.number().optional().nullable()),
  current_value: emptyStringToUndefined.pipe(z.coerce.number().optional().nullable()),
});

type FormData = z.infer<typeof formSchema>;

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
  const [selectedPillarIdForKpiSmart, setSelectedPillarIdForKpiSmart] = useState<string>('');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      kpi_smart_id: '',
      pillar_id: '',
      execution_user_types: [],
      view_user_types: [],
      kpi_smart_frequency_id: '',
      kpi_smart_status_id: '',
      logical_comparator: '',
      base_value: undefined,
      target_value: undefined,
      deadline_date: undefined,
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

  // Definir isLoadingForm como combinação dos estados de loading
  const isLoadingForm = isLoadingEditingKpiSmartLiberated || isLoadingPillars || isLoadingKpiSmarts || isLoadingKpiSmartFrequencies || isLoadingKpiSmartStatuses;

  // Definir kpiSmartTypeCode baseado no KPI Smart selecionado
  const kpiSmartTypeCode = useMemo(() => {
    const selectedKpiSmartId = form.watch('kpi_smart_id');
    const kpiSmart = kpiSmarts?.find(kpi => kpi.id === selectedKpiSmartId);
    return kpiSmart?.kpi_smart_types?.code || 0;
  }, [form.watch('kpi_smart_id'), kpiSmarts]);

  useEffect(() => {
    if (editingKpiSmartLiberated) {
      const kpiSmartPillarId = (editingKpiSmartLiberated.kpi_smarts as any)?.pillar_id || '';
      form.reset({
        kpi_smart_id: editingKpiSmartLiberated.kpi_smart_id,
        pillar_id: kpiSmartPillarId,
        execution_user_types: editingKpiSmartLiberated.execution_user_types || [],
        view_user_types: editingKpiSmartLiberated.view_user_types || [],
        kpi_smart_frequency_id: editingKpiSmartLiberated.kpi_smart_frequency_id || '',
        kpi_smart_status_id: editingKpiSmartLiberated.kpi_smart_status_id || '',
        logical_comparator: editingKpiSmartLiberated.logical_comparator || '',
        base_value: editingKpiSmartLiberated.base_value || undefined,
        target_value: editingKpiSmartLiberated.target_value || undefined,
        deadline_date: editingKpiSmartLiberated.deadline_date ? new Date(editingKpiSmartLiberated.deadline_date + 'T00:00:00') : undefined,
        planned_delivery_date: editingKpiSmartLiberated.planned_delivery_date ? new Date(editingKpiSmartLiberated.planned_delivery_date + 'T00:00:00') : undefined,
        actual_delivery_date: editingKpiSmartLiberated.actual_delivery_date ? new Date(editingKpiSmartLiberated.actual_delivery_date + 'T00:00:00') : undefined,
        progress_percentage: editingKpiSmartLiberated.progress_percentage || undefined,
        planned_frequency: editingKpiSmartLiberated.planned_frequency || '',
        planned_executions: editingKpiSmartLiberated.planned_executions || undefined,
        performed_executions: editingKpiSmartLiberated.performed_executions || undefined,
        min_value: editingKpiSmartLiberated.min_value || undefined,
        max_value: editingKpiSmartLiberated.max_value || undefined,
        current_value: editingKpiSmartLiberated.current_value || undefined,
      });
      setSelectedPillarIdForKpiSmart(kpiSmartPillarId);
    } else {
      form.reset({
        kpi_smart_id: '',
        pillar_id: '',
        execution_user_types: [],
        view_user_types: [],
        kpi_smart_frequency_id: '',
        kpi_smart_status_id: '',
        logical_comparator: '',
        base_value: undefined,
        target_value: undefined,
        deadline_date: undefined,
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
  }, [editingKpiSmartLiberated, form]);

  // Fetch the KPI Smart Liberated data for editing
  const { data: editingKpiSmartLiberated, isLoading: isLoadingEditingKpiSmartLiberated } = useQuery<KpiSmartLiberated, Error>({
    queryKey: ['kpiSmartLiberated', kpiSmartLiberatedId],
    queryFn: async () => {
      if (!kpiSmartLiberatedId || !user?.id) throw new Error("ID do KPI Smart Liberado ou usuário faltando.");
      const { data, error }<think>[REDACTED]</think><dyad-write path="src/pages/KpiSmartLiberatedManagementPage.tsx" description="Fixing TypeScript compile-time errors by completing the form schema, removing duplicates, and ensuring proper variable usage.">
import React, { useState, useEffect, useMemo } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
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
import { KpiSmartStatus } from '@/types/kpiSmartStatus';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate, useParams } from 'react-router-dom';
import { useCompany } from '@/components/CompanyContext';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import MultiSelect, { MultiSelectOption } from '@/components/MultiSelect';
import DatePicker from '@/components/DatePicker';

// Helper para converter string vazia para undefined para campos opcionais de número
const emptyStringToUndefined = z.preprocess(
  (val) => (val === "" ? undefined : val),
  z.any()
);

// Schema completo para o formulário
const formSchema = z.object({
  kpi_smart_id: z.string().min(1, { message: 'O KPI Smart é obrigatório.' }),
  pillar_id: z.string().min(1, { message: 'O pilar é obrigatório.' }),
  execution_user_types: z.array(z.string()).optional(),
  view_user_types: z.array(z.string()).optional(),
  kpi_smart_frequency_id: z.string().min(1, { message: 'A frequência de monitoramento é obrigatória.' }),
  kpi_smart_status_id: z.string().min(1, { message: 'O status é obrigatório.' }),
  logical_comparator: z.string().optional().nullable(),
  base_value: emptyStringToUndefined.pipe(z.coerce.number().optional().nullable()),
  target_value: emptyStringToUndefined.pipe(z.coerce.number().optional().nullable()),
  deadline_date: z.date().optional().nullable(),
  planned_delivery_date: z.date().optional().nullable(),
  actual_delivery_date: z.date().optional().nullable(),
  progress_percentage: emptyStringToUndefined.pipe(z.coerce.number().min(0).max(100).optional().nullable()),
  planned_frequency: z.string().optional().nullable(),
  planned_executions: emptyStringToUndefined.pipe(z.coerce.number().int().positive().optional().nullable()),
  performed_executions: emptyStringToUndefined.pipe(z.coerce.number().int().positive().optional().nullable()),
  min_value: emptyStringToUndefined.pipe(z.coerce.number().optional().nullable()),
  max_value: emptyStringToUndefined.pipe(z.coerce.number().optional().nullable()),
  current_value: emptyStringToUndefined.pipe(z.coerce.number().optional().nullable()),
});

type FormData = z.infer<typeof formSchema>;

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
  const [selectedPillarIdForKpiSmart, setSelectedPillarIdForKpiSmart] = useState<string>('');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      kpi_smart_id: '',
      pillar_id: '',
      execution_user_types: [],
      view_user_types: [],
      kpi_smart_frequency_id: '',
      kpi_smart_status_id: '',
      logical_comparator: '',
      base_value: undefined,
      target_value: undefined,
      deadline_date: undefined,
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

  // Definir isLoadingForm como combinação dos estados de loading
  const isLoadingForm = isLoadingEditingKpiSmartLiberated || isLoadingPillars || isLoadingKpiSmarts || isLoadingKpiSmartFrequencies || isLoadingKpiSmartStatuses;

  // Definir kpiSmartTypeCode baseado no KPI Smart selecionado
  const kpiSmartTypeCode = useMemo(() => {
    const selectedKpiSmartId = form.watch('kpi_smart_id');
    const kpiSmart = kpiSmarts?.find(kpi => kpi.id === selectedKpiSmartId);
    return kpiSmart?.kpi_smart_types?.code || 0;
  }, [form.watch('kpi_smart_id'), kpiSmarts]);

  useEffect(() => {
    if (editingKpiSmartLiberated) {
      const kpiSmartPillarId = (editingKpiSmartLiberated.kpi_smarts as any)?.pillar_id || '';
      form.reset({
        kpi_smart_id: editingKpiSmartLiberated.kpi_smart_id,
        pillar_id: kpiSmartPillarId,
        execution_user_types: editingKpiSmartLiberated.execution_user_types || [],
        view_user_types: editingKpiSmartLiberated.view_user_types || [],
        kpi_smart_frequency_id: editingKpiSmartLiberated.kpi_smart_frequency_id || '',
        kpi_smart_status_id: editingKpiSmartLiberated.kpi_smart_status_id || '',
        logical_comparator: editingKpiSmartLiberated.logical_comparator || '',
        base_value: editingKpiSmartLiberated.base_value || undefined,
        target_value: editingKpiSmartLiberated.target_value || undefined,
        deadline_date: editingKpiSmartLiberated.deadline_date ? new Date(editingKpiSmartLiberated.deadline_date + 'T00:00:00') : undefined,
        planned_delivery_date: editingKpiSmartLiberated.planned_delivery_date ? new Date(editingKpiSmartLiberated.planned_delivery_date + 'T00:00:00') : undefined,
        actual_delivery_date: editingKpiSmartLiberated.actual_delivery_date ? new Date(editingKpiSmartLiberated.actual_delivery_date + 'T00:00:00') : undefined,
        progress_percentage: editingKpiSmartLiberated.progress_percentage || undefined,
        planned_frequency: editingKpiSmartLiberated.planned_frequency || '',
        planned_executions: editingKpiSmartLiberated.planned_executions || undefined,
        performed_executions: editingKpiSmartLiberated.performed_executions || undefined,
        min_value: editingKpiSmartLiberated.min_value || undefined,
        max_value: editingKpiSmartLiberated.max_value || undefined,
        current_value: editingKpiSmartLiberated.current_value || undefined,
      });
      setSelectedPillarIdForKpiSmart(kpiSmartPillarId);
    } else {
      form.reset({
        kpi_smart_id: '',
        pillar_id: '',
        execution_user_types: [],
        view_user_types: [],
        kpi_smart_frequency_id: '',
        kpi_smart_status_id: '',
        logical_comparator: '',
        base_value: undefined,
        target_value: undefined,
        deadline_date: undefined,
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
  }, [editingKpiSmartLiberated, form]);

  // Fetch the KPI Smart Liberated data for editing
  const { data: editingKpiSmartLiberated, isLoading: isLoadingEditingKpiSmartLiberated } = useQuery<KpiSmartLiberated, Error>({
    queryKey: ['kpiSmartLiberated', kpiSmartLiberatedId],
    queryFn: async () => {
      if (!kpiSmartLiberatedId || !user?.id) throw new Error("ID do KPI Smart Liberado ou usuário faltando.");
      const { data, error } = await supabase
        .from('kpi_smarts_liberated')
        .select(`
          *,
          kpi_smarts(description, kpi_smart_types(description, code), kpi_smart_focuses(description), kpi_smart_units(description), pillar_id),
          kpi_smart_frequencies(description),
          kpi_smart_statuses(description)
        `)
        .eq('id', kpiSmartLiberatedId)
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      return {
        ...data,
        kpi_smarts: Array.isArray(data.kpi_smarts) ? data.kpi_smarts[0] : data.kpi_smarts,
        kpi_smart_frequencies: Array.isArray(data.kpi_smart_frequencies) ? data.kpi_smart_frequencies[0] : data.kpi_smart_frequencies,
        kpi_smart_statuses: Array.isArray(data.kpi_smart_statuses) ? data.kpi_smart_statuses[0] : data.kpi_smart_statuses,
      };
    },
    enabled: isEditing && !!user?.id,
    retry: false,
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
    queryKey: ['kpiSmartsListForLiberated', user?.id, selectedPillarIdForKpiSmart],
    queryFn: async () => {
      if (!user?.id || !selectedPillarIdForKpiSmart) return [];
      const { data, error } = await supabase
        .from('kpi_smarts')
        .select('*, kpi_smart_types(description, code), kpi_smart_focuses(description), kpi_smart_units(description)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .eq('pillar_id', selectedPillarIdForKpiSmart)
        .order('description', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!selectedPillarIdForKpiSmart,
  });

  // Query para buscar todos os Status de KPI Smart (para o formulário)
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

  const { data: kpiSmartFrequencies, isLoading: isLoadingKpiSmartFrequencies } = useQuery<KpiSmartFrequency[], Error>({
    queryKey: ['kpiSmartFrequenciesListForLiberated', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('kpi_smart_frequencies')
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

  const createKpiSmartLiberatedMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const payload: KpiSmartLiberatedFormData = {
        kpi_smart_id: data.kpi_smart_id,
        execution_user_types: data.execution_user_types,
        view_user_types: data.view_user_types,
        kpi_smart_frequency_id: data.kpi_smart_frequency_id,
        kpi_smart_status_id: data.kpi_smart_status_id,
        logical_comparator: data.logical_comparator,
        base_value: data.base_value,
        target_value: data.target_value,
        deadline_date: data.deadline_date ? format(data.deadline_date, 'yyyy-MM-dd') : null,
        planned_delivery_date: data.planned_delivery_date ? format(data.planned_delivery_date, 'yyyy-MM-dd') : null,
        actual_delivery_date: data.actual_delivery_date ? format(data.actual_delivery_date, 'yyyy-MM-dd') : null,
        progress_percentage: data.progress_percentage,
        planned_frequency: data.planned_frequency,
        planned_executions: data.planned_executions,
        performed_executions: data.performed_executions,
        min_value: data.min_value,
        max_value: data.max_value,
        current_value: data.current_value,
      };
      const { data: newKpiSmartLiberated, error } = await supabase
        .from('kpi_smarts_liberated')
        .insert(payload)
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
    mutationFn: async (data: FormData) => {
      if (!kpiSmartLiberatedId) throw new Error("ID do KPI Smart Liberado está faltando.");
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const payload: KpiSmartLiberatedFormData = {
        kpi_smart_id: data.kpi_smart_id,
        execution_user_types: data.execution_user_types,
        view_user_types: data.view_user_types,
        kpi_smart_frequency_id: data.kpi_smart_frequency_id,
        kpi_smart_status_id: data.kpi_smart_status_id,
        logical_comparator: data.logical_comparator,
        base_value: data.base_value,
        target_value: data.target_value,
        deadline_date: data.deadline_date ? format(data.deadline_date, 'yyyy-MM-dd') : null,
        planned_delivery_date: data.planned_delivery_date ? format(data.planned_delivery_date, 'yyyy-MM-dd') : null,
        actual_delivery_date: data.actual_delivery_date ? format(data.actual_delivery_date, 'yyyy-MM-dd') : null,
        progress_percentage: data.progress_percentage,
        planned_frequency: data.planned_frequency,
        planned_executions: data.planned_executions,
        performed_executions: data.performed_executions,
        min_value: data.min_value,
        max_value: data.max_value,
        current_value: data.current_value,
      };
      const { data: updatedKpiSmartLiberated, error } = await supabase
        .from('kpi_smarts_liberated')
        .update(payload)
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
      const { error } = await supabase
        .from('kpi_smarts_liberated')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('KPI Smart Liberado excluído com sucesso!');
    },
  });

  const onSubmit: SubmitHandler<FormData> = (data) => {
    if (isEditing) {
      updateKpiSmartLiberatedMutation.mutate(data);
    } else {
      createKpiSmartLiberatedMutation.mutate(data);
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

  const filteredKpiSmartsAcquired = useMemo(() => {
    if (!kpiSmartsLiberated) return [];
    return kpiSmartsLiberated.filter(item => {
      const matchesPillar = selectedPillarFilter === 'all' || item.kpi_smarts?.pillar_id === selectedPillarFilter;
      const matchesStatus = selectedStatusFilter === 'all' || item.kpi_smart_status_id === selectedStatusFilter;
      return matchesPillar && matchesStatus;
    });
  }, [kpiSmartsLiberated, selectedPillarFilter, selectedStatusFilter]);

  if (!selectedCompany) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Por favor, selecione uma empresa na barra lateral para gerenciar os KPIs Smart Liberados.
      </div>
    );
  }

  if (isEditing && isLoadingEditingKpiSmartLiberated) {
    return <div className="text-center text-muted-foreground">Carregando KPI Smart Liberado...</div>;
  }

  if (isEditing && !editingKpiSmartLiberated && !isLoadingEditingKpiSmartLiberated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Card className="w-full max-w-md bg-card backdrop-blur-md rounded-2xl shadow-lg p-6 text-center border border-border">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-sollux-red">KPI Smart Liberado não encontrado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">O KPI Smart Liberado que você está tentando editar não existe ou você não tem permissão.</p>
            <Button onClick={() => navigate('/ops/shift/kpi-smarts-liberated')} className="mt-4 rounded-lg bg-sollux-red hover:bg-sollux-orange">
              Voltar para KPIs Smart Liberados
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground uppercase font-bold">Gerenciar KPIs Smart Liberados</CardTitle>
          <Button onClick={handleAddClick} className="bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg">
            <Plus className="mr-2 h-4 w-4" /> Liberar Novo KPI Smart
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div>
              <Label htmlFor="pillar-filter" className="text-foreground">Filtrar por Pilar</Label>
              <Select value={selectedPillarFilter} onValueChange={setSelectedPillarFilter}>
                <SelectTrigger className="rounded-lg">
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
              <Select value={selectedKpiSmartFilter} onValueChange={setSelectedKpiSmartFilter}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="Todos os KPIs Smart" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os KPIs Smart</SelectItem>
                  {kpiSmarts?.map((kpi) => (
                    <SelectItem key={kpi.id} value={kpi.id}>
                      {kpi.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status-filter" className="text-foreground">Filtrar por Status</Label>
              <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
                <SelectTrigger className="rounded-lg">
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
              {filteredKpiSmartsAcquired.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Nenhum KPI Smart Liberado encontrado para esta empresa.
                  </TableCell>
                </TableRow>
              ) : (
                filteredKpiSmartsAcquired.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-foreground">{item.code}</TableCell>
                    <TableCell className="text-muted-foreground">{item.kpi_smarts?.description || 'N/A'}</TableCell>
                    <TableCell className="text-muted-foreground">{item.kpi_smarts?.kpi_smart_types?.description || 'N/A'}</TableCell>
                    <TableCell className="text-muted-foreground">{item.kpi_smarts?.kpi_smart_focuses?.description || 'N/A'}</TableCell>
                    <TableCell className="text-muted-foreground">{item.kpi_smarts?.kpi_smart_units?.description || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={item.kpi_smart_statuses?.description === 'Ativo' ? 'default' : 'secondary'}>
                        {item.kpi_smart_statuses?.description || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(item)}
                        className="mr-2 text-foreground hover:bg-accent rounded-lg"
                        disabled={isLoadingForm}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick(item.id)}
                        className="bg-sollux-red hover:bg-red-700 text-white rounded-lg"
                        disabled={isLoadingForm}
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-card backdrop-blur-md rounded-2xl shadow-lg border border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {isEditing ? 'Editar KPI Smart Liberado' : 'Liberar Novo KPI Smart'}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="pillar_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Pilar</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedPillarIdForKpiSmart(value);
                      form.setValue('kpi_smart_id', '');
                    }} value={field.value} disabled={isLoadingForm}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Selecione um Pilar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {pillars?.map((pillar) => (
                          <SelectItem key={pillar.id} value={pillar.id}>
                            {pillar.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="kpi_smart_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">KPI Smart</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedPillarIdForKpiSmart || isLoadingKpiSmarts || isLoadingForm}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Selecione um KPI Smart" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {!selectedPillarIdForKpiSmart ? (
                          <SelectItem value="select-pillar" disabled>Selecione um pilar primeiro</SelectItem>
                        ) : isLoadingKpiSmarts ? (
                          <SelectItem value="loading" disabled>Carregando KPIs Smart...</SelectItem>
                        ) : kpiSmarts?.length === 0 ? (
                          <SelectItem value="no-kpis" disabled>Nenhum KPI Smart disponível para este pilar</SelectItem>
                        ) : (
                          kpiSmarts?.map((kpi) => (
                            <SelectItem key={kpi.id} value={kpi.id}>
                              {kpi.description}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="kpi_smart_frequency_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Frequência de Monitoramento</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingKpiSmartFrequencies || isLoadingForm}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Selecione a frequência" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {kpiSmartFrequencies?.map((frequency) => (
                          <SelectItem key={frequency.id} value={frequency.id}>
                            {frequency.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="kpi_smart_status_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Status do KPI Smart Liberado</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingKpiSmartStatuses || isLoadingForm}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {kpiSmartStatuses?.map((status) => (
                          <SelectItem key={status.id} value={status.id}>
                            {status.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campos Condicionais baseados no tipo de KPI Smart */}
              {kpiSmartTypeCode === 1 && (
                <Card className="bg-card/50 border border-border shadow-sm rounded-lg p-4">
                  <CardTitle className="text-lg font-bold text-foreground mb-4">Configurações Quantitativas</CardTitle>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="logical_comparator"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">Comparador Lógico</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''} disabled={isLoadingForm}>
                            <FormControl>
                              <SelectTrigger className="rounded-lg">
                                <SelectValue placeholder="Selecione um comparador" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value=">=">&gt;= (Maior ou Igual)</SelectItem>
                              <SelectItem value="<=">&lt;= (Menor ou Igual)</SelectItem>
                              <SelectItem value="=">= (Igual)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="base_value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">Valor Base</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="Ex: 100" {...field} disabled={isLoadingForm} className="rounded-lg" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="target_value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">Valor Alvo</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="Ex: 120" {...field} disabled={isLoadingForm} className="rounded-lg" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deadline_date"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="text-foreground">Data Limite</FormLabel>
                          <FormControl>
                            <DatePicker
                              date={field.value || undefined}
                              setDate={field.onChange}
                              placeholder="Selecione a data limite"
                              disabled={isLoadingForm}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </Card>
              )}

              {kpiSmartTypeCode === 2 && (
                <Card className="bg-card/50 border border-border shadow-sm rounded-lg p-4">
                  <CardTitle className="text-lg font-bold text-foreground mb-4">Configurações de Marco</CardTitle>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="planned_delivery_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">Data de Entrega Planejada</FormLabel>
                          <FormControl>
                            <DatePicker
                              date={field.value || undefined}
                              setDate={field.onChange}
                              placeholder="Selecione a data planejada"
                              disabled={isLoadingForm}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="actual_delivery_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">Data de Entrega Real</FormLabel>
                          <FormControl>
                            <DatePicker
                              date={field.value || undefined}
                              setDate={field.onChange}
                              placeholder="Selecione a data real"
                              disabled={isLoadingForm}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="progress_percentage"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="text-foreground">Progresso (%)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="Ex: 75" {...field} disabled={isLoadingForm} className="rounded-lg" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </Card>
              )}

              {kpiSmartTypeCode === 3 && (
                <Card className="bg-card/50 border border-border shadow-sm rounded-lg p-4">
                  <CardTitle className="text-lg font-bold text-foreground mb-4">Configurações de Frequência</CardTitle>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="planned_frequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">Frequência Planejada</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''} disabled={isLoadingForm}>
                            <FormControl>
                              <SelectTrigger className="rounded-lg">
                                <SelectValue placeholder="Selecione a frequência" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Diário">Diário</SelectItem>
                              <SelectItem value="Semanal">Semanal</SelectItem>
                              <SelectItem value="Mensal">Mensal</SelectItem>
                              <SelectItem value="Trimestral">Trimestral</SelectItem>
                              <SelectItem value="Anual">Anual</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="planned_executions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">Execuções Planejadas</FormLabel>
                          <FormControl>
                            <Input type="number" step="1" placeholder="Ex: 10" {...field} disabled={isLoadingForm} className="rounded-lg" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="performed_executions"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="text-foreground">Execuções Realizadas</FormLabel>
                          <FormControl>
                            <Input type="number" step="1" placeholder="Ex: 7" {...field} disabled={isLoadingForm} className="rounded-lg" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </Card>
              )}

              {kpiSmartTypeCode === 4 && (
                <Card className="bg-card/50 border border-border shadow-sm rounded-lg p-4">
                  <CardTitle className="text-lg font-bold text-foreground mb-4">Configurações de Intervalo</CardTitle>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="min_value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">Valor Mínimo</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="Ex: 0" {...field} disabled={isLoadingForm} className="rounded-lg" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="max_value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">Valor Máximo</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="Ex: 100" {...field} disabled={isLoadingForm} className="rounded-lg" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="current_value"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="text-foreground">Valor Atual</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="Ex: 50" {...field} disabled={isLoadingForm} className="rounded-lg" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </Card>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isLoadingForm} className="rounded-lg">
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoadingForm} className="rounded-lg bg-sollux-red hover:bg-sollux-orange">
                  {isEditing ? 'Salvar Alterações' : 'Liberar KPI Smart'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KpiSmartLiberatedManagementPage;