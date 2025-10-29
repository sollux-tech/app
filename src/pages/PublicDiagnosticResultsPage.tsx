import React, { useMemo, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Award, CheckCircle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Diagnostic } from '@/types/diagnostic';
import { DiagnosticQuestionnaire } from '@/types/diagnosticQuestionnaire';
import { PillarBlock } from '@/types/pillarBlock';
import { ClassificationScale } from '@/types/classificationScale';
import { ScoringScale } from '@/types/scoringScale';
import { useSession } from '@/components/SessionContextProvider';
import { useCompany } from '@/components/CompanyContext';

// Helper to classify a percentage based on classification scales (duplicated for standalone page)
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

const PublicDiagnosticResultsPage: React.FC = () => {
  const { id: diagnosticId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useSession();
  const { selectedCompany } = useCompany();
  const [expandedQuestionnaireId, setExpandedQuestionnaireId] = useState<string | undefined>(undefined);

  // Fetch the specific diagnostic details
  const { data: diagnostic, isLoading: isLoadingDiagnostic, error: errorDiagnostic } = useQuery<Diagnostic, Error>({
    queryKey: ['publicDiagnosticResult', diagnosticId],
    queryFn: async () => {
      if (!diagnosticId || !user?.id || !selectedCompany?.id) throw new Error("Dados de diagnóstico, usuário ou empresa faltando.");
      const { data, error } = await supabase
        .from('diagnostics')
        .select('*, companies(name), pillars(description), pillar_blocks(name), diagnostic_statuses(description)')
        .eq('id', diagnosticId)
        .eq('user_id', user.id)
        .eq('company_id', selectedCompany.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!diagnosticId && !!user?.id && !!selectedCompany?.id,
    retry: false,
  });

  // Fetch all questionnaire entries for this diagnostic
  const { data: questionnaireEntries, isLoading: isLoadingQuestionnaireEntries, error: errorQuestionnaireEntries } = useQuery<DiagnosticQuestionnaire[], Error>({
    queryKey: ['publicDiagnosticQuestionnaireEntries', diagnosticId],
    queryFn: async () => {
      if (!diagnosticId || !user?.id || !selectedCompany?.id) return [];
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
        .eq('diagnostic_id', diagnosticId)
        .eq('user_id', user.id)
        .eq('company_id', selectedCompany.id)
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
    enabled: !!diagnosticId && !!user?.id && !!selectedCompany?.id,
  });

  // Fetch pillar blocks for the diagnostic's pillar to get weights
  const { data: pillarBlocks, isLoading: isLoadingPillarBlocks } = useQuery<PillarBlock[], Error>({
    queryKey: ['pillarBlocksForDiagnosticResults', diagnostic?.pillar_id],
    queryFn: async () => {
      if (!diagnostic?.pillar_id || !user?.id) return [];
      const { data, error } = await supabase
        .from('pillar_blocks')
        .select('*')
        .eq('user_id', user.id)
        .eq('pillar_id', diagnostic.pillar_id)
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!diagnostic?.pillar_id && !!user?.id,
  });

  // Fetch classification scales
  const { data: classificationScales, isLoading: isLoadingClassificationScales } = useQuery<ClassificationScale[], Error>({
    queryKey: ['classificationScalesForDiagnosticResults', user?.id],
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

  const isLoadingPage = isLoadingDiagnostic || isLoadingQuestionnaireEntries || isLoadingPillarBlocks || isLoadingClassificationScales;

  // --- Lógica de Cálculo de Indicadores para ESTE Diagnóstico ---
  const { blockIndicator, diagnosticClassification } = useMemo(() => {
    if (!diagnostic || !questionnaireEntries || !pillarBlocks || !classificationScales) {
      return { blockIndicator: null, diagnosticClassification: null };
    }

    const blockId = diagnostic.pillar_block_id;
    const pillarId = diagnostic.pillar_id;

    if (!blockId || !pillarId) return { blockIndicator: null, diagnosticClassification: null };

    let totalScore = 0;
    let maxScore = 0;
    let questionCount = 0;

    questionnaireEntries.forEach(entry => {
      const score = entry.scoring_scales?.score;
      if (score !== undefined) {
        totalScore += score;
        maxScore += 5; // Max score for one question is 5
        questionCount += 1;
      }
    });

    if (questionCount === 0) {
      return {
        blockIndicator: { percentage: 0, classification: classifyPercentage(0, classificationScales, pillarId, blockId) },
        diagnosticClassification: classifyPercentage(0, classificationScales, pillarId, blockId),
      };
    }

    const percentage = (totalScore / maxScore) * 100;
    const classification = classifyPercentage(percentage, classificationScales, pillarId, blockId);

    return {
      blockIndicator: { percentage, classification },
      diagnosticClassification: classification,
    };
  }, [diagnostic, questionnaireEntries, pillarBlocks, classificationScales]);


  if (!selectedCompany) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Por favor, selecione uma empresa na barra lateral para visualizar os resultados do diagnóstico.
      </div>
    );
  }

  if (isLoadingPage) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-sollux-red" />
        <span className="ml-2 text-muted-foreground">Carregando resultados do diagnóstico...</span>
      </div>
    );
  }

  if (errorDiagnostic || !diagnostic) {
    return (
      <div className="flex items-center justify-center py-12">
        <Card className="w-full max-w-md bg-card backdrop-blur-md rounded-2xl shadow-lg p-6 text-center border border-border">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-sollux-red">Erro</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Não foi possível carregar o diagnóstico: {errorDiagnostic?.message || "Diagnóstico não encontrado ou você não tem permissão."}</p>
            <Button onClick={() => navigate('/ops/flow')} className="mt-4 inline-flex items-center rounded-lg bg-sollux-red hover:bg-sollux-orange">
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para o Flow
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center w-full">
      <Card className="w-full max-w-4xl bg-card backdrop-blur-md rounded-2xl shadow-lg border border-border p-8">
        <CardHeader className="text-center pb-6 border-b border-border">
          <CardTitle className="text-4xl font-bold text-foreground mb-2">
            Resultados do Diagnóstico
          </CardTitle>
          <CardDescription className="text-muted-foreground text-lg">
            Pilar: {diagnostic.pillars?.description || 'N/A'} | Bloco: {diagnostic.pillar_blocks?.name || 'N/A'}
          </CardDescription>
          <p className="text-sm text-muted-foreground">
            Status: {diagnostic.diagnostic_statuses?.description || 'N/A'} | Criado em: {format(new Date(diagnostic.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
          </p>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Indicador do Bloco */}
          {blockIndicator && (
            <div className="mb-6 p-4 bg-muted rounded-lg border border-border text-center">
              <h3 className="text-xl font-semibold text-foreground mb-2 flex items-center justify-center gap-2">
                <Award className="h-6 w-6 text-sollux-red" /> Indicador do Bloco: {diagnostic.pillar_blocks?.name || 'N/A'}
              </h3>
              <p className="text-3xl font-bold text-foreground">
                {blockIndicator.percentage.toFixed(2)}%
                {blockIndicator.classification && (
                  <Badge className={getColorClass(blockIndicator.classification.color_code)} style={{ marginLeft: '15px', fontSize: '1.2rem', padding: '0.5rem 1rem' }}>
                    {blockIndicator.classification.classification_label}
                  </Badge>
                )}
              </p>
            </div>
          )}

          {/* Avaliação do Consultor */}
          {diagnostic.consultant_evaluation && (
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Avaliação do Consultor</h3>
              <div className="prose max-w-none text-foreground p-4 bg-muted rounded-lg border border-border" dangerouslySetInnerHTML={{ __html: diagnostic.consultant_evaluation }} />
            </div>
          )}

          {/* Perguntas e Respostas */}
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-4">Perguntas e Respostas</h3>
            {questionnaireEntries && questionnaireEntries.length > 0 ? (
              <div className="space-y-4">
                {questionnaireEntries.map(entry => (
                  <Card key={entry.id} className="p-4 border border-border rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-foreground">
                        {entry.order_number}. {entry.kpis?.question || 'Pergunta não disponível'}
                      </h4>
                      <Button
                        variant="ghost"
                        onClick={() => setExpandedQuestionnaireId(expandedQuestionnaireId === entry.id ? undefined : entry.id)}
                        className="rounded-lg"
                      >
                        {expandedQuestionnaireId === entry.id ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                        {expandedQuestionnaireId === entry.id ? 'Esconder Detalhes' : 'Ver Detalhes'}
                      </Button>
                    </div>
                    {expandedQuestionnaireId === entry.id && (
                      <div className="mt-4 border-t border-border pt-4 space-y-2">
                        <p className="text-muted-foreground text-sm">
                          Nota do Usuário: {entry.scoring_scales?.score !== undefined ? entry.scoring_scales.score : 'N/A'}
                          {entry.scoring_scales?.description && ` (${entry.scoring_scales.description})`}
                        </p>
                        {entry.evidence && (
                          <p className="text-muted-foreground text-sm">
                            Evidência: {entry.evidence}
                          </p>
                        )}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground">Nenhuma pergunta respondida para este diagnóstico.</p>
            )}
          </div>
        </CardContent>
        <div className="mt-8 text-center">
          <Button onClick={() => navigate('/ops/flow')} className="inline-flex items-center rounded-lg bg-sollux-red hover:bg-sollux-orange">
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para o Flow
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default PublicDiagnosticResultsPage;