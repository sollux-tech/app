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
import { Pillar } from '@/types/pillar';
import { PillarBlock } from '@/types/pillarBlock';
import { ClassificationScale } from '@/types/classificationScale';
import { Loader2, Save, Award, CheckCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// Schema para o formulário de avaliação do consultor
const evaluationFormSchema = z.object({
  consultant_evaluation: z.string().optional(),
});

const DiagnosticEvaluationPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { selectedCompany } = useCompany();

  const [selectedDiagnosticId, setSelectedDiagnosticId] = useState<string | undefined>(undefined);
  const [editorLoaded, setEditorLoaded] = useState(false);

  useEffect(() => {
    setEditorLoaded(true);
  }, []);

  const form = useForm<z.infer<typeof evaluationFormSchema>>({
    resolver: zodResolver(evaluationFormSchema),
    defaultValues: {
      consultant_evaluation: '',
    },
  });

  // Fetch diagnostics for the current company and user
  const { data: diagnostics, isLoading: isLoadingDiagnostics } = useQuery<Diagnostic[], Error>({
    queryKey: ['diagnosticsListForEvaluation', user?.id, selectedCompany?.id],
    queryFn: async () => {
      if (!user?.id || !selectedCompany?.id) return [];
      const { data, error } = await supabase
        .from('diagnostics')
        .select('*, companies(name), pillars(description), pillar_blocks(name), diagnostic_statuses(description)')
        .eq('user_id', user.id)
        .eq('company_id', selectedCompany.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!selectedCompany?.id,
  });

  // Fetch questionnaire entries for the selected diagnostic
  const { data: questionnaireEntries, isLoading: isLoadingQuestionnaireEntries } = useQuery<DiagnosticQuestionnaire[], Error>({
    queryKey: ['diagnosticQuestionnaireEntriesForEvaluation', user?.id, selectedCompany?.id, selectedDiagnosticId],
    queryFn: async () => {
      if (!user?.id || !selectedCompany?.id || !selectedDiagnosticId) return [];
      const { data, error } = await supabase
        .from('diagnostic_questionnaires')
        .select(`
          id,
          kpi_id,
          score_id,
          evidence,
          order_number,
          kpis(question, pillar_id, pillar_block_id),
          scoring_scales(score, description)
        `)
        .eq('user_id', user.id)
        .eq('company_id', selectedCompany.id)
        .eq('diagnostic_id', selectedDiagnosticId)
        .order('order_number', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;

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

  // Fetch all pillar blocks for the selected diagnostic's pillar to get weights
  const { data: pillarBlocks, isLoading: isLoadingPillarBlocks } = useQuery<PillarBlock[], Error>({
    queryKey: ['pillarBlocksForEvaluation', user?.id, selectedDiagnosticId],
    queryFn: async () => {
      const diagnostic = diagnostics?.find(d => d.id === selectedDiagnosticId);
      if (!user?.id || !diagnostic?.pillar_id) return [];
      const { data, error } = await supabase
        .from('pillar_blocks')
        .select('*')
        .eq('user_id', user.id)
        .eq('pillar_id', diagnostic.pillar_id)
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!selectedDiagnosticId && !!diagnostics?.find(d => d.id === selectedDiagnosticId)?.pillar_id,
  });

  // Fetch classification scales
  const { data: classificationScales, isLoading: isLoadingClassificationScales } = useQuery<ClassificationScale[], Error>({
    queryKey: ['classificationScalesForEvaluation', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('classification_scales')
        .select('*, pillars(description), pillar_blocks(name)')
        .eq('user_id', user.id)
        .order('min_percentage', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Update form with consultant_evaluation when selected diagnostic changes
  useEffect(() => {
    if (selectedDiagnosticId && diagnostics) {
      const currentDiagnostic = diagnostics.find(d => d.id === selectedDiagnosticId);
      form.reset({
        consultant_evaluation: currentDiagnostic?.consultant_evaluation || '',
      });
    } else {
      form.reset({ consultant_evaluation: '' });
    }
  }, [selectedDiagnosticId, diagnostics, form]);

  const updateDiagnosticEvaluationMutation = useMutation({
    mutationFn: async (data: z.infer<typeof evaluationFormSchema>) => {
      if (!user?.id || !selectedCompany?.id || !selectedDiagnosticId) {
        throw new Error("Usuário não autenticado, empresa não selecionada ou diagnóstico não disponível.");
      }
      const { error } = await supabase
        .from('diagnostics')
        .update({
          consultant_evaluation: data.consultant_evaluation || null,
        })
        .eq('id', selectedDiagnosticId)
        .eq('user_id', user.id)
        .eq('company_id', selectedCompany.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagnosticsListForEvaluation', user?.id, selectedCompany?.id] });
      showSuccess('Avaliação do consultor salva com sucesso!');
    },
    onError: (error: Error) => {
      showError(`Erro ao salvar avaliação: ${error.message}`);
    },
  });

  const onSubmit = (data: z.infer<typeof evaluationFormSchema>) => {
    updateDiagnosticEvaluationMutation.mutate(data);
  };

  const isLoadingPage = isLoadingDiagnostics || isLoadingQuestionnaireEntries || isLoadingPillarBlocks || isLoadingClassificationScales;
  const isSaving = updateDiagnosticEvaluationMutation.isPending;

  const selectedDiagnostic = diagnostics?.find(d => d.id === selectedDiagnosticId);

  // --- Lógica de Cálculo de Indicadores ---
  const { blockIndicators, pillarIndicator, overallClassification } = useMemo(() => {
    if (!selectedDiagnostic || !questionnaireEntries || !pillarBlocks || !classificationScales) {
      return { blockIndicators: {}, pillarIndicator: null, overallClassification: null };
    }

    const blockScores: { [blockId: string]: { totalScore: number; maxScore: number; questionCount: number } } = {};
    const blockWeights: { [blockId: string]: number } = {};

    // Initialize block scores and weights
    pillarBlocks.forEach(block => {
      blockScores[block.id] = { totalScore: 0, maxScore: 0, questionCount: 0 };
      blockWeights[block.id] = block.weight_percentage;
    });

    // Aggregate scores for each block
    questionnaireEntries.forEach(entry => {
      const blockId = entry.kpis?.pillar_block_id;
      const score = entry.scoring_scales?.score;

      if (blockId && score !== undefined && blockScores[blockId]) {
        blockScores[blockId].totalScore += score;
        blockScores[blockId].maxScore += 5; // Max score for one question is 5
        blockScores[blockId].questionCount += 1;
      }
    });

    const calculatedBlockIndicators: { [blockId: string]: { percentage: number; classification: ClassificationScale | null } } = {};
    let totalPillarWeightedScore = 0;
    let totalPillarWeight = 0;

    // Calculate percentage for each block and its classification
    Object.keys(blockScores).forEach(blockId => {
      const blockData = blockScores[blockId];
      const blockWeight = blockWeights[blockId] || 0;

      if (blockData.questionCount > 0) {
        const percentage = (blockData.totalScore / blockData.maxScore) * 100;
        calculatedBlockIndicators[blockId] = {
          percentage,
          classification: classifyPercentage(percentage, classificationScales, selectedDiagnostic.pillar_id, blockId),
        };
        totalPillarWeightedScore += (percentage * blockWeight);
        totalPillarWeight += blockWeight;
      } else {
        // If no questions in block, it contributes 0% to its own score, but its weight still counts for the pillar if it has one.
        // For simplicity, if no questions, assume 0% for the block itself.
        calculatedBlockIndicators[blockId] = {
          percentage: 0,
          classification: classifyPercentage(0, classificationScales, selectedDiagnostic.pillar_id, blockId),
        };
        // If a block has no questions, its weight still contributes to the total pillar weight,
        // but its contribution to the weighted score is 0.
        totalPillarWeight += blockWeight;
      }
    });

    // Calculate overall pillar indicator
    const pillarOverallPercentage = totalPillarWeight > 0 ? (totalPillarWeightedScore / totalPillarWeight) : 0;
    const pillarOverallClassification = classifyPercentage(pillarOverallPercentage, classificationScales, selectedDiagnostic.pillar_id, null);

    return {
      blockIndicators: calculatedBlockIndicators,
      pillarIndicator: { percentage: pillarOverallPercentage, classification: pillarOverallClassification },
      overallClassification: pillarOverallClassification,
    };
  }, [selectedDiagnostic, questionnaireEntries, pillarBlocks, classificationScales]);

  // Helper to classify a percentage based on classification scales
  const classifyPercentage = (
    percentage: number,
    scales: ClassificationScale[],
    pillarId: string | null,
    blockId: string | null
  ): ClassificationScale | null => {
    // First, try to find a specific scale for the block
    const specificBlockScale = scales.find(s =>
      s.pillar_id === pillarId && s.pillar_block_id === blockId &&
      percentage >= s.min_percentage && percentage <= s.max_percentage
    );
    if (specificBlockScale) return specificBlockScale;

    // Then, try to find a specific scale for the pillar (global for pillar, but not block)
    const specificPillarScale = scales.find(s =>
      s.pillar_id === pillarId && s.pillar_block_id === null &&
      percentage >= s.min_percentage && percentage <= s.max_percentage
    );
    if (specificPillarScale) return specificPillarScale;

    // Finally, try to find a global scale (null for both pillar and block)
    const globalScale = scales.find(s =>
      s.pillar_id === null && s.pillar_block_id === null &&
      percentage >= s.min_percentage && percentage <= s.max_percentage
    );
    if (globalScale) return globalScale;

    return null;
  };

  const getColorClass = (colorCode: 'red' | 'yellow' | 'blue' | 'green' | undefined) => {
    switch (colorCode) {
      case 'red': return 'bg-red-500 text-white';
      case 'yellow': return 'bg-yellow-500 text-black';
      case 'blue': return 'bg-blue-500 text-white';
      case 'green': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  if (!selectedCompany) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Por favor, selecione uma empresa na barra lateral para realizar a avaliação do diagnóstico.
      </div>
    );
  }

  if (isLoadingPage) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-sollux-red" />
        <span className="ml-2 text-muted-foreground">Carregando dados para avaliação...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="text-foreground uppercase font-bold">Avaliação do Diagnóstico</CardTitle>
          <CardDescription className="text-muted-foreground">
            Empresa: <span className="font-semibold">{selectedCompany.name}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Label className="text-foreground">Selecionar Diagnóstico</Label>
            <Select
              onValueChange={setSelectedDiagnosticId}
              value={selectedDiagnosticId || 'placeholder'}
              disabled={isLoadingDiagnostics || (diagnostics?.length || 0) === 0}
            >
              <SelectTrigger className="rounded-lg">
                <SelectValue placeholder="Selecione um diagnóstico para avaliar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="placeholder" disabled>Selecione um Diagnóstico</SelectItem>
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
              <p className="text-sm font-medium text-destructive mt-2">Por favor, selecione um diagnóstico para avaliar.</p>
            )}
            {(diagnostics?.length || 0) === 0 && (
              <p className="text-sm text-destructive mt-2">
                Nenhum diagnóstico encontrado para esta empresa. Crie um em "OPS | Diagnósticos" e adicione perguntas em "Gerenciar Perguntas do Diagnóstico" primeiro.
              </p>
            )}
          </div>

          {selectedDiagnosticId && selectedDiagnostic ? (
            <div className="space-y-6">
              <Card className="p-6 border border-border rounded-lg bg-muted/50">
                <CardTitle className="text-xl font-bold text-foreground mb-4">
                  Diagnóstico: {selectedDiagnostic.pillars?.description || 'N/A'} / {selectedDiagnostic.pillar_blocks?.name || 'N/A'}
                </CardTitle>
                <CardDescription className="text-muted-foreground mb-4">
                  Status: {selectedDiagnostic.diagnostic_statuses?.description || 'N/A'}
                </CardDescription>

                {/* Indicador Final do Pilar */}
                {pillarIndicator && (
                  <div className="mb-6 p-4 bg-background rounded-lg border border-border">
                    <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                      <Award className="h-5 w-5 text-sollux-red" /> Indicador Final do Pilar
                    </h3>
                    <p className="text-2xl font-bold text-foreground">
                      {pillarIndicator.percentage.toFixed(2)}%
                      {pillarIndicator.classification && (
                        <Badge className={getColorClass(pillarIndicator.classification.color_code)} style={{ marginLeft: '10px' }}>
                          {pillarIndicator.classification.classification_label}
                        </Badge>
                      )}
                    </p>
                  </div>
                )}

                {/* Indicadores por Bloco */}
                <h3 className="text-lg font-semibold text-foreground mb-4">Indicadores por Bloco</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {pillarBlocks?.map(block => {
                    const indicator = blockIndicators[block.id];
                    return (
                      <Card key={block.id} className="p-4 border border-border rounded-lg">
                        <h4 className="font-semibold text-foreground mb-2">{block.name} ({block.weight_percentage}%)</h4>
                        {indicator ? (
                          <p className="text-xl font-bold text-foreground">
                            {indicator.percentage.toFixed(2)}%
                            {indicator.classification && (
                              <Badge className={getColorClass(indicator.classification.color_code)} style={{ marginLeft: '10px' }}>
                                {indicator.classification.classification_label}
                              </Badge>
                            )}
                          </p>
                        ) : (
                          <p className="text-muted-foreground">N/A</p>
                        )}
                      </Card>
                    );
                  })}
                </div>

                <h3 className="text-lg font-semibold text-foreground mb-4">Perguntas e Respostas do Usuário</h3>
                {questionnaireEntries && questionnaireEntries.length > 0 ? (
                  <div className="space-y-4">
                    {questionnaireEntries.map(entry => (
                      <Card key={entry.id} className="p-4 border border-border rounded-lg">
                        <p className="font-semibold text-foreground mb-1">
                          {entry.order_number}. {entry.kpis?.question || 'Pergunta não disponível'}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          Nota do Usuário: {entry.scoring_scales?.score !== undefined ? entry.scoring_scales.score : 'N/A'}
                          {entry.scoring_scales?.description && ` (${entry.scoring_scales.description})`}
                        </p>
                        {entry.evidence && (
                          <p className="text-muted-foreground text-sm mt-1">
                            Evidência: {entry.evidence}
                          </p>
                        )}
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground">Nenhuma pergunta respondida para este diagnóstico.</p>
                )}
              </Card>

              {/* Formulário de Avaliação do Consultor */}
              <Card className="p-6 border border-border rounded-lg bg-muted/50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-bold text-foreground">Avaliação do Consultor</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Escreva sua avaliação final sobre o diagnóstico.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="consultant_evaluation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-foreground">Avaliação</FormLabel>
                            <FormControl>
                              {editorLoaded ? (
                                <ReactQuill
                                  theme="snow"
                                  value={field.value || ''}
                                  onChange={field.onChange}
                                  className="bg-card rounded-lg"
                                  modules={{
                                    toolbar: [
                                      [{ 'header': [1, 2, false] }],
                                      ['bold', 'italic', 'underline', 'strike', 'link'],
                                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                                      [{ 'indent': '-1'}, { 'indent': '+1' }],
                                      ['image', 'code-block'],
                                      [{ 'color': [] }, { 'background': [] }],
                                      ['clean']
                                    ],
                                  }}
                                />
                              ) : (
                                <div className="h-[200px] w-full bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                                  Carregando editor de texto...
                                </div>
                              )}
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={isSaving} className="rounded-lg bg-sollux-red hover:bg-sollux-orange">
                          {isSaving ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Salvando...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" /> Salvar Avaliação
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Selecione um diagnóstico acima para visualizar as respostas e realizar a avaliação.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DiagnosticEvaluationPage;