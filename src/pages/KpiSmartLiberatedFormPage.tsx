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
import { Pillar } from '@/types/pillar';
import { KpiSmart } from '@/types/kpiSmart';
import { KpiSmartFrequency } from '@/types/kpiSmartFrequency';
import { KpiSmartStatus } from '@/types/kpiSmartStatus';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import DatePicker from '@/components/DatePicker';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import MultiSelect from '@/components/MultiSelect';
import { Profile } from '@/types/profile';

const emptyStringToUndefined = z.preprocess(
  (val) => (val === "" ? undefined : val),
  z.any()
);

const kpiSmartLiberatedFormSchema = z.object({
  kpi_smart_id: z.string().min(1, { message: 'O KPI Smart é obrigatório.' }),
  pillar_id: z.string().min(1, { message: 'O Pilar é obrigatório.' }),
  execution_user_ids: z.array(z.string()).optional().nullable(),
  view_user_ids: z.array(z.string()).optional().nullable(),
  kpi_smart_frequency_id: z.string().min(1, { message: 'A frequência é obrigatória.' }),
  kpi_smart_status_id: z.string().min(1, { message: 'O status é obrigatório.' }),

  // Campos para tipo 'Quantitativo'
  logical_comparator: z.string().optional().nullable(),
  base_value: emptyStringToUndefined.pipe(z.coerce.number().optional().nullable()),
  target_value: emptyStringToUndefined.pipe(z.coerce.number().optional().nullable()),
  deadline_date: z.date().optional().nullable(),

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
  const navigate = useNavigate();
  const { id: kpiSmartLiberatedId } = useParams<{ id: string }>();
  const isEditing = !!kpiSmartLiberatedId;

  const form = useForm<KpiSmartLiberatedFormData>({
    resolver: zodResolver(kpiSmartLiberatedFormSchema),
    defaultValues: {
      kpi_smart_id: '',
      pillar_id: '',
      execution_user_ids: [],
      view_user_ids: [],
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

  const selectedKpiSmartId = form.watch('kpi_smart_id');
  const selectedPillarId = form.watch('pillar_id');

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

  const { data: kpiSmarts, isLoading: isLoadingKpiSmarts } = useQuery<KpiSmart[], Error>({
    queryKey: ['kpiSmartsListForKpiSmartLiberatedForm', user?.id, selectedPillarId],
    queryFn: async () => {
      if (!user?.id || !selectedPillarId) return [];
      const { data, error } = await supabase
        .from('kpi_smarts')
        .select('*, kpi_smart_types(code, description), kpi_smart_focuses(description), kpi_smart_units(description)')
        .eq('user_id', user.id)
        .eq('pillar_id', selectedPillarId)
        .order('description', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!selectedPillarId,
  });

  const { data: kpiSmartFrequencies, isLoading: isLoadingKpiSmartFrequencies } = useQuery<KpiSmartFrequency[], Error>({
    queryKey: ['kpiSmartFrequenciesListForKpiSmartLiberatedForm', user?.id],
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

  const { data: kpiSmartStatuses, isLoading: isLoadingKpiSmartStatuses } = useQuery<KpiSmartStatus[], Error>({
    queryKey: ['kpiSmartStatusesListForKpiSmartLiberatedForm', user?.id],
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

  const { data: allUsers, isLoading: isLoadingAllUsers } = useQuery<Profile[], Error>({
    queryKey: ['allUsersForKpiSmartLiberated'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, first_name, last_name');
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const userOptions = useMemo(() => {
    return allUsers?.map(u => ({
      value: u.id,
      label: `${u.first_name || ''} ${u.last_name || ''}`.trim() || `Usuário ${u.id.substring(0, 8)}`
    })) || [];
  }, [allUsers]);

  const selectedKpiSmartDetails = useMemo(() => {
    return kpiSmarts?.find(kpi => kpi.id === selectedKpiSmartId);
  }, [kpiSmarts, selectedKpiSmartId]);

  const { data: editingKpiSmartLiberated, isLoading: isLoadingEditingKpiSmartLiberated } = useQuery<KpiSmartLiberated, Error>({
    queryKey: ['kpiSmartLiberated', kpiSmartLiberatedId],
    queryFn: async () => {
      if (!user?.id || !kpiSmartLiberatedId) throw new Error("Usuário ou ID do KPI Smart Liberado faltando.");
      const { data, error } = await supabase
        .from('kpi_smarts_liberated')
        .select('*')
        .eq('id', kpiSmartLiberatedId)
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isEditing && !!user?.id,
    retry: false,
  });

  useEffect(() => {
    if (isEditing && editingKpiSmartLiberated) {
      form.reset({
        kpi_smart_id: editingKpiSmartLiberated.kpi_smart_id,
        pillar_id: editingKpiSmartLiberated.kpi_smarts?.pillar_id || '',
        execution_user_ids: editingKpiSmartLiberated.execution_user_ids || [],
        view_user_ids: editingKpiSmartLiberated.view_user_ids || [],
        kpi_smart_frequency_id: editingKpiSmartLiberated.kpi_smart_frequency_id || '',
        kpi_smart_status_id: editingKpiSmartLiberated.kpi_smart_status_id || '',

        logical_comparator: editingKpiSmartLiberated.logical_comparator || '',
        base_value: editingKpiSmartLiberated.base_value || undefined,
        target_value: editingKpiSmartLiberated.target_value || undefined,
        deadline_date: editingKpiSmartLiberated.deadline_date ? new Date(editingKpiSmartLiberated.deadline_date) : undefined,

        planned_delivery_date: editingKpiSmartLiberated.planned_delivery_date ? new Date(editingKpiSmartLiberated.planned_delivery_date) : undefined,
        actual_delivery_date: editingKpiSmartLiberated.actual_delivery_date ? new Date(editingKpiSmartLiberated.actual_delivery_date) : undefined,
        progress_percentage: editingKpiSmartLiberated.progress_percentage || undefined,

        planned_frequency: editingKpiSmartLiberated.planned_frequency || '',
        planned_executions: editingKpiSmartLiberated.planned_executions || undefined,
        performed_executions: editingKpiSmartLiberated.performed_executions || undefined,

        min_value: editingKpiSmartLiberated.min_value || undefined,
        max_value: editingKpiSmartLiberated.max_value || undefined,
        current_value: editingKpiSmartLiberated.current_value || undefined,
      });
    } else if (!isEditing) {
      form.reset({
        kpi_smart_id: '',
        pillar_id: '',
        execution_user_ids: [],
        view_user_ids: [],
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
    }
  }, [isEditing, editingKpiSmartLiberated, form]);

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
          user_id: user.id,
          kpi_smart_id: data.kpi_smart_id,
          pillar_id: data.pillar_id,
          execution_user_ids: data.execution_user_ids,
          view_user_ids: data.view_user_ids,
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
          pillar_id: data.pillar_id,
          execution_user_ids: data.execution_user_ids,
          view_user_ids: data.view_user_ids,
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

  const onSubmit = (data: KpiSmartLiberatedFormData) => {
    if (isEditing) {
      updateKpiSmartLiberatedMutation.mutate(data);
    } else {
      createKpiSmartLiberatedMutation.mutate(data);
    }
  };

  const isLoadingForm = isLoadingPillars || isLoadingKpiSmarts || isLoadingKpiSmartFrequencies || isLoadingKpiSmartStatuses || isLoadingAllUsers || (isEditing && isLoadingEditingKpiSmartLiberated) || createKpiSmartLiberatedMutation.isPending || updateKpiSmartLiberatedMutation.isPending;

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
      <Card className="w-full max-w-4xl bg-card backdrop-blur-md rounded-2xl shadow-lg p-6 text-center border border-border">
        <CardHeader>
          <CardTitle className="text-3xl font-bold mb-2 text-foreground">
            {isEditing ? 'Editar KPI Smart Liberado' : 'Liberar Novo KPI Smart'}
          </CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            {isEditing ? 'Atualize os detalhes do KPI Smart liberado.' : 'Selecione um KPI Smart e configure-o para uso.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="pillar_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Pilar</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue('kpi_smart_id', ''); // Reset KPI Smart when pillar changes
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
                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedPillarId || isLoadingKpiSmarts || kpiSmarts?.length === 0 || isEditing}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Selecione um KPI Smart" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {kpiSmarts?.length === 0 ? (
                          <SelectItem value="no-kpis" disabled>Nenhum KPI Smart para este pilar</SelectItem>
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

              {selectedKpiSmartDetails && (
                <Card className="bg-muted/50 border border-border shadow-sm rounded-lg p-4 text-left">
                  <CardTitle className="text-lg font-bold text-foreground mb-2">Detalhes do KPI Smart</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Tipo: {selectedKpiSmartDetails.kpi_smart_types?.description || 'N/A'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Foco: {selectedKpiSmartDetails.kpi_smart_focuses?.description || 'N/A'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Unidade: {selectedKpiSmartDetails.kpi_smart_units?.description || 'N/A'}
                  </p>
                </Card>
              )}

              <FormField
                control={form.control}
                name="kpi_smart_frequency_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Frequência de Monitoramento</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingKpiSmartFrequencies}>
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
                name="kpi_smart_status_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Status do KPI Smart Liberado</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingKpiSmartStatuses}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {kpiSmartStatuses?.length === 0 ? (
                          <SelectItem value="no-statuses" disabled>Nenhum status cadastrado</SelectItem>
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

              <FormField
                control={form.control}
                name="execution_user_ids"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Usuários Responsáveis pela Execução (Opcional)</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={userOptions}
                        selected={field.value || []}
                        onChange={field.onChange}
                        placeholder="Selecione os usuários..."
                        disabled={isLoadingAllUsers}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="view_user_ids"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Usuários com Permissão de Visualização (Opcional)</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={userOptions}
                        selected={field.value || []}
                        onChange={field.onChange}
                        placeholder="Selecione os usuários..."
                        disabled={isLoadingAllUsers}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedKpiSmartDetails?.kpi_smart_types?.code === 1 && ( // Quantitativo
                <>
                  <FormField
                    control={form.control}
                    name="logical_comparator"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Comparador Lógico</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
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
                          <Input type="number" step="0.01" placeholder="Ex: 100" {...field} className="rounded-lg" />
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
                          <Input type="number" step="0.01" placeholder="Ex: 120" {...field} className="rounded-lg" />
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
                </>
              )}

              {selectedKpiSmartDetails?.kpi_smart_types?.code === 2 && ( // Marco
                <>
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
                        <FormLabel className="text-foreground">Percentual de Progresso (0-100)</FormLabel>
                        <FormControl>
                          <Input type="number" step="1" min="0" max="100" placeholder="Ex: 50" {...field} className="rounded-lg" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {selectedKpiSmartDetails?.kpi_smart_types?.code === 3 && ( // Frequência
                <>
                  <FormField
                    control={form.control}
                    name="planned_frequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Frequência Planejada</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Diário, Semanal" {...field} className="rounded-lg" />
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
                        <FormLabel className="text-foreground">Execuções Planejadas</FormLabel>
                        <FormControl>
                          <Input type="number" step="1" placeholder="Ex: 7" {...field} className="rounded-lg" />
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
                          <Input type="number" step="1" placeholder="Ex: 5" {...field} className="rounded-lg" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {selectedKpiSmartDetails?.kpi_smart_types?.code === 4 && ( // Intervalo
                <>
                  <FormField
                    control={form.control}
                    name="min_value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Valor Mínimo</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="Ex: 0" {...field} className="rounded-lg" />
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
                          <Input type="number" step="0.01" placeholder="Ex: 100" {...field} className="rounded-lg" />
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
                          <Input type="number" step="0.01" placeholder="Ex: 75" {...field} className="rounded-lg" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate('/ops/shift/kpi-smarts-liberated')} disabled={isLoadingForm} className="rounded-lg">
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoadingForm} className="rounded-lg bg-sollux-red hover:bg-sollux-orange">
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