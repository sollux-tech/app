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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { useCompany } from '@/components/CompanyContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AddMultipleDiagnosticQuestionsDialog from '@/components/AddMultipleDiagnosticQuestionsDialog';
import { Label } from '@/components/ui/label';

// Removido formSchema e o formulário de pergunta única, pois serão substituídos pelo novo diálogo.

const DiagnosticQuestionnairePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { selectedCompany } = useCompany();
  const [isAddQuestionsDialogOpen, setIsAddQuestionsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingQuestionnaire, setEditingQuestionnaire] = useState<DiagnosticQuestionnaire | null>(null);
  const [selectedDiagnosticToAnswer, setSelectedDiagnosticToAnswer] = useState<string | undefined>(undefined);

  // Formulário para edição de UMA pergunta (o mesmo que antes, mas agora para edição)
  const editForm = useForm<DiagnosticQuestionnaireFormData>({
    resolver: zodResolver(z.object({
      diagnostic_id: z.string().min(1, { message: 'O diagnóstico é obrigatório.' }),
      kpi_id: z.string().min(1, { message: 'A pergunta (KPI) é obrigatória.' }),
      score_id: z.string().min(1, { message: 'A nota é obrigatória.' }),
      evidence: z.string().optional(),
    })),
    defaultValues: {
      diagnostic_id: undefined,
      kpi_id: undefined,
      score_id: undefined,
      evidence: '',
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
      });
    } else {
      editForm.reset({
        diagnostic_id: undefined,
        kpi_id: undefined,
        score_id: undefined,
        evidence: '',
      });
    }
  }, [editingQuestionnaire, editForm, isEditDialogOpen]);

  const { data: questionnaires, isLoading: isLoadingQuestionnaires, error: errorQuestionnaires } = useQuery<DiagnosticQuestionnaire[], Error>({
    queryKey: ['diagnosticQuestionnaires', user?.id, selectedCompany?.id],
    queryFn: async () => {
      if (!user?.id || !selectedCompany?.id) return [];
      const { data, error } = await supabase
        .from('diagnostic_questionnaires')
        .select(`
          *,
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
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!selectedCompany?.id,
  });

  const { data: diagnostics, isLoading: isLoadingDiagnostics } = useQuery<Diagnostic[], Error>({
    queryKey: ['diagnosticsListForQuestionnaire', user?.id, selectedCompany?.id],
    queryFn: async () => {
      if (!user?.id || !selectedCompany?.id) return [];
      const { data, error } = await supabase
        .from('diagnostics')
        .select('*, companies(name), pillars(description), pillar_blocks(name)')
        .eq('user_id', user.id)
        .eq('company_id', selectedCompany.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!selectedCompany?.id,
  });

  // Set the first diagnostic as selected by default if none is selected
  useEffect(() => {
    if (diagnostics && diagnostics.length > 0 && !selectedDiagnosticToAnswer) {
      setSelectedDiagnosticToAnswer(diagnostics[0].id);
    } else if (diagnostics && diagnostics.length === 0 && selectedDiagnosticToAnswer) {
      setSelectedDiagnosticToAnswer(undefined);
    }
  }, [diagnostics, selectedDiagnosticToAnswer]);

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
      queryClient.invalidateQueries({ queryKey: ['diagnosticQuestionnaires', user?.id, selectedCompany?.id] });
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
    if (!diagnostics || diagnostics.length === 0) {
      showError("Nenhum diagnóstico encontrado para esta empresa. Crie um em 'OPS | Diagnósticos' primeiro.");
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
  const isLoadingPage = isLoadingQuestionnaires || isLoadingDiagnostics || isLoadingKpis || isLoadingScoringScales;

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
          <div className="mb-6">
            <Label className="text-foreground">Selecionar Diagnóstico</Label>
            <Select
              onValueChange={setSelectedDiagnosticToAnswer}
              value={selectedDiagnosticToAnswer}
              disabled={isLoadingDiagnostics || (diagnostics?.length || 0) === 0}
            >
              <SelectTrigger className="rounded-lg">
                <SelectValue placeholder="Selecione um diagnóstico para responder" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingDiagnostics ? (
                  <SelectItem value="loading" disabled>Carregando diagnósticos...</SelectItem>
                ) : (diagnostics?.length || 0) === 0 ? (
                  <SelectItem value="no-diagnostics" disabled>Nenhum diagnóstico cadastrado para esta empresa.</SelectItem>
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
            {(diagnostics?.length || 0) === 0 && (
              <p className="text-sm text-destructive mt-2">
                Nenhum diagnóstico encontrado para esta empresa. Crie um em "OPS | Diagnósticos" primeiro.
              </p>
            )}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-foreground">Diagnóstico</TableHead>
                <TableHead className="text-foreground">Pergunta (KPI)</TableHead>
                {/* Removido: <TableHead className="text-foreground">Nota</TableHead> */}
                {/* Removido: <TableHead className="text-foreground">Respondido por</TableHead> */}
                {/* Removido: <TableHead className="text-foreground">Criado em</TableHead> */}
                <TableHead className="text-right text-foreground">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {questionnaires?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground"> {/* Colspan ajustado */}
                    Nenhuma resposta de questionário encontrada para esta empresa.
                  </TableCell>
                </TableRow>
              ) : (
                questionnaires?.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-medium text-foreground">
                      {q.diagnostics?.id.substring(0, 8)}... ({q.diagnostics?.pillars?.description || 'N/A'} / {q.diagnostics?.pillar_blocks?.name || 'N/A'})
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {q.kpis?.question || 'N/A'}
                    </TableCell>
                    {/* Removido:
                    <TableCell className="text-muted-foreground">
                      {q.scoring_scales?.score !== undefined ? `${q.scoring_scales.score} - ${q.scoring_scales.description}` : 'N/A'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {q.profiles ? `${q.profiles.first_name || ''} ${q.profiles.last_name || ''}`.trim() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(q.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                    */}
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