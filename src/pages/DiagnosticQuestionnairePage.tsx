import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { DiagnosticQuestionnaire, DiagnosticQuestionnaireFormData } from '@/types/diagnosticQuestionnaire';
import { Diagnostic } from '@/types/diagnostic';
import { Kpi } from '@/types/kpi';
import { ScoringScale } from '@/types/scoringScale';
import { Pillar } from '@/types/pillar'; // Importar Pillar
import { DiagnosticStatus } from '@/types/diagnosticStatus'; // Importar DiagnosticStatus
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { useCompany } from '@/components/CompanyContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AddMultipleDiagnosticQuestionsDialog from '@/components/AddMultipleDiagnosticQuestionsDialog';
import { Label } from '@/components/ui/label';

// Tipo específico para os dados de pilar do diagnóstico necessários para o filtro
interface DiagnosticPillarInfo {
  id: string;
  pillar_id: string | null;
}

// Removido formSchema e o formulário de pergunta única, pois serão substituídos pelo novo diálogo.

const DiagnosticQuestionnairePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { selectedCompany } = useCompany();
  const [isAddQuestionsDialogOpen, setIsAddQuestionsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingQuestionnaire, setEditingQuestionnaire] = useState<DiagnosticQuestionnaire | null>(null);
  
  // Novos estados para os filtros
  const [selectedPillarFilter, setSelectedPillarFilter] = useState<string>('all');
  const [selectedDiagnosticStatusFilter, setSelectedDiagnosticStatusFilter] = useState<string>('all');

  const [selectedDiagnosticToAnswer, setSelectedDiagnosticToAnswer] = useState<string | undefined>(undefined);

  // Formulário para edição de UMA pergunta (o mesmo que antes, mas agora para edição)
  const editForm = useForm<DiagnosticQuestionnaireFormData>({
    resolver: zodResolver(z.object({
      diagnostic_id: z.string().min(1, { message: 'O diagnóstico é obrigatório.' }),
      kpi_id: z.string().min(1, { message: 'A pergunta (KPI) é obrigatória.' }),
      score_id: z.string().min(1, { message: 'A nota é obrigatória.' }),
      evidence: z.string().optional(),
      order_number: z.number().min(1, { message: 'O número de ordem é obrigatório.' }), // Adicionado
    })),
    defaultValues: {
      diagnostic_id: undefined,
      kpi_id: undefined,
      score_id: undefined,
      evidence: '',
      order_number: 1, // Adicionado
    },
  });

  const selectedDiagnosticIdForEdit = editForm.watch('diagnostic_id');

  useEffect(() => {
    if (editingQuestionnaire) {
      editForm.reset({
        diagnostic_id: editingQuestionnaire.diagnostic_id || undefined,
        kpi_id: editingQuestionnaire.kpi_id || undefined,
        score_id: editingQuestionnaire.score_id || undefined,
        evidence: editingQuestionnaire.evidence || '',
        order_number: editingQuestionnaire.order_number || 1, // Adicionado
      });
    } else {
      editForm.reset({
        diagnostic_id: undefined,
        kpi_id: undefined,
        score_id: undefined,
        evidence: '',
        order_number: 1, // Adicionado
      });
    }
  }, [editingQuestionnaire, editForm, isEditDialogOpen]);

  // 1. Fetch all diagnostic statuses for the filter dropdown
  const { data: allDiagnosticStatuses, isLoading: isLoadingAllDiagnosticStatuses } = useQuery<DiagnosticStatus[], Error>({
    queryKey: ['allDiagnosticStatusesListForQuestionnaire', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('diagnostic_statuses')
        .select('*')
        .eq('user_id', user.id)
        .order('description', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // 2. Fetch diagnostics based on selected filters for the "Select Diagnostic" dropdown
  const { data: diagnostics, isLoading: isLoadingDiagnostics } = useQuery<Diagnostic[], Error>({
    queryKey: ['diagnosticsListForQuestionnaire', user?.id, selectedCompany?.id, selectedPillarFilter, selectedDiagnosticStatusFilter],
    queryFn: async () => {
      if (!user?.id || !selectedCompany?.id) return [];
      let query = supabase
        .from('diagnostics')
        .select('*, companies(name), pillars(description), pillar_blocks(name)')
        .eq('user_id', user.id)
        .eq('company_id', selectedCompany.id);
      
      if (selectedPillarFilter !== 'all') {
        query = query.eq('pillar_id', selectedPillarFilter);
      }
      if (selectedDiagnosticStatusFilter !== 'all') {
        query = query.eq('diagnostic_status_id', selectedDiagnosticStatusFilter);
      }

      query = query.order('created_at', { ascending: false });
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!selectedCompany?.id,
  });

  // Reset selected diagnostic when filters change
  useEffect(() => {
    if (diagnostics && diagnostics.length > 0) {
      if (!diagnostics.some(d => d.id === selectedDiagnosticToAnswer)) {
        setSelectedDiagnosticToAnswer(undefined);
      }
    } else {
      setSelectedDiagnosticToAnswer(undefined);
    }
  }, [selectedPillarFilter, selectedDiagnosticStatusFilter, diagnostics]);

  // NEW: Fetch all diagnostics for the current company and user (without applying the current filters)
  // This is to get the full set of pillars that have diagnostics for this company, to populate the pillar filter dropdown
  const { data: allCompanyDiagnostics, isLoading: isLoadingAllCompanyDiagnostics } = useQuery<Diagnostic[], Error>({
    queryKey: ['allCompanyDiagnosticsForPillarFilter', user?.id, selectedCompany?.id],
    queryFn: async () => {
      if (!user?.id || !selectedCompany?.id) return [];
      const { data, error } = await supabase
        .from('diagnostics')
        .select('pillar_id') // Only need pillar_id
        .eq('user_id', user.id)
        .eq('company_id', selectedCompany.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!selectedCompany?.id,
  });

  const uniquePillarIdsInCompanyDiagnostics = useMemo(() => {
    if (!allCompanyDiagnostics) return [];
    const ids = new Set<string>();
    allCompanyDiagnostics.forEach(d => {
      if (d.pillar_id) {
        ids.add(d.pillar_id);
      }
    });
    return Array.from(ids);
  }, [allCompanyDiagnostics]);

  // Now fetch the actual Pillar objects for these IDs, for the filter dropdown
  const { data: availablePillarsForFilter, isLoading: isLoadingAvailablePillarsForFilter } = useQuery<Pillar[], Error>({
    queryKey: ['availablePillarsForFilter', user?.id, uniquePillarIdsInCompanyDiagnostics],
    queryFn: async () => {
      if (!user?.id || uniquePillarIdsInCompanyDiagnostics.length === 0) return [];
      const { data, error } = await supabase
        .from('pillars')
        .select('*')
        .in('id', uniquePillarIdsInCompanyDiagnostics)
        .eq('user_id', user.id)
        .order('description', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && uniquePillarIdsInCompanyDiagnostics.length > 0,
  });


  // 4. Fetch questionnaire entries for the selected diagnostic
  const { data: questionnaires, isLoading: isLoadingQuestionnaires, error: errorQuestionnaires } = useQuery<DiagnosticQuestionnaire[], Error>({
    queryKey: ['diagnosticQuestionnaires', user?.id, selectedCompany?.id, selectedDiagnosticToAnswer],
    queryFn: async () => {
      if (!user?.id || !selectedCompany?.id || !selectedDiagnosticToAnswer) return [];
      const { data, error } = await supabase
        .from('diagnostic_questionnaires')
        .select(`
          id,
          user_id,
          company_id,
          diagnostic_id,
          kpi_id,
          score_id,
          evidence,
          order_number,
          created_at,
          updated_at,
          diagnostics(
            id,
            companies(name),
            pillars(description),
            pillar_blocks(name)
          ),
          kpis(question),
          scoring_scales(score, description),
          profiles(first_name, last_name)
        `)
        .eq('user_id', user.id)
        .eq('company_id', selectedCompany.id)
        .eq('diagnostic_id', selectedDiagnosticToAnswer) // Filter by selected diagnostic
        .order('order_number', { ascending: true }) // Ordenar por order_number
        .order('created_at', { ascending: false }); // Fallback order
      if (error) throw error;

      const processedData: DiagnosticQuestionnaire[] = data.map((item: any) => ({
        ...item,
        diagnostics: item.diagnostics
          ? (Array.isArray(item.diagnostics)
            ? (item.diagnostics.length > 0 ? item.diagnostics[0] : null)
            : item.diagnostics)
          : null,
        kpis: item.kpis
          ? (Array.isArray(item.kpis)
            ? (item.kpis.length > 0 ? item.kpis[0] : null)
            : item.kpis)
          : null,
        scoring_scales: item.scoring_scales
          ? (Array.isArray(item.scoring_scales)
            ? (item.scoring_scales.length > 0 ? item.scoring_scales[0] : null)
            : item.scoring_scales)
          : null,
        profiles: item.profiles
          ? (Array.isArray(item.profiles)
            ? (item.profiles.length > 0 ? item.profiles[0] : null)
            : item.profiles)
          : null,
      }));

      console.log("Questionnaires fetched (DiagnosticQuestionnairePage):", processedData); // Log para depuração
      return processedData;
    },
    enabled: !!user?.id && !!selectedCompany?.id && !!selectedDiagnosticToAnswer, // Enable only when diagnostic is selected
  });

  const { data: kpis, isLoading: isLoadingKpis } = useQuery<Kpi[], Error>({
    queryKey: ['kpisListForQuestionnaire', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('kpis')
        .select('*, pillars(id), pillar_blocks(id)') // Select pillar_id and pillar_block_id for filtering
        .eq('user_id', user.id)
        .order('question', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: scoringScales, isLoading: isLoadingScoringScales } = useQuery<ScoringScale[], Error>({
    queryKey: ['scoringScalesListForQuestionnaire', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('scoring_scales')
        .select('*')
        .eq('user_id', user.id)
        .order('score', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const filteredKpisForEdit = useMemo(() => {
    if (!kpis || !selectedDiagnosticIdForEdit || !diagnostics) return [];
    const selectedDiagnostic = diagnostics.find(d => d.id === selectedDiagnosticIdForEdit);
    if (!selectedDiagnostic || !selectedDiagnostic.pillar_id || !selectedDiagnostic.pillar_block_id) return [];

    return kpis.filter(kpi =>
      kpi.pillars?.id === selectedDiagnostic.pillar_id &&
      kpi.pillar_blocks?.id === selectedDiagnostic.pillar_block_id
    );
  }, [kpis, selectedDiagnosticIdForEdit, diagnostics]);

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagnosticQuestionnaires', user?.id, selectedCompany?.id, selectedDiagnosticToAnswer] }); // Invalidate specific query
      setIsEditDialogOpen(false); // Fechar o diálogo de edição
      setEditingQuestionnaire(null);
    },
    onError: (error: Error) => {
      showError(`Erro: ${error.message}`);
    },
  };

  const updateQuestionnaireMutation = useMutation({
    mutationFn: async (data: DiagnosticQuestionnaireFormData) => {
      if (!editingQuestionnaire?.id) throw new Error("ID da resposta do questionário está faltando.");
      if (!user?.id || !selectedCompany?.id) throw new Error("Usuário não autenticado ou empresa não selecionada.");
      const { error } = await supabase
        .from('diagnostic_questionnaires')
        .update({
          diagnostic_id: data.diagnostic_id,
          kpi_id: data.kpi_id,
          score_id: data.score_id,
          evidence: data.evidence || null,
          order_number: data.order_number, // Adicionado
        })
        .eq('id', editingQuestionnaire.id)
        .eq('user_id', user.id)
        .eq('company_id', selectedCompany.id);
      if (error) throw error;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Resposta do questionário atualizada com sucesso!');
    },
  });

  const deleteQuestionnaireMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id || !selectedCompany?.id) throw new Error("Usuário não autenticado ou empresa não selecionada.");
      const { error, count } = await supabase
        .from('diagnostic_questionnaires')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
        .eq('company_id', selectedCompany.id);
      
      if (error) {
        throw error;
      }
      if (count === 0) {
        throw new Error("Resposta do questionário não encontrada ou você não tem permissão para excluí-la.");
      }
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Resposta do questionário excluída com sucesso!');
    },
  });

  const onEditSubmit = (data: DiagnosticQuestionnaireFormData) => {
    updateQuestionnaireMutation.mutate(data);
  };

  const handleAddQuestionsClick = () => {
    if (!selectedCompany) {
      showError("Por favor, selecione uma empresa na barra lateral para adicionar perguntas.");
      return;
    }
    if (!selectedPillarFilter || selectedPillarFilter === 'all') {
      showError("Por favor, selecione um pilar para adicionar perguntas.");
      return;
    }
    if (!diagnostics || diagnostics.length === 0) {
      showError("Nenhum diagnóstico encontrado para o pilar selecionado. Crie um em 'OPS | Diagnósticos' primeiro.");
      return;
    }
    if (!selectedDiagnosticToAnswer) {
      showError("Por favor, selecione um diagnóstico para adicionar perguntas.");
      return;
    }
    setIsAddQuestionsDialogOpen(true);
  };

  const handleEditClick = (questionnaire: DiagnosticQuestionnaire) => {
    setEditingQuestionnaire(questionnaire);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta resposta do questionário?')) {
      deleteQuestionnaireMutation.mutate(id);
    }
  };

  const isMutating = updateQuestionnaireMutation.isPending || deleteQuestionnaireMutation.isPending;
  const isLoadingPage = isLoadingAllCompanyDiagnostics || isLoadingAvailablePillarsForFilter || isLoadingAllDiagnosticStatuses || isLoadingDiagnostics || isLoadingKpis || isLoadingScoringScales || isLoadingQuestionnaires;

  if (!selectedCompany) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Por favor, selecione uma empresa na barra lateral para gerenciar o questionário de diagnóstico.
      </div>
    );
  }

  if (isLoadingPage) {
    return (
      <div className="text-center text-muted-foreground">Carregando questionários...</div>
    );
  }

  if (errorQuestionnaires) {
    return <div className="text-center text-destructive">Erro ao carregar questionários: {errorQuestionnaires.message}</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-foreground uppercase font-bold">Gerenciar Questionário do Diagnóstico</CardTitle>
            <CardDescription className="text-muted-foreground">
              Respostas do questionário para a empresa: <span className="font-semibold">{selectedCompany.name}</span>
            </CardDescription>
          </div>
          <Button onClick={handleAddQuestionsClick} className="bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg" disabled={!selectedDiagnosticToAnswer}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar Perguntas
          </Button>
        </CardHeader>
        <CardContent>
          {/* Seletor de Pilar para Filtro */}
          <div className="mb-4">
            <Label className="text-foreground">Filtrar por Pilar</Label>
            <Select
              onValueChange={(value) => {
                setSelectedPillarFilter(value);
              }}
              value={selectedPillarFilter}
              disabled={isLoadingAvailablePillarsForFilter}
            >
              <SelectTrigger className="rounded-lg">
                <SelectValue placeholder="Todos os Pilares" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Pilares</SelectItem>
                {isLoadingAvailablePillarsForFilter ? (
                  <SelectItem value="loading" disabled>Carregando pilares...</SelectItem>
                ) : (availablePillarsForFilter?.length || 0) === 0 ? (
                  <SelectItem value="no-pillars" disabled>Nenhum pilar com diagnóstico cadastrado.</SelectItem>
                ) : (
                  availablePillarsForFilter?.map((pillar) => (
                    pillar.id && pillar.id !== '' ? (
                      <SelectItem key={pillar.id} value={pillar.id}>
                        {pillar.description}
                      </SelectItem>
                    ) : null
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Seletor de Status do Diagnóstico para Filtro */}
          <div className="mb-6">
            <Label className="text-foreground">Filtrar por Status do Diagnóstico</Label>
            <Select
              onValueChange={(value) => {
                setSelectedDiagnosticStatusFilter(value);
              }}
              value={selectedDiagnosticStatusFilter}
              disabled={isLoadingAllDiagnosticStatuses}
            >
              <SelectTrigger className="rounded-lg">
                <SelectValue placeholder="Todos os Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                {isLoadingAllDiagnosticStatuses ? (
                  <SelectItem value="loading" disabled>Carregando status...</SelectItem>
                ) : (allDiagnosticStatuses?.length || 0) === 0 ? (
                  <SelectItem value="no-statuses" disabled>Nenhum status cadastrado.</SelectItem>
                ) : (
                  allDiagnosticStatuses?.map((status) => (
                    status.id && status.id !== '' ? (
                      <SelectItem key={status.id} value={status.id}>
                        {status.description}
                      </SelectItem>
                    ) : null
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Seletor de Diagnóstico */}
          <div className="mb-6">
            <Label className="text-foreground">Selecionar Diagnóstico</Label>
            <Select
              onValueChange={setSelectedDiagnosticToAnswer}
              value={selectedDiagnosticToAnswer || 'placeholder'}
              disabled={isLoadingDiagnostics || (diagnostics?.length || 0) === 0}
            >
              <SelectTrigger className="rounded-lg">
                <SelectValue placeholder="Selecione um diagnóstico" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="placeholder" disabled>Selecione um Diagnóstico</SelectItem>
                {isLoadingDiagnostics ? (
                  <SelectItem value="loading" disabled>Carregando diagnósticos...</SelectItem>
                ) : (diagnostics?.length || 0) === 0 ? (
                  <SelectItem value="no-diagnostics" disabled>Nenhum diagnóstico encontrado para os filtros aplicados.</SelectItem>
                ) : (
                  diagnostics?.map((diagnostic) => (
                    diagnostic.id && diagnostic.id !== '' ? (
                      <SelectItem key={diagnostic.id} value={diagnostic.id}>
                        {diagnostic.id.substring(0, 8)}... ({diagnostic.pillars?.description || 'N/A'} / {diagnostic.pillar_blocks?.name || 'N/A'})
                      </SelectItem>
                    ) : null
                  ))
                )}
              </SelectContent>
            </Select>
            {!selectedDiagnosticToAnswer && (diagnostics?.length || 0) > 0 && (
              <p className="text-sm font-medium text-destructive mt-2">Por favor, selecione um diagnóstico para adicionar perguntas.</p>
            )}
            {(diagnostics?.length || 0) === 0 && (selectedPillarFilter !== 'all' || selectedDiagnosticStatusFilter !== 'all') && (
              <p className="text-sm text-destructive mt-2">
                Nenhum diagnóstico encontrado com os filtros aplicados. Tente ajustar os filtros ou criar novos diagnósticos.
              </p>
            )}
          </div>

          {/* Tabela de Questionários (só aparece se um diagnóstico for selecionado) */}
          {selectedDiagnosticToAnswer ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-foreground w-[80px]">Ordem</TableHead>
                  <TableHead className="text-foreground">Diagnóstico</TableHead>
                  <TableHead className="text-foreground">Pergunta (KPI)</TableHead>
                  <TableHead className="text-right text-foreground">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questionnaires?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Nenhuma resposta de questionário encontrada para este diagnóstico.
                    </TableCell>
                  </TableRow>
                ) : (
                  questionnaires?.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell className="font-bold text-sollux-red">{q.order_number || 'N/A'}</TableCell>
                      <TableCell className="font-medium text-foreground">
                        {q.diagnostics?.id.substring(0, 8)}... ({q.diagnostics?.pillars?.description || 'N/A'} / {q.diagnostics?.pillar_blocks?.name || 'N/A'})
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {q.kpis?.question || 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(q)}
                          className="mr-2 text-foreground hover:bg-accent rounded-lg"
                          disabled={isMutating}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteClick(q.id)}
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
          ) : (
            <div className="text-center text-muted-foreground py-8">
              Selecione um diagnóstico acima para visualizar e gerenciar suas perguntas.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Novo Diálogo para Adicionar Múltiplas Perguntas */}
      <AddMultipleDiagnosticQuestionsDialog
        open={isAddQuestionsDialogOpen}
        onOpenChange={setIsAddQuestionsDialogOpen}
        diagnosticId={selectedDiagnosticToAnswer}
      />

      {/* Diálogo para Editar UMA Pergunta (o antigo diálogo de adição, agora para edição) */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card backdrop-blur-md rounded-2xl shadow-lg border border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Editar Resposta do Questionário</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Atualize os detalhes da resposta.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="diagnostic_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Diagnóstico</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingDiagnostics}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Selecione um diagnóstico" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {diagnostics?.length === 0 ? (
                          <SelectItem value="no-diagnostics" disabled>Nenhum diagnóstico cadastrado</SelectItem>
                        ) : (
                          diagnostics?.map((diagnostic) => (
                            diagnostic.id && diagnostic.id !== '' ? (
                              <SelectItem key={diagnostic.id} value={diagnostic.id}>
                                {diagnostic.id.substring(0, 8)}... ({diagnostic.pillars?.description || 'N/A'} / {diagnostic.pillar_blocks?.name || 'N/A'})
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
                control={editForm.control}
                name="kpi_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Pergunta (KPI)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedDiagnosticIdForEdit || isLoadingKpis || filteredKpisForEdit.length === 0}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Selecione uma pergunta" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredKpisForEdit.length === 0 ? (
                          <SelectItem value="no-kpis" disabled>Nenhuma pergunta para este diagnóstico</SelectItem>
                        ) : (
                          filteredKpisForEdit.map((kpi) => (
                            kpi.id && kpi.id !== '' ? (
                              <SelectItem key={kpi.id} value={kpi.id}>
                                {kpi.question}
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
                control={editForm.control}
                name="order_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Ordem da Pergunta</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Ex: 1"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} // Garante a conversão para número
                        min={1} // Mínimo 1
                        max={999999} // Máximo 6 dígitos
                        className="rounded-lg"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="score_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Nota</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingScoringScales}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Selecione uma nota" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {scoringScales?.length === 0 ? (
                          <SelectItem value="no-scores" disabled>Nenhuma régua de pontuação cadastrada</SelectItem>
                        ) : (
                          scoringScales?.map((score) => (
                            score.id && score.id !== '' ? (
                              <SelectItem key={score.id} value={score.id}>
                                {score.score} - {score.description}
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
                control={editForm.control}
                name="evidence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Evidência (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Descreva as evidências para esta resposta." {...field} className="rounded-lg" rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isMutating} className="rounded-lg">
                  Cancelar
                </Button>
                <Button type="submit" disabled={isMutating} className="rounded-lg bg-sollux-red hover:bg-sollux-orange">
                  Salvar Alterações
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DiagnosticQuestionnairePage;