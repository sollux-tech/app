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
import { UserType } from '@/types/userType';
import { KpiSmartFrequency } from '@/types/kpiSmartFrequency';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import MultiSelect, { MultiSelectOption } from '@/components/MultiSelect';
import DatePicker from '@/components/DatePicker';
import { format } from 'date-fns';

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

  // Campos para tipo 'Quantitativo'
  logical_comparator: z.string().optional(),
  base_value: emptyStringToUndefined.pipe(z.coerce.number().optional()),
  target_value: emptyStringToUndefined.pipe(z.coerce.number().optional()),

  // Campos para tipo 'Marco'
  planned_delivery_date: z.date().optional(),
  actual_delivery_date: z.date().optional(),
  progress_percentage: emptyStringToUndefined.pipe(z.coerce.number().min(0).max(100).optional()),

  // Campos para tipo 'Frequência'
  planned_frequency: z.string().optional(),
  planned_executions: emptyStringToUndefined.pipe(z.coerce.number().int().positive().optional()),
  performed_executions: emptyStringToUndefined.pipe(z.coerce.number().int().positive().optional()),

  // Campos para tipo 'Intervalo'
  min_value: emptyStringToUndefined.pipe(z.coerce.number().optional()),
  max_value: emptyStringToUndefined.pipe(z.coerce.number().optional()),
  current_value: emptyStringToUndefined.pipe(z.coerce.number().optional()),
});

const KpiSmartLiberatedFormPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const navigate = useNavigate();
  const { id: kpiSmartLiberatedId } = useParams<{ id: string }>();
  const isEditing = !!kpiSmartLiberatedId;

  const [selectedPillarIdForKpiSmart, setSelectedPillarIdForKpiSmart] = useState<string>('');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      kpi_smart_id: '',
      pillar_id: '',
      execution_user_types: [],
      view_user_types: [],
      kpi_smart_frequency_id: '',
      logical_comparator: '',
      base_value: undefined,
      target_value: undefined,
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

  // Fetch existing KpiSmartLiberated for editing
  const { data: editingKpiSmartLiberated, isLoading: isLoadingEditingKpiSmartLiberated } = useQuery<KpiSmartLiberated, Error>({
    queryKey: ['kpiSmartLiberated', kpiSmartLiberatedId],
    queryFn: async () => {
      if (!kpiSmartLiberatedId) throw new Error("ID do KPI Smart Liberado está faltando.");
      const { data, error } = await supabase
        .from('kpi_smarts_liberated')
        .select(`
          *,
          kpi_smarts(pillar_id, kpi_smart_types(description, code), kpi_smart_focuses(description), kpi_smart_units(description)),
          kpi_smart_frequencies(description)
        `)
        .eq('id', kpiSmartLiberatedId)
        .eq('user_id', user?.id)
        .single();
      if (error) throw error;
      return {
        ...data,
        kpi_smarts: Array.isArray(data.kpi_smarts) ? data.kpi_smarts[0] : data.kpi_smarts,
        kpi_smart_frequencies: Array.isArray(data.kpi_smart_frequencies) ? data.kpi_smart_frequencies[0] : data.kpi_smart_frequencies,
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
        
        // Campos Quantitativos
        logical_comparator: editingKpiSmartLiberated.logical_comparator || '',
        base_value: editingKpiSmartLiberated.base_value || undefined,
        target_value: editingKpiSmartLiberated.target_value || undefined,

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
        logical_comparator: '',
        base_value: undefined,
        target_value: undefined,
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

  const { data: kpiSmarts, isLoading: isLoadingKpiSmarts } = useQuery<KpiSmart[], Error>({
    queryKey: ['kpiSmartsListForLiberatedForm', user?.id, selectedPillarIdForKpiSmart],
    queryFn: async () => {
      if (!user?.id) return [];
      let query = supabase
        .from('kpi_smarts')
        .select('*, kpi_smart_types(description, code), kpi_smart_focuses(description), kpi_smart_units(description)')
        .eq('user_id', user.id)
        .eq('status', 'active');
      
      if (selectedPillarIdForKpiSmart) {
        query = query.eq('pillar_id', selectedPillarIdForKpiSmart);
      }

      const { data, error } = await query.order('description', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!selectedPillarIdForKpiSmart,
  });

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

  const { data: userTypes, isLoading: isLoadingUserTypes } = useQuery<UserType[], Error>({
    queryKey: ['userTypesForKpiSmartLiberatedForm'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_types')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: kpiSmartFrequencies, isLoading: isLoadingKpiSmartFrequencies } = useQuery<KpiSmartFrequency[], Error>({
    queryKey: ['kpiSmartFrequenciesForKpiSmartLiberatedForm', user?.id],
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

  const userTypeOptions: MultiSelectOption[] = useMemo(() => {
    return userTypes?.map(ut => ({ value: ut.id, label: ut.name })) || [];
  }, [userTypes]);

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
          
          // Campos Quantitativos
          logical_comparator: data.logical_comparator,
          base_value: data.base_value,
          target_value: data.target_value,

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
      const { data: updatedKpiSmartLiberated, error } = await supabase
        .from('kpi_smarts_liberated')
        .update({
          kpi_smart_id: data.kpi_smart_id,
          execution_user_types: data.execution_user_types,
          view_user_types: data.view_user_types,
          kpi_smart_frequency_id: data.kpi_smart_frequency_id,

          // Campos Quantitativos
          logical_comparator: data.logical_comparator,
          base_value: data.base_value,
          target_value: data.target_value,

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
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    const payload: KpiSmartLiberatedFormData = {
      kpi_smart_id: data.kpi_smart_id,
      execution_user_types: data.execution_user_types || [],
      view_user_types: data.view_user_types || [],
      kpi_smart_frequency_id: data.kpi_smart_frequency_id,
      
      // Campos Quantitativos
      logical_comparator: data.logical_comparator,
      base_value: data.base_value,
      target_value: data.target_value,

      // Campos Marco
      planned_delivery_date: data.planned_delivery_date,
      actual_delivery_date: data.actual_delivery_date,
      progress_percentage: data.progress_percentage,

      // Campos Frequência
      planned_frequency: data.planned_frequency,
      planned_executions: data.planned_executions,
      performed_executions: data.performed_executions,

      // Campos Intervalo
      min_value: data.min_value,
      max_value: data.max_value,
      current_value: data.current_value,
    };
    if (isEditing) {
      updateKpiSmartLiberatedMutation.mutate(payload);
    } else {
      createKpiSmartLiberatedMutation.mutate(payload);
    }
  };

  const isLoadingForm = isLoadingEditingKpiSmartLiberated || isLoadingKpiSmarts || isLoadingPillars || isLoadingUserTypes || isLoadingKpiSmartFrequencies || createKpiSmartLiberatedMutation.isPending || updateKpiSmartLiberatedMutation.isPending;

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
    <div className="flex flex-col items-center justify-center">
      <Card className="w-full max-w-2xl bg-card backdrop-blur-md rounded-2xl shadow-lg p-6 text-center border border-border">
        <CardHeader>
          <CardTitle className="text-3xl font-bold mb-2 text-foreground">
            {isEditing ? 'Editar KPI Smart Liberado' : 'Liberar Novo KPI Smart'}
          </CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            {isEditing ? 'Atualize o KPI Smart liberado.' : 'Selecione um KPI Smart para liberá-lo para uso.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-8">
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
                      form.setValue('kpi_smart_id', ''); // Clear selected KPI Smart when pillar changes
                    }} value={field.value} disabled={isLoadingPillars || isEditing}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Selecione um pilar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {pillars?.length === 0 ? (
                          <SelectItem value="no-pillars" disabled>Nenhum pilar cadastrado</SelectItem>
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
                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedPillarIdForKpiSmart || isLoadingKpiSmarts || kpiSmarts?.length === 0}>
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
                        ) : kpiSmarts?.length === 0 ? (
                          <SelectItem value="no-kpis" disabled>Nenhum KPI Smart ativo para este pilar</SelectItem>
                        ) : (
                          kpiSmarts?.map((kpi) => (
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

              {selectedKpiSmart && (
                <Card className="bg-muted/50 border border-border shadow-sm rounded-lg p-4 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">Tipo do KPI:</span> {selectedKpiSmart.kpi_smart_types?.description || 'N/A'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">Foco:</span> {selectedKpiSmart.kpi_smart_focuses?.description || 'N/A'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">Unidade de Medida:</span> {selectedKpiSmart.kpi_smart_units?.description || 'N/A'}
                  </p>
                </Card>
              )}

              {/* Campos Condicionais */}
              {kpiSmartTypeCode === 1 && ( // Quantitativo
                <>
                  <FormField
                    control={form.control}
                    name="logical_comparator"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Comparador Lógico</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingForm}>
                          <FormControl>
                            <SelectTrigger className="rounded-lg">
                              <SelectValue placeholder="Selecione um comparador" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value=">=">&gt;= (Maior ou Igual)</SelectItem>
                            <SelectItem value="<=">&lt;= (Menor ou Igual)</SelectItem>
                            <SelectItem value="=">= (Igual)</SelectItem>
                            <SelectItem value=">">&gt; (Maior)</SelectItem>
                            <SelectItem value="<">&lt; (Menor)</SelectItem>
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
                          <Input type="number" step="0.01" placeholder="Ex: 100.00" {...field} className="rounded-lg" disabled={isLoadingForm} />
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
                        <FormLabel className="text-foreground">Valor Meta</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="Ex: 120.00" {...field} className="rounded-lg" disabled={isLoadingForm} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {kpiSmartTypeCode === 2 && ( // Marco
                <>
                  <FormField
                    control={form.control}
                    name="planned_delivery_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-foreground text-left">Data Prevista Entrega</FormLabel>
                        <FormControl>
                          <DatePicker
                            date={field.value}
                            setDate={field.onChange}
                            placeholder="Selecione a data prevista"
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
                        <FormLabel className="text-foreground text-left">Data Real Entrega</FormLabel>
                        <FormControl>
                          <DatePicker
                            date={field.value}
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
                        <FormLabel className="text-foreground">Percentual de Progresso (0-100)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="Ex: 75.50" {...field} className="rounded-lg" disabled={isLoadingForm} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {kpiSmartTypeCode === 3 && ( // Frequência
                <>
                  <FormField
                    control={form.control}
                    name="planned_frequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Frequência Planejada</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Semanal, Mensal" {...field} className="rounded-lg" disabled={isLoadingForm} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="planned_executions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Execuções Previstas</FormLabel>
                        <FormControl>
                          <Input type="number" step="1" placeholder="Ex: 4" {...field} className="rounded-lg" disabled={isLoadingForm} />
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
                          <Input type="number" step="1" placeholder="Ex: 3" {...field} className="rounded-lg" disabled={isLoadingForm} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {kpiSmartTypeCode === 4 && ( // Intervalo
                <>
                  <FormField
                    control={form.control}
                    name="min_value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Valor Mínimo</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="Ex: 0.00" {...field} className="rounded-lg" disabled={isLoadingForm} />
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
                          <Input type="number" step="0.01" placeholder="Ex: 100.00" {...field} className="rounded-lg" disabled={isLoadingForm} />
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
                          <Input type="number" step="0.01" placeholder="Ex: 50.00" {...field} className="rounded-lg" disabled={isLoadingForm} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

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
                        {kpiSmartFrequencies?.length === 0 ? (
                          <SelectItem value="no-frequencies" disabled>Nenhuma frequência cadastrada</SelectItem>
                        ) : (
                          kpiSmartFrequencies?.map((freq) => (
                            freq.id && freq.id !== '' ? (
                              <SelectItem key={freq.id} value={freq.id}>
                                {freq.description}
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
                name="execution_user_types"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Nível de Execução (Tipos de Usuário)</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={userTypeOptions}
                        selected={field.value || []}
                        onChange={field.onChange}
                        placeholder="Selecione os tipos de usuário para execução..."
                        disabled={isLoadingUserTypes || isLoadingForm}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="view_user_types"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Nível de Visualização (Tipos de Usuário)</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={userTypeOptions}
                        selected={field.value || []}
                        onChange={field.onChange}
                        placeholder="Selecione os tipos de usuário para visualização..."
                        disabled={isLoadingUserTypes || isLoadingForm}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate('/ops/shift/kpi-smarts-liberated')} disabled={isLoadingForm} className="rounded-lg">
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoadingForm || !form.formState.isValid} className="rounded-lg bg-sollux-red hover:bg-sollux-orange">
                  {isLoadingForm ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isEditing ? 'Salvando...' : 'Liberando...'}
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