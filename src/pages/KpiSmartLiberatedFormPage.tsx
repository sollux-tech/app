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
import { Loader2 } from 'lucide-react';
import MultiSelect, { MultiSelectOption } from '@/components/MultiSelect';
import DatePicker from '@/components/DatePicker';
import { format } from 'date-fns'; // Importar format
import { BasicProfileInfo } from '@/types/profile';
import { useCompany } from '@/components/CompanyContext';
import { Label } from '@/components/ui/label';

// Helper para converter string vazia para undefined para campos opcionais de número
const emptyStringToUndefined = z.preprocess(
  (val) => (val === "" ? undefined : val),
  z.any()
);

const formSchema = z.object({
  kpi_smart_id: z.string().min(1, { message: 'O KPI Smart é obrigatório.' }),
  pillar_id: z.string().min(1, { message: 'O pilar é obrigatório.' }),
  execution_user_ids: z.array(z.string()).optional().nullable(),
  view_user_ids: z.array(z.string()).optional().nullable(),
  kpi_smart_frequency_id: z.string().min(1, { message: 'A frequência de monitoramento é obrigatória.' }),
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
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const { id: kpiSmartLiberatedId } = useParams<{ id: string }>();
  const isEditing = !!kpiSmartLiberatedId;

  const [selectedPillarIdForKpiSmart, setSelectedPillarIdForKpiSmart] = useState<string>('');
  const [selectedKpiSmartDetails, setSelectedKpiSmartDetails] = useState<KpiSmart | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
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

  const { data: editingKpiSmartLiberated, isLoading: isLoadingEditingKpiSmartLiberated } = useQuery<KpiSmartLiberated, Error>({
    queryKey: ['kpiSmartLiberated', kpiSmartLiberatedId],
    queryFn: async () => {
      if (!kpiSmartLiberatedId || !user?.id) throw new Error("ID do KPI Smart Liberado ou usuário faltando.");
      const { data, error } = await supabase
        .from('kpi_smarts_liberated')
        .select(`
          *,
          kpi_smarts(id, description, pillar_id, user_id, code, kpi_smart_type_id, kpi_smart_action_verb_id, kpi_smart_focus_id, kpi_smart_unit_id, status, created_at, kpi_smart_types(description, code), kpi_smart_focuses(description), kpi_smart_units(description)),
          kpi_smart_frequencies(description),
          kpi_smart_statuses(description, id)
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
      setSelectedPillarIdForKpiSmart(kpiSmartPillarId);
      
      const fetchKpiSmartDetails = async () => {
        if (editingKpiSmartLiberated.kpi_smart_id) {
          const { data: kpiDetails, error } = await supabase
            .from('kpi_smarts')
            .select('id, description, pillar_id, user_id, code, kpi_smart_type_id, kpi_smart_action_verb_id, kpi_smart_focus_id, kpi_smart_unit_id, status, created_at, kpi_smart_types(description, code), kpi_smart_focuses(description), kpi_smart_units(description)')
            .eq('id', editingKpiSmartLiberated.kpi_smart_id)
            .single();
          if (error) {
            console.error("Erro ao buscar detalhes do KPI Smart:", error);
          } else {
            // Ensure kpiDetails conforms to KpiSmart type before setting state
            if (kpiDetails) {
              setSelectedKpiSmartDetails({
                ...kpiDetails,
                user_id: kpiDetails.user_id || '', // Provide default values if missing
                code: kpiDetails.code || 0,
                kpi_smart_type_id: kpiDetails.kpi_smart_type_id || '',
                kpi_smart_action_verb_id: kpiDetails.kpi_smart_action_verb_id || '',
                kpi_smart_focus_id: kpiDetails.kpi_smart_focus_id || '',
                kpi_smart_unit_id: kpiDetails.kpi_smart_unit_id || '',
                status: kpiDetails.status || 'active',
                created_at: kpiDetails.created_at || new Date().toISOString(),
                // Ensure nested objects are correctly typed or handle potential nulls
                kpi_smart_types: kpiDetails.kpi_smart_types ? (Array.isArray(kpiDetails.kpi_smart_types) ? kpiDetails.kpi_smart_types[0] : kpiDetails.kpi_smart_types) : null,
                kpi_smart_focuses: kpiDetails.kpi_smart_focuses ? (Array.isArray(kpiDetails.kpi_smart_focuses) ? kpiDetails.kpi_smart_focuses[0] : kpiDetails.kpi_smart_focuses) : null,
                kpi_smart_units: kpiDetails.kpi_smart_units ? (Array.isArray(kpiDetails.kpi_smart_units) ? kpiDetails.kpi_smart_units[0] : kpiDetails.kpi_smart_units) : null,
              });
            }
          }
        }
      };

      fetchKpiSmartDetails();

      const timer = setTimeout(() => {
        form.reset({
          kpi_smart_id: editingKpiSmartLiberated.kpi_smart_id,
          pillar_id: kpiSmartPillarId,
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
      }, 100);
      return () => clearTimeout(timer);
    } else if (!isEditing) {
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
      setSelectedPillarIdForKpiSmart('');
      setSelectedKpiSmartDetails(null);
    }
  }, [isEditing, editingKpiSmartLiberated, form]);

  const { data: kpiSmarts, isLoading: isLoadingKpiSmarts } = useQuery<KpiSmart[], Error>({
    queryKey: ['kpiSmartsListForLiberatedForm', user?.id, selectedPillarIdForKpiSmart],
    queryFn: async () => {
      if (!user?.id || !selectedPillarIdForKpiSmart) return [];
      const { data, error } = await supabase
        .from('kpi_smarts')
        .select('id, description, pillar_id, user_id, code, kpi_smart_type_id, kpi_smart_action_verb_id, kpi_smart_focus_id, kpi_smart_unit_id, status, created_at, kpi_smart_types(description, code), kpi_smart_focuses(description), kpi_smart_units(description)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .eq('pillar_id', selectedPillarIdForKpiSmart)
        .order('description', { ascending: true });
      if (error) throw error;
      // Ensure the returned data matches the KpiSmart type, including nested objects
      return data.map(item => ({
        ...item,
        // Explicitly handle nested objects, ensuring they match the expected structure
        kpi_smart_types: item.kpi_smart_types ? (Array.isArray(item.kpi_smart_types) ? item.kpi_smart_types[0] : item.kpi_smart_types) : null,
        kpi_smart_focuses: item.kpi_smart_focuses ? (Array.isArray(item.kpi_smart_focuses) ? item.kpi_smart_focuses[0] : item.kpi_smart_focuses) : null,
        kpi_smart_units: item.kpi_smart_units ? (Array.isArray(item.kpi_smart_units) ? item.kpi_smart_units[0] : item.kpi_smart_units) : null,
        // Add other potentially missing top-level properties with default values if necessary
        user_id: item.user_id || '',
        code: item.code || 0,
        kpi_smart_type_id: item.kpi_smart_type_id || '',
        kpi_smart_action_verb_id: item.kpi_smart_action_verb_id || '',
        kpi_smart_focus_id: item.kpi_smart_focus_id || '',
        kpi_smart_unit_id: item.kpi_smart_unit_id || '',
        status: item.status || 'active',
        created_at: item.created_at || new Date().toISOString(),
      })) as KpiSmart[];
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

  const { data: allRelevantUsers, isLoading: isLoadingAllRelevantUsers } = useQuery<BasicProfileInfo[], Error>({
    queryKey: ['allRelevantUsersForKpiSmartLiberatedForm', user?.id, selectedCompany?.id],
    queryFn: async () => {
      if (!user?.id || !selectedCompany?.id) return [];

      const userIds = new Set<string>();
      userIds.add(user.id);

      const { data: companyOwner, error: ownerError } = await supabase
        .from('companies')
        .select('user_id')
        .eq('id', selectedCompany.id)
        .single();
      if (ownerError) console.error("Error fetching company owner:", ownerError);
      if (companyOwner?.user_id) userIds.add(companyOwner.user_id);

      const { data: sharedUsers, error: sharedError } = await supabase
        .from('company_shares')
        .select('shared_with_user_id')
        .eq('company_id', selectedCompany.id);
      if (sharedError) console.error("Error fetching shared users:", sharedError);
      sharedUsers?.forEach(su => userIds.add(su.shared_with_user_id));

      const uniqueUserIds = Array.from(userIds);

      if (uniqueUserIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', uniqueUserIds);
      if (profilesError) throw profilesError;
      return profiles;
    },
    enabled: !!user?.id && !!selectedCompany?.id,
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

  const relevantUserOptions: MultiSelectOption[] = useMemo(() => {
    return allRelevantUsers?.map(p => ({
      value: p.id,
      label: `${p.first_name || ''} ${p.last_name || ''}`.trim() || `Usuário ${p.id.substring(0, 8)}`
    })) || [];
  }, [allRelevantUsers]);

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
      if (!user?.id || !selectedCompany?.id) throw new Error("Usuário não autenticado ou empresa não selecionada.");
      console.log("Creating KPI Smart Liberated with data:", data);
      const { data: newKpiSmartLiberated, error } = await supabase
        .from('kpi_smarts_liberated')
        .insert({
          kpi_smart_id: data.kpi_smart_id,
          user_id: user.id,
          company_id: selectedCompany.id,
          execution_user_ids: data.execution_user_ids,
          view_user_ids: data.view_user_ids,
          kpi_smart_frequency_id: data.kpi_smart_frequency_id,
          kpi_smart_status_id: data.kpi_smart_status_id,
          pillar_id: data.pillar_id,
          
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
      if (!user?.id || !selectedCompany?.id) throw new Error("Usuário não autenticado ou empresa não selecionada.");
      console.log("Updating KPI Smart Liberated with data:", data);
      const { data: updatedKpiSmartLiberatedResult, error } = await supabase
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
        .eq('company_id', selectedCompany.id)
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
      pillar_id: data.pillar_id,
      execution_user_ids: form.getValues('execution_user_ids') || null,
      view_user_ids: form.getValues('view_user_ids') || null,
      kpi_smart_frequency_id: form.getValues('kpi_smart_frequency_id'),
      kpi_smart_status_id: form.getValues('kpi_smart_status_id'),

      logical_comparator: form.getValues('logical_comparator') || null,
      base_value: form.getValues('base_value') || null,
      target_value: form.getValues('target_value') || null,
      deadline_date: form.getValues('deadline_date') || null,

      planned_delivery_date: form.getValues('planned_delivery_date') || null,
      actual_delivery_date: form.getValues('actual_delivery_date') || null,
      progress_percentage: form.getValues('progress_percentage') || null,

      planned_frequency: form.getValues('planned_frequency') || null,
      planned_executions: form.getValues('planned_executions') || null,
      performed_executions: form.getValues('performed_executions') || null,

      min_value: form.getValues('min_value') || null,
      max_value: form.getValues('max_value') || null,
      current_value: form.getValues('current_value') || null,
    };
    if (isEditing) {
      updateKpiSmartLiberatedMutation.mutate(payload);
    } else {
      createKpiSmartLiberatedMutation.mutate(payload);
    }
  };

  const isLoadingForm = createKpiSmartLiberatedMutation.isPending || updateKpiSmartLiberatedMutation.isPending || isLoadingEditingKpiSmartLiberated || isLoadingPillars || isLoadingKpiSmarts || isLoadingKpiSmartStatuses || isLoadingKpiSmartFrequencies || isLoadingAllRelevantUsers;

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
          <CardDescription className="text-lg text-muted-foreground">
            {isEditing ? 'Atualize os detalhes do KPI Smart liberado.' : 'Selecione um KPI Smart para liberá-lo para uso.'}
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
                      setSelectedPillarIdForKpiSmart(value); // Atualiza o estado para filtrar KPIs
                      form.setValue('kpi_smart_id', ''); // Limpar KPI Smart ao mudar o pilar
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
                            <SelectItem key={pillar.id} value={pillar.id}>
                              {pillar.description}
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
                name="kpi_smart_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">KPI Smart</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      const details = kpiSmarts?.find(k => k.id === value);
                      setSelectedKpiSmartDetails(details || null);
                      // Atualizar o pilar_id no formulário se o KPI Smart selecionado tiver um pilar associado
                      if (details?.pillar_id && form.getValues('pillar_id') !== details.pillar_id) {
                        form.setValue('pillar_id', details.pillar_id);
                        setSelectedPillarIdForKpiSmart(details.pillar_id);
                      }
                    }} value={field.value} disabled={isLoadingKpiSmarts || !selectedPillarIdForKpiSmart || isLoadingForm}>
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
                        {isLoadingKpiSmartFrequencies ? (
                          <SelectItem value="loading-frequencies" disabled>Carregando Frequências...</SelectItem>
                        ) : (kpiSmartFrequencies && kpiSmartFrequencies.length === 0) ? (
                          <SelectItem value="no-frequencies" disabled>Nenhuma Frequência cadastrada</SelectItem>
                        ) : (
                          kpiSmartFrequencies?.map((frequency) => (
                            <SelectItem key={frequency.id} value={frequency.id}>
                              {frequency.description}
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
                            <SelectItem key={status.id} value={status.id}>
                              {status.description}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Exibir detalhes do KPI Smart selecionado */}
              {selectedKpiSmartDetails && (
                <Card className="bg-card/50 border border-border shadow-sm rounded-lg p-4">
                  <CardTitle className="text-lg font-bold text-foreground mb-4">Detalhes do KPI Smart Selecionado</CardTitle>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      <Label className="text-foreground">Tipo:</Label>
                      <p className="text-muted-foreground">{selectedKpiSmartDetails.kpi_smart_types?.description || 'N/A'}</p>
                    </div>
                    <div className="flex flex-col">
                      <Label className="text-foreground">Foco:</Label>
                      <p className="text-muted-foreground">{selectedKpiSmartDetails.kpi_smart_focuses?.description || 'N/A'}</p>
                    </div>
                    <div className="flex flex-col">
                      <Label className="text-foreground">Unidade:</Label>
                      <p className="text-muted-foreground">{selectedKpiSmartDetails.kpi_smart_units?.description || 'N/A'}</p>
                    </div>
                  </div>
                </Card>
              )}

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
                        <FormItem className="md:col-span-2">
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

              <FormField
                control={form.control}
                name="execution_user_ids"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Usuários com Permissão de Execução</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={relevantUserOptions}
                        selected={field.value || []}
                        onChange={field.onChange}
                        placeholder="Selecione os usuários para execução..."
                        disabled={isLoadingAllRelevantUsers || isLoadingForm}
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
                    <FormLabel className="text-foreground">Usuários com Permissão de Visualização</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={relevantUserOptions}
                        selected={field.value || []}
                        onChange={field.onChange}
                        placeholder="Selecione os usuários para visualização..."
                        disabled={isLoadingAllRelevantUsers || isLoadingForm}
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
                  {isEditing ? 'Salvar Alterações' : 'Liberar KPI Smart'}
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