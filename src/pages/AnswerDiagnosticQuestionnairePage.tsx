import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { useCompany } from '@/components/CompanyContext';
import { Diagnostic } from '@/types/diagnostic';
import { DiagnosticQuestionnaire } from '@/types/diagnosticQuestionnaire';
import { ScoringScale } from '@/types/scoringScale';
import { Loader2, ArrowLeft, ArrowRight, Save, CheckCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';

// Schema para validar a resposta de uma única pergunta
const questionResponseSchema = z.object({
  score_id: z.string().min(1, { message: 'A nota é obrigatória.' }),
  evidence: z.string().optional(),
});

const AnswerDiagnosticQuestionnairePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { selectedCompany } = useCompany();

  const [selectedDiagnosticId, setSelectedDiagnosticId] = useState<string | undefined>(undefined);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Formulário para a pergunta atual
  const form = useForm<z.infer<typeof questionResponseSchema>>({
    resolver: zodResolver(questionResponseSchema),
    defaultValues: {
      score_id: '',
      evidence: '',
    },
  });

  // 1. Fetch all diagnostics for the selected company
  const { data: diagnostics, isLoading: isLoadingDiagnostics } = useQuery<Diagnostic[], Error>({
    queryKey: ['diagnosticsListForAnswer', user?.id, selectedCompany?.id],
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
    if (diagnostics && diagnostics.length > 0 && !selectedDiagnosticId) {
      setSelectedDiagnosticId(diagnostics[0].id);
    } else if (diagnostics && diagnostics.length === 0 && selectedDiagnosticId) {
      setSelectedDiagnosticId(undefined);
    }
  }, [diagnostics, selectedDiagnosticId]);

  // 2. Fetch all questionnaire entries for the selected diagnostic
  const { data: questionnaireEntries, isLoading: isLoadingQuestionnaireEntries, error: errorQuestionnaireEntries } = useQuery<DiagnosticQuestionnaire[], Error>({
    queryKey: ['diagnosticQuestionnaireEntries', user?.id, selectedCompany?.id, selectedDiagnosticId],
    queryFn: async () => {
      if (!user?.id || !selectedCompany?.id || !selectedDiagnosticId) return [];
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
          created_at,
          updated_at,
          kpis(question),
          scoring_scales(score, description)
        `)
        .eq('user_id', user.id)
        .eq('company_id', selectedCompany.id)
        .eq('diagnostic_id', selectedDiagnosticId)
        .order('created_at', { ascending: true });
      if (error) throw error;

      // Post-process data to ensure kpis and scoring_scales are single objects or null
      const processedData: DiagnosticQuestionnaire[] = data.map((item: any) => ({
        ...item,
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
      }));

      return processedData;
    },
    enabled: !!user?.id && !!selectedCompany?.id && !!selectedDiagnosticId,
  });

  // 3. Fetch scoring scales
  const { data: scoringScales, isLoading: isLoadingScoringScales } = useQuery<ScoringScale[], Error>({
    queryKey: ['scoringScalesListForAnswer', user?.id],
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

  // Current question being displayed
  const currentQuestionnaire = useMemo(() => {
    if (!questionnaireEntries || questionnaireEntries.length === 0) return null;
    return questionnaireEntries[currentQuestionIndex];
  }, [questionnaireEntries, currentQuestionIndex]);

  // Update form fields when currentQuestionnaire changes
  useEffect(() => {
    if (currentQuestionnaire) {
      // Usar setValue para atualizar os campos explicitamente
      form.setValue('score_id', currentQuestionnaire.score_id || '', { shouldValidate: false });
      form.setValue('evidence', currentQuestionnaire.evidence || '', { shouldValidate: false });
      form.clearErrors(); // Limpar quaisquer erros de validação anteriores
    } else {
      // Resetar para valores vazios se nenhuma pergunta estiver selecionada
      form.reset({
        score_id: '',
        evidence: '',
      });
    }
  }, [currentQuestionnaire, form]); // Dependências estão corretas

  const updateQuestionnaireMutation = useMutation({
    mutationFn: async (data: { id: string; score_id: string; evidence: string | null }) => {
      if (!user?.id || !selectedCompany?.id) throw new Error("Usuário não autenticado ou empresa não selecionada.");
      const { error } = await supabase
        .from('diagnostic_questionnaires')
        .update({
          score_id: data.score_id,
          evidence: data.evidence,
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.id)
        .eq('user_id', user.id)
        .eq('company_id', selectedCompany.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagnosticQuestionnaireEntries', user?.id, selectedCompany?.id, selectedDiagnosticId] });
      showSuccess('Resposta salva com sucesso!');
    },
    onError: (error: Error) => {
      showError(`Erro ao salvar resposta: ${error.message}`);
    },
  });

  const onSubmit = async (data: z.infer<typeof questionResponseSchema>) => {
    if (!currentQuestionnaire) return;

    await updateQuestionnaireMutation.mutateAsync({
      id: currentQuestionnaire.id,
      score_id: data.score_id,
      evidence: data.evidence || null,
    });
  };

  const handleNextQuestion = async () => {
    // Save current question's response before moving
    await form.handleSubmit(onSubmit)();
    if (questionnaireEntries && currentQuestionIndex < questionnaireEntries.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      showSuccess("Você chegou ao final do questionário!");
      setIsSubmitted(true); // Marcar como concluído ao chegar ao final
    }
  };

  const handlePreviousQuestion = async () => {
    // Save current question's response before moving
    await form.handleSubmit(onSubmit)();
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSaveAll = async () => {
    await form.handleSubmit(onSubmit)();
    showSuccess("Todas as respostas foram salvas!");
    setIsSubmitted(true);
  };

  const isLoadingPage = isLoadingDiagnostics || isLoadingQuestionnaireEntries || isLoadingScoringScales;
  const isSaving = updateQuestionnaireMutation.isPending;

  const selectedDiagnosticDetails = diagnostics?.find(d => d.id === selectedDiagnosticId);

  if (!selectedCompany) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Por favor, selecione uma empresa na barra lateral para responder o questionário de diagnóstico.
      </div>
    );
  }

  if (isLoadingPage) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-sollux-red" />
        <span className="ml-2 text-muted-foreground">Carregando questionário...</span>
      </div>
    );
  }

  if (errorQuestionnaireEntries) {
    return <div className="text-center text-destructive">Erro ao carregar perguntas: {errorQuestionnaireEntries.message}</div>;
  }

  if (isSubmitted) {
    return (
      <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center">
        <Card className="w-full max-w-md bg-card backdrop-blur-md rounded-2xl shadow-lg p-8 text-center border border-border">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Questionário Concluído!</h2>
          <p className="text-muted-foreground mb-6">
            Suas respostas foram salvas com sucesso.
          </p>
          <Button onClick={() => setIsSubmitted(false)} className="bg-sollux-red hover:bg-sollux-orange text-white rounded-lg">
            Voltar para o Questionário
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="text-foreground uppercase font-bold">Responder Questionário de Diagnóstico</CardTitle>
          <CardDescription className="text-muted-foreground">
            Empresa: <span className="font-semibold">{selectedCompany.name}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Label className="text-foreground">Selecionar Diagnóstico</Label>
            <Select
              onValueChange={(value) => {
                setSelectedDiagnosticId(value);
                setCurrentQuestionIndex(0); // Reset index when diagnostic changes
              }}
              value={selectedDiagnosticId}
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
            {!selectedDiagnosticId && (diagnostics?.length || 0) > 0 && (
              <p className="text-sm font-medium text-destructive mt-2">Por favor, selecione um diagnóstico para responder.</p>
            )}
            {(diagnostics?.length || 0) === 0 && (
              <p className="text-sm text-destructive mt-2">
                Nenhum diagnóstico encontrado para esta empresa. Crie um em "OPS | Diagnósticos" e adicione perguntas em "Gerenciar Perguntas do Diagnóstico" primeiro.
              </p>
            )}
          </div>

          {selectedDiagnosticId && questionnaireEntries && questionnaireEntries.length > 0 ? (
            <Card className="p-6 border border-border rounded-lg bg-muted/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold text-foreground">
                  Pergunta {currentQuestionIndex + 1} de {questionnaireEntries.length}
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Diagnóstico: {selectedDiagnosticDetails?.pillars?.description || 'N/A'} / {selectedDiagnosticDetails?.pillar_blocks?.name || 'N/A'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form
                    key={currentQuestionnaire?.id || 'no-diagnostic-question-selected'} // Chave no formulário principal
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-6"
                  >
                    <div className="space-y-2">
                      <Label className="text-lg font-semibold text-foreground">
                        {currentQuestionnaire?.kpis?.question || (isLoadingQuestionnaireEntries ? 'Carregando pergunta...' : 'Pergunta não disponível.')}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {/* Adicionar descrição do KPI se disponível */}
                      </p>
                    </div>

                    <FormField
                      control={form.control}
                      name="score_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">Nota</FormLabel>
                          <Select
                            key={`select-score-${currentQuestionnaire?.id || 'new'}`} // Chave no Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={isLoadingScoringScales || isSaving}
                          >
                            <FormControl>
                              <SelectTrigger className="rounded-lg">
                                <SelectValue placeholder="Selecione uma nota" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingScoringScales ? (
                                <SelectItem value="loading" disabled>Carregando notas...</SelectItem>
                              ) : (scoringScales?.length || 0) === 0 ? (
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
                      control={form.control}
                      name="evidence"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">Evidência (Opcional)</FormLabel>
                          <FormControl>
                            <Textarea
                              key={`textarea-evidence-${currentQuestionnaire?.id || 'new'}`} // Chave no Textarea
                              placeholder="Descreva as evidências para esta resposta."
                              {...field}
                              className="rounded-lg"
                              rows={4}
                              disabled={isSaving}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-between gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handlePreviousQuestion}
                        disabled={currentQuestionIndex === 0 || isSaving}
                        className="rounded-lg"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Anterior
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          type="submit"
                          disabled={isSaving}
                          className="rounded-lg bg-sollux-red hover:bg-sollux-orange"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Salvando...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" /> Salvar
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          onClick={handleNextQuestion}
                          disabled={!questionnaireEntries || currentQuestionIndex === questionnaireEntries.length - 1 || isSaving}
                          className="rounded-lg bg-sollux-red hover:bg-sollux-orange"
                        >
                          Próximo <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {questionnaireEntries && currentQuestionIndex === questionnaireEntries.length - 1 && (
                      <div className="text-center mt-4">
                        <Button
                          type="button"
                          onClick={handleSaveAll}
                          disabled={isSaving}
                          className="rounded-lg bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" /> Concluir Questionário
                        </Button>
                      </div>
                    )}
                  </form>
                </Form>
              </CardContent>
            </Card>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma pergunta encontrada para este diagnóstico. Adicione perguntas em "Gerenciar Perguntas do Diagnóstico".
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AnswerDiagnosticQuestionnairePage;