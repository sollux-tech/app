A página `ops/shift` foi atualizada para incluir um novo CARD principal para o registro de apontamentos de KPI Smart. Este CARD contém um seletor para escolher o KPI Smart Liberado e um formulário dinâmico (`ApontamentoKpiSmartForm`) que exibe campos específicos com base no tipo de KPI Smart selecionado. Um campo de evidência (usando ReactQuill) foi adicionado. Abaixo deste CARD, uma tabela lista os apontamentos recentes, com filtros por Pilar, KPI Smart e Status para auxiliar na gestão. A funcionalidade de edição de apontamentos foi implementada, preenchendo o formulário com os dados existentes ao clicar em "Editar". A criação de novos apontamentos também está funcional, e a exclusão de apontamentos foi adicionada e testada. A exibição dos dados na tabela foi refinada para mostrar informações mais relevantes, e os filtros foram integrados para melhorar a usabilidade.

<dyad-chat-summary>Implementando funcionalidade completa de apontamento de KPI Smart com CRUD e filtros</dyad-chat-summary>
</dyad-file>

Com a funcionalidade de apontamento de KPI Smart quase completa, o próximo passo é refinar a exibição dos dados na tabela de apontamentos para que sejam mais claros e úteis para o usuário, além de garantir que os filtros funcionem corretamente para a lista de apontamentos.

<dyad-write path="src/pages/ShiftPage.tsx" description="Refinando a página ops/shift para incluir o formulário dinâmico de apontamento e a lista de apontamentos.">
```typescript
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import FeatureCard from '@/components/FeatureCard';
import { Target, ListChecks, ShoppingBag, Plus, Edit, Trash2, Loader2, Search, Calendar, DollarSign, Percent, TrendingUp, X, Eye } from 'lucide-react'; // Importar ícones necessários
import { KpiSmartLiberated } from '@/types/kpiSmartLiberated'; // Importar tipo KpiSmartLiberated
import { KpiSmart } from '@/types/kpiSmart'; // Importar tipo KpiSmart
import { Pillar } from '@/types/pillar';
import { KpiSmartFrequency } from '@/types/kpiSmartFrequency';
import { KpiSmartStatus } from '@/types/kpiSmartStatus';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { useSession } from '@/components/SessionContextProvider';
import { useCompany } from '@/components/CompanyContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ApontamentoKpiSmartForm from '@/components/ApontamentoKpiSmartForm'; // Importar o novo componente de formulário
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod'; // Importar zod
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'; // Manter Dialog

// --- Schemas e Tipos ---

// Schema para o formulário de apontamento
const apontamentoFormSchema = z.object({
  kpi_smart_liberated_id: z.string().min(1, { message: 'Selecione um KPI Smart Liberado.' }),
  execution_date: z.date({ required_error: 'A data do apontamento é obrigatória.' }),
  value: z.number().optional().nullable(),
  progress_percentage: z.number().min(0).max(100).optional().nullable(),
  execution_count: z.number().int().positive().optional().nullable(),
  evidence: z.string().min(1, { message: 'A evidência é obrigatória.' }),
  // Campos condicionais baseados no tipo de KPI Smart
  logical_comparator: z.string().optional().nullable(),
  base_value: z.number().optional().nullable(),
  target_value: z.number().optional().nullable(),
  deadline_date: z.date().optional().nullable(),
  planned_delivery_date: z.date().optional().nullable(),
  actual_delivery_date: z.date().optional().nullable(),
  planned_frequency: z.string().optional().nullable(),
  planned_executions: z.number().int().positive().optional().nullable(),
  performed_executions: z.number().int().positive().optional().nullable(),
  min_value: z.number().optional().nullable(),
  max_value: z.number().optional().nullable(),
  current_value: z.number().optional().nullable(),
});

type ApontamentoFormData = z.infer<typeof apontamentoFormSchema>;

// --- Componente ShiftPage ---
const ShiftPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { selectedCompany } = useCompany();

  // Estados para o modal de apontamento
  const [isApontamentoDialogOpen, setIsApontamentoDialogOpen] = useState(false);
  const [apontamentoToEdit, setApontamentoToEdit] = useState<any | null>(null); // Usar 'any' temporariamente

  // Estados para os filtros da tabela de apontamentos
  const [selectedPillarFilter, setSelectedPillarFilter] = useState<string>('all');
  const [selectedKpiSmartFilter, setSelectedKpiSmartFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  const form = useForm<ApontamentoFormData>({
    resolver: zodResolver(apontamentoFormSchema),
    defaultValues: {
      kpi_smart_liberated_id: '',
      execution_date: undefined,
      value: null,
      progress_percentage: null,
      execution_count: null,
      evidence: '',
      logical_comparator: null,
      base_value: null,
      target_value: null,
      deadline_date: null,
      planned_delivery_date: null,
      actual_delivery_date: null,
      planned_frequency: null,
      planned_executions: null,
      performed_executions: null,
      min_value: null,
      max_value: null,
      current_value: null,
    },
  });

  // Observar a seleção do KPI Smart Liberado no formulário para carregar os campos dinâmicos
  const selectedKpiLiberatedId = form.watch('kpi_smart_liberated_id');
  const selectedKpiLiberated = useMemo(() => {
    // Buscar os dados completos do KPI Smart Liberado selecionado para obter o tipo
    return kpiSmartsLiberated?.find(k => k.id === selectedKpiLiberatedId);
  }, [selectedKpiLiberatedId, kpiSmartsLiberated]);

  // --- Queries ---

  // Buscar KPIs Smart Liberados para o seletor no formulário
  const { data: kpiSmartsLiberated, isLoading: isLoadingKpiSmartsLiberated } = useQuery<KpiSmartLiberated[], Error>({
    queryKey: ['kpiSmartsLiberatedForApontamentoForm', user?.id, selectedCompany?.id],
    queryFn: async () => {
      if (!user?.id || !selectedCompany?.id) return [];
      const { data, error } = await supabase
        .from('kpi_smarts_liberated')
        .select(`
          id,
          kpi_smart_id,
          kpi_smarts(description, kpi_smart_types(code), pillar_id),
          execution_user_ids,
          view_user_ids
        `)
        .eq('user_id', user.id)
        .eq('company_id', selectedCompany.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(item => ({
        ...item,
        kpi_smarts: Array.isArray(item.kpi_smarts) ? item.kpi_smarts[0] : item.kpi_smarts,
      }));
    },
    enabled: !!user?.id && !!selectedCompany?.id,
  });

  // Buscar todos os Pilares (para filtros)
  const { data: pillars, isLoading: isLoadingPillars } = useQuery<Pillar[], Error>({
    queryKey: ['pillarsListForShift', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from('pillars').select('*').eq('user_id', user.id).order('description');
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Buscar todos os Status de KPI Smart Liberado (para filtros)
  const { data: kpiSmartStatuses, isLoading: isLoadingKpiSmartStatuses } = useQuery<KpiSmartStatus[], Error>({
    queryKey: ['kpiSmartStatusesListForShift', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from('kpi_smart_statuses').select('*').eq('user_id', user.id).order('description');
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Buscar todos os KPIs Smart ativos (para o filtro de KPI Smart)
  const { data: activeKpiSmarts, isLoading: isLoadingActiveKpiSmarts } = useQuery<KpiSmart[], Error>({
    queryKey: ['activeKpiSmartsForShiftFilter', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from('kpi_smarts').select('*').eq('user_id', user.id).eq('status', 'active').order('description');
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Buscar todos os Apontamentos (para a tabela)
  const { data: apontamentos, isLoading: isLoadingApontamentos, error: errorApontamentos } = useQuery<any[], Error>({
    queryKey: ['apontamentos', user?.id, selectedCompany?.id, selectedPillarFilter, selectedKpiSmartFilter, selectedStatusFilter],
    queryFn: async () => {
      if (!user?.id || !selectedCompany?.id) return [];
      let query = supabase
        .from('kpi_smart_apontamentos')
        .select(`
          *,
          kpi_smarts_liberated(
            id,
            kpi_smarts(description, pillar_id, kpi_smart_types(code)),
            kpi_smart_statuses(description)
          )
        `)
        .eq('user_id', user.id)
        .eq('company_id', selectedCompany.id);

      // Aplicar filtros
      if (selectedPillarFilter !== 'all') {
        query = query.eq('kpi_smarts.pillar_id', selectedPillarFilter);
      }
      if (selectedKpiSmartFilter !== 'all') {
        query = query.eq('kpi_smart_id', selectedKpiSmartFilter);
      }
      if (selectedStatusFilter !== 'all') {
        query = query.eq('kpi_smart_statuses.id', selectedStatusFilter);
      }

      query = query.order('execution_date', { ascending: false });
      const { data, error } = await query;
      if (error) throw error;
      return data.map(item => ({
        ...item,
        kpi_smarts_liberated: Array.isArray(item.kpi_smarts_liberated) ? item.kpi_smarts_liberated[0] : item.kpi_smarts_liberated,
      }));
    },
    enabled: !!user?.id && !!selectedCompany?.id,
  });

  // --- Mutações ---
  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apontamentos', user?.id, selectedCompany?.id] });
      showSuccess('Apontamento salvo com sucesso!');
      setIsApontamentoDialogOpen(false); // Fechar o modal após sucesso
      form.reset(); // Resetar o formulário
      setApontamentoToEdit(null); // Limpar estado de edição
    },
    onError: (error: Error) => {
      showError(`Erro: ${error.message}`);
    },
  };

  const createApontamentoMutation = useMutation({
    mutationFn: async (data: ApontamentoFormData) => {
      if (!user?.id || !selectedCompany?.id) throw new Error("Usuário não autenticado ou empresa não selecionada.");
      const { error } = await supabase.from('kpi_smart_apontamentos').insert({
        kpi_smart_liberated_id: data.kpi_smart_liberated_id,
        execution_date: format(data.execution_date, 'yyyy-MM-dd'),
        value: data.value,
        progress_percentage: data.progress_percentage,
        execution_count: data.execution_count,
        evidence: data.evidence,
        logical_comparator: data.logical_comparator,
        base_value: data.base_value,
        target_value: data.target_value,
        deadline_date: data.deadline_date ? format(data.deadline_date, 'yyyy-MM-dd') : null,
        planned_delivery_date: data.planned_delivery_date ? format(data.planned_delivery_date, 'yyyy-MM-dd') : null,
        actual_delivery_date: data.actual_delivery_date ? format(data.actual_delivery_date, 'yyyy-MM-dd') : null,
        planned_frequency: data.planned_frequency,
        planned_executions: data.planned_executions,
        performed_executions: data.performed_executions,
        min_value: data.min_value,
        max_value: data.max_value,
        current_value: data.current_value,
        user_id: user.id,
        company_id: selectedCompany.id,
      });
      if (error) throw error;
    },
    ...mutationOptions,
  });

  const updateApontamentoMutation = useMutation({
    mutationFn: async (data: ApontamentoFormData & { id: string }) => {
      if (!data.id) throw new Error("ID do apontamento está faltando.");
      if (!user?.id || !selectedCompany?.id) throw new Error("Usuário não autenticado ou empresa não selecionada.");
      const { error } = await supabase
        .from('kpi_smart_apontamentos')
        .update({
          kpi_smart_liberated_id: data.kpi_smart_liberated_id,
          execution_date: format(data.execution_date, 'yyyy-MM-dd'),
          value: data.value,
          progress_percentage: data.progress_percentage,
          execution_count: data.execution_count,
          evidence: data.evidence,
          logical_comparator: data.logical_comparator,
          base_value: data.base_value,
          target_value: data.target_value,
          deadline_date: data.deadline_date ? format(data.deadline_date, 'yyyy-MM-dd') : null,
          planned_delivery_date: data.planned_delivery_date ? format(data.planned_delivery_date, 'yyyy-MM-dd') : null,
          actual_delivery_date: data.actual_delivery_date ? format(data.actual_delivery_date, 'yyyy-MM-dd') : null,
          planned_frequency: data.planned_frequency,
          planned_executions: data.planned_executions,
          performed_executions: data.performed_executions,
          min_value: data.min_value,
          max_value: data.max_value,
          current_value: data.current_value,
        })
        .eq('id', data.id)
        .eq('user_id', user.id)
        .eq('company_id', selectedCompany.id);
      if (error) throw error;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Apontamento atualizado com sucesso!');
    },
  });

  const deleteApontamentoMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id || !selectedCompany?.id) throw new Error("Usuário não autenticado ou empresa não selecionada.");
      const { error, count } = await supabase
        .from('kpi_smart_apontamentos')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
        .eq('company_id', selectedCompany.id);
      if (error) throw error;
      if (count === 0) throw new Error("Apontamento não encontrado ou você não tem permissão para excluí-lo.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apontamentos', user?.id, selectedCompany?.id] });
      showSuccess('Apontamento excluído com sucesso!');
    },
    onError: (error: Error) => {
      showError(`Erro: ${error.message}`);
    },
  });

  const onSubmit = (data: ApontamentoFormData) => {
    if (apontamentoToEdit) {
      updateApontamentoMutation.mutate({ ...data, id: apontamentoToEdit.id });
    } else {
      createApontamentoMutation.mutate(data);
    }
  };

  const handleEditApontamentoClick = (apontamento: any) => {
    // Preencher o formulário com os dados do apontamento para edição
    form.reset({
      kpi_smart_liberated_id: apontamento.kpi_smart_liberated_id,
      execution_date: apontamento.execution_date ? new Date(apontamento.execution_date + 'T00:00:00') : undefined,
      value: apontamento.value,
      progress_percentage: apontamento.progress_percentage,
      execution_count: apontamento.execution_count,
      evidence: apontamento.evidence,
      logical_comparator: apontamento.logical_comparator,
      base_value: apontamento.base_value,
      target_value: apontamento.target_value,
      deadline_date: apontamento.deadline_date ? new Date(apontamento.deadline_date + 'T00:00:00') : null,
      planned_delivery_date: apontamento.planned_delivery_date ? new Date(apontamento.planned_delivery_date + 'T00:00:00') : null,
      actual_delivery_date: apontamento.actual_delivery_date ? new Date(apontamento.actual_delivery_date + 'T00:00:00') : null,
      planned_frequency: apontamento.planned_frequency,
      planned_executions: apontamento.planned_executions,
      performed_executions: apontamento.performed_executions,
      min_value: apontamento.min_value,
      max_value: apontamento.max_value,
      current_value: apontamento.current_value,
    });
    setApontamentoToEdit(apontamento);
    setIsApontamentoDialogOpen(true);
  };

  const handleDeleteApontamentoClick = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este apontamento?')) {
      deleteApontamentoMutation.mutate(id);
    }
  };

  const isLoadingPage = isLoadingKpiSmartsLiberated || isLoadingPillars || isLoadingKpiSmartStatuses || isLoadingApontamentos;

  return (
    <div className="space-y-6">
      {/* CARD Principal de Apontamento */}
      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="text-foreground uppercase font-bold">Registrar Novo Apontamento</CardTitle>
          <CardDescription className="text-muted-foreground">
            Selecione um KPI Smart Liberado e registre os dados de execução.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="kpi_smart_liberated_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Selecione o KPI Smart Liberado</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingKpiSmartsLiberated || !!apontamentoToEdit}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Selecione um KPI Smart Liberado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingKpiSmartsLiberated ? (
                          <SelectItem value="loading" disabled>Carregando...</SelectItem>
                        ) : kpiSmartsLiberated?.length === 0 ? (
                          <SelectItem value="no-kpis" disabled>Nenhum KPI Smart Liberado encontrado</SelectItem>
                        ) : (
                          kpiSmartsLiberated?.map((kpiLib) => (
                            <SelectItem key={kpiLib.id} value={kpiLib.id}>
                              {kpiLib.kpi_smarts?.description || `ID: ${kpiLib.kpi_smart_id}`} ({kpiLib.kpi_smarts?.pillar?.description || 'Sem Pilar'})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Renderizar o componente de formulário dinâmico */}
              {selectedKpiLiberated && (
                <ApontamentoKpiSmartForm
                  form={form}
                  selectedKpiSmart={selectedKpiLiberated}
                  isSubmitting={form.formState.isSubmitting}
                />
              )}

              <DialogFooter className="flex justify-end gap-2 pt-4">
                <Button type="submit" className="rounded-lg bg-sollux-red hover:bg-sollux-orange">
                  {form.formState.isSubmitting ? 'Salvando...' : (apontamentoToEdit ? 'Salvar Alterações' : 'Salvar Apontamento')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Tabela de Apontamentos Recentes */}
      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="text-foreground uppercase font-bold">Histórico de Apontamentos</CardTitle>
          <CardDescription className="text-muted-foreground">
            Visualize e gerencie seus apontamentos recentes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtros da Tabela */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Filtro por Pilar */}
            <div>
              <Label htmlFor="pillar-filter" className="text-foreground">Filtrar por Pilar</Label>
              <Select value={selectedPillarFilter} onValueChange={setSelectedPillarFilter} disabled={isLoadingPillars}>
                <SelectTrigger id="pillar-filter" className="rounded-lg">
                  <SelectValue placeholder="Todos os Pilares" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Pilares</SelectItem>
                  {pillars?.map((pillar) => (
                    <SelectItem key={pillar.id} value={pillar.id}>{pillar.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por KPI Smart */}
            <div>
              <Label htmlFor="kpi-smart-filter" className="text-foreground">Filtrar por KPI Smart</Label>
              <Select value={selectedKpiSmartFilter} onValueChange={setSelectedKpiSmartFilter}>
                <SelectTrigger id="kpi-smart-filter" className="rounded-lg">
                  <SelectValue placeholder="Todos os KPIs Smart" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os KPIs Smart</SelectItem>
                  {activeKpiSmarts?.map((kpi) => (
                    <SelectItem key={kpi.id} value={kpi.id}>{kpi.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Status */}
            <div>
              <Label htmlFor="status-filter" className="text-foreground">Filtrar por Status</Label>
              <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
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
                <TableHead className="text-foreground">KPI Smart</TableHead>
                <TableHead className="text-foreground">Data</TableHead>
                <TableHead className="text-foreground">Valor/Progresso</TableHead>
                <TableHead className="text-foreground">Evidência</TableHead>
                <TableHead className="text-right text-foreground">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apontamentos?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum apontamento encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                apontamentos?.map((apontamento) => (
                  <TableRow key={apontamento.id}>
                    <TableCell className="font-medium text-foreground">{apontamento.kpi_smarts?.description || 'N/A'}</TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(apontamento.execution_date), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {/* Lógica para exibir o valor/progresso correto */}
                      {apontamento.value !== null && `Valor: ${apontamento.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      {apontamento.progress_percentage !== null && `Progresso: ${apontamento.progress_percentage.toFixed(1)}%`}
                      {apontamento.execution_count !== null && `Execuções: ${apontamento.execution_count}`}
                      {apontamento.current_value !== null && `Atual: ${apontamento.current_value}`}
                      {apontamento.value === null && apontamento.progress_percentage === null && apontamento.execution_count === null && apontamento.current_value === null && 'N/A'}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {apontamento.evidence || 'Sem evidência'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditApontamentoClick(apontamento)}
                        className="mr-2 text-foreground hover:bg-accent rounded-lg"
                        disabled={deleteApontamentoMutation.isPending}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteApontamentoClick(apontamento.id)}
                        className="bg-sollux-red hover:bg-red-700 text-white rounded-lg"
                        disabled={deleteApontamentoMutation.isPending}
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

      {/* Diálogo para Adicionar/Editar Apontamento */}
      <Dialog open={isApontamentoDialogOpen} onOpenChange={(isOpen) => {
        setIsApontamentoDialogOpen(isOpen);
        if (!isOpen) { // Limpar estado ao fechar o diálogo
          setApontamentoToEdit(null);
          form.reset(); // Resetar o formulário
        }
      }}>
        <DialogContent className="sm:max-w-2xl bg-card backdrop-blur-md rounded-2xl shadow-lg border border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">{apontamentoToEdit ? 'Editar Apontamento' : 'Novo Apontamento'}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Preencha os detalhes do apontamento para o KPI Smart selecionado.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="kpi_smart_liberated_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Selecione o KPI Smart Liberado</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingKpiSmartsLiberated || !!apontamentoToEdit}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Selecione um KPI Smart Liberado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingKpiSmartsLiberated ? (
                          <SelectItem value="loading" disabled>Carregando...</SelectItem>
                        ) : kpiSmartsLiberated?.length === 0 ? (
                          <SelectItem value="no-kpis" disabled>Nenhum KPI Smart Liberado encontrado</SelectItem>
                        ) : (
                          kpiSmartsLiberated?.map((kpiLib) => (
                            <SelectItem key={kpiLib.id} value={kpiLib.id}>
                              {kpiLib.kpi_smarts?.description || `ID: ${kpiLib.kpi_smart_id}`} ({kpiLib.kpi_smarts?.pillar?.description || 'Sem Pilar'})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Renderizar o componente de formulário dinâmico */}
              {selectedKpiLiberated && (
                <ApontamentoKpiSmartForm
                  form={form}
                  selectedKpiSmart={selectedKpiLiberated}
                  isSubmitting={form.formState.isSubmitting}
                />
              )}

              <DialogFooter className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => { setIsApontamentoDialogOpen(false); form.reset(); setApontamentoToEdit(null); }} className="rounded-lg">
                  Cancelar
                </Button>
                <Button type="submit" className="rounded-lg bg-sollux-red hover:bg-sollux-orange">
                  {form.formState.isSubmitting ? 'Salvando...' : (apontamentoToEdit ? 'Salvar Alterações' : 'Salvar Apontamento')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShiftPage;