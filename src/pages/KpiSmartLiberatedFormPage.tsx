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
import { Loader2 } from 'lucide-react'; // Importar Edit e Trash2
import MultiSelect, { MultiSelectOption } from '@/components/MultiSelect';
import DatePicker from '@/components/DatePicker';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Label } from '@/components/ui/label'; // Importar Label

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

  // Campos Frequência
  planned_frequency: z.string().optional().nullable(),
  planned_executions: emptyStringToUndefined.pipe(z.coerce.number().int().positive().optional().nullable()),
  performed_executions: emptyStringToUndefined.pipe(z.coerce.number().int().positive().optional().nullable()),

  // Campos Intervalo
  min_value: emptyStringToUndefined.pipe(z.coerce.number().optional().nullable()),
  max_value: emptyStringToUndefined.pipe(z.coerce.number().optional().nullable()),
  current_value: emptyStringToUndefined.pipe(z.coerce.number().optional().nullable()),
});

const KpiSmartLiberatedFormPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const navigate = useNavigate();
  const { id: kpiSmartLiberatedId } = useParams<{ id: string }>();
  const isEditing = !!kpiSmartLiberatedId;

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

  const [selectedPillarIdForKpiSmart, setSelectedPillarIdForKpiSmart] = useState<string>('');

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

  useEffect(() => {
    if (isEditing && editingKpiSmartLiberated) {
      const kpiSmartPillarId = (editingKpiSmartLiberated.kpi_smarts as any)?.pillar_id || '';
      form.reset({
        kpi_smart_id: editingKpiSmartLiberated.kpi_smart_id,
        pillar_id: kpiSmartPillarId,
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
      setSelectedPillarIdForKpiSmart(kpiSmartPillarId);
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
  }, [isEditing, editingKpiSmartLiberated, form]);

  // Query para buscar todos os Pilares (para filtros e formulário)
  const { data: pillars, isLoading: isLoadingPillars } = useQuery<Pillar[], Error>({
    queryKey: ['pillarsListForKpiSmartLiberatedForm', user?.id],
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
    queryKey: ['kpiSmartsListForLiberatedForm', user?.id, selectedPillarIdForKpiSmart],
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

  const { data: kpiSmartFrequencies, isLoading: isLoadingKpiSmartFrequencies } = useQuery<KpiSmartFrequency[], Error>({
    queryKey: ['kpiSmartFrequenciesListForLiberatedForm', user?.id],
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

  const selectedKpiSmart = kpiSmarts?.find(kpi => kpi.id === form.watch('kpi_smart_id'));
  const kpiSmartTypeCode = selectedKpiSmart?.kpi_smart_types?.code;

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpiSmartsLiberated', user?.id] });
      showSuccess(`KPI Smart Liberado ${isEditing ? 'atualizado' : 'criado'} com sucesso!`);
      navigate('/ops/shift/kpi-smarts-liberated');
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
  });

  const updateKpiSmartLiberatedMutation = useMutation({
    mutationFn: async (data: KpiSmartLiberatedFormData) => {
      if (!kpiSmartLiberatedId) throw new Error("ID do KPI Smart Liberado está faltando.");
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { data: updatedKpiSmartLiberatedResult, error } = await supabase
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
      return updatedKpiSmartLiberatedResult;
    },
    ...mutationOptions,
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

  const isLoadingForm = createKpiSmartLiberatedMutation.isPending || updateKpiSmartLiberatedMutation.isPending || isLoadingEditingKpiSmartLiberated || isLoadingPillars || isLoadingKpiSmarts || isLoadingKpiSmartStatuses || isLoadingKpiSmartFrequencies;

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
        <CardHeader>
          <CardTitle className="text-foreground uppercase font-bold">
            {isEditing ? 'Editar KPI Smart Liberado' : 'Liberar Novo KPI Smart'}
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                      form.setValue('kpi_smart_id', ''); // Resetar KPI Smart ao mudar o pilar
                    }} value={field.value} disabled={isLoadingPillars || isLoadingForm}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Selecione um Pilar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingPillars ? (
                          <SelectItem value="loading-pillars" disabled>Carregando Pilares...</SelectItem>
                        ) : (pillars && pillars.length === 0) ? (
                          <SelectItem value="no-pillars" disabled>Nenhum Pilar cadastrado</SelectItem>
                        ) : (
                          pillars?.map((pillar) => (
                            pillar.id && pillar.id !== '' ? (
                              <SelectItem key={pillar.id} value={pillar.id}>
                                {pillar.description}
                              </SelectItem>
                            ) : null
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
                name="kpi_smart_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">KPI Smart</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedPillarIdForKpiSmart || isLoadingKpiSmarts || (kpiSmarts && kpiSmarts.length === 0) || isLoadingForm}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Selecione um KPI Smart" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {!selectedPillarIdForKpiSmart ? (
                          <SelectItem value="select-pillar" disabled>Selecione um pilar primeiro</SelectItem>
                        ) : isLoadingKpiSmarts ? (
                          <SelectItem value="loading-kpis" disabled>Carregando KPIs Smart...</SelectItem>
                        ) : (kpiSmarts && kpiSmarts.length === 0) ? (
                          <SelectItem value="no-kpis" disabled>Nenhum KPI Smart ativo disponível para este pilar</SelectItem>
                        ) : (
                          kpiSmarts.map((kpi) => (
                            kpi.id && kpi.id !== '' ? (
                              <SelectItem key={kpi.id} value={kpi.id}>
                                {kpi.description}
                              </SelectItem>
                            ) : null
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
                        {isLoadingKpiSmartFrequencies ? (
                          <SelectItem value="loading-frequencies" disabled>Carregando Frequências...</SelectItem>
                        ) : (kpiSmartFrequencies && kpiSmartFrequencies.length === 0) ? (
                          <SelectItem value="no-frequencies" disabled>Nenhuma Frequência cadastrada</SelectItem>
                        ) : (
                          kpiSmartFrequencies?.map((frequency) => (
                            frequency.id && frequency.id !== '' ? (
                              <SelectItem key={frequency.id} value={frequency.id}>
                                {frequency.description}
                              </SelectItem>
                            ) : null
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
                name="kpi_smart_status_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Status do KPI Smart Liberado</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingKpiSmartStatuses || isLoadingForm}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Selecione o Status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingKpiSmartStatuses ? (
                          <SelectItem value="loading-statuses" disabled>Carregando Status...</SelectItem>
                        ) : (kpiSmartStatuses && kpiSmartStatuses.length === 0) ? (
                          <SelectItem value="no-statuses" disabled>Nenhum Status cadastrado</SelectItem>
                        ) : (
                          kpiSmartStatuses?.map((status) => (
                            status.id && status.id !== '' ? (
                              <SelectItem key={status.id} value={status.id}>
                                {status.description}
                              </SelectItem>
                            ) : null
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campos Condicionais baseados no kpiSmartTypeCode */}
              {kpiSmartTypeCode === 1 && ( // Quantitativo
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
                        <FormItem className="flex flex-col">
                          <FormLabel className="text-foreground text-left">Data Limite</FormLabel>
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

              {kpiSmartTypeCode === 2 && ( // Marco
                <Card className="bg-card/50 border border-border shadow-sm rounded-lg p-4">
                  <CardTitle className="text-lg font-bold text-foreground mb-4">Configurações de Marco</CardTitle>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="planned_delivery_date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel className="text-foreground text-left">Data de Entrega Planejada</FormLabel>
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
                        <FormItem className="flex flex-col">
                          <FormLabel className="text-foreground text-left">Data de Entrega Real</FormLabel>
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
                        <FormItem>
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

              {kpiSmartTypeCode === 3 && ( // Frequência
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
                        <FormItem>
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

              {kpiSmartTypeCode === 4 && ( // Intervalo
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
                        <FormItem>
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
                <Button type="button" variant="outline" onClick={() => navigate('/ops/shift/kpi-smarts-liberated')} disabled={isLoadingForm} className="rounded-lg">
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoadingForm} className="rounded-lg bg-sollux-red hover:bg-sollux-orange">
                  {isLoadingForm ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    isEditing ? 'Salvar Alterações' : 'Liberar KPI Smart'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default KpiSmartLiberatedFormPage;