import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Award, CheckCircle, Clock, XCircle, TrendingUp, LayoutDashboard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { useCompany } from '@/components/CompanyContext';
import { Diagnostic } from '@/types/diagnostic';
import { DiagnosticQuestionnaire } from '@/types/diagnosticQuestionnaire';
import { Pillar } from '@/types/pillar';
import { PillarBlock } from '@/types/pillarBlock';
import { ClassificationScale } from '@/types/classificationScale';
import { DiagnosticStatus } from '@/types/diagnosticStatus';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

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

const FlowPage: React.FC = () => {
  const { user } = useSession();
  const { selectedCompany } = useCompany();

  // Fetch all diagnostics for the selected company and user
  const { data: diagnostics, isLoading: isLoadingDiagnostics } = useQuery<Diagnostic[], Error>({
    queryKey: ['allDiagnosticsForFlow', user?.id, selectedCompany?.id],
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

  // Fetch all pillars for the current user
  const { data: allPillars, isLoading: isLoadingAllPillars } = useQuery<Pillar[], Error>({
    queryKey: ['allPillarsForFlow', user?.id],
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

  // Fetch all pillar blocks for the current user
  const { data: allPillarBlocks, isLoading: isLoadingAllPillarBlocks } = useQuery<PillarBlock[], Error>({
    queryKey: ['allPillarBlocksForFlow', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('pillar_blocks')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch ALL questionnaire entries for ALL diagnostics under the selected company
  const { data: allCompanyQuestionnaireEntries, isLoading: isLoadingAllCompanyQuestionnaireEntries } = useQuery<DiagnosticQuestionnaire[], Error>({
    queryKey: ['allCompanyQuestionnaireEntriesForFlow', user?.id, selectedCompany?.id],
    queryFn: async () => {
      if (!user?.id || !selectedCompany?.id) return [];

      // First, get all diagnostic IDs for the selected company
      const { data: diagnosticIdsData, error: diagnosticIdsError } = await supabase
        .from('diagnostics')
        .select('id')
        .eq('user_id', user.id)
        .eq('company_id', selectedCompany.id);

      if (diagnosticIdsError) throw diagnosticIdsError;
      const diagnosticIds = diagnosticIdsData.map(d => d.id);

      if (diagnosticIds.length === 0) return [];

      // Then, fetch all questionnaire entries for these diagnostic IDs
      const { data, error } = await supabase
        .from('diagnostic_questionnaires')
        .select(`
          id,
          diagnostic_id,
          kpi_id,
          score_id,
          evidence,
          order_number,
          kpis(question, pillar_id, pillar_block_id),
          scoring_scales(score, description)
        `)
        .eq('user_id', user.id)
        .eq('company_id', selectedCompany.id)
        .in('diagnostic_id', diagnosticIds)
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
    enabled: !!user?.id && !!selectedCompany?.id,
  });

  // Fetch classification scales
  const { data: classificationScales, isLoading: isLoadingClassificationScales } = useQuery<ClassificationScale[], Error>({
    queryKey: ['classificationScalesForFlow', user?.id],
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

  // Fetch diagnostic statuses for display
  const { data: diagnosticStatuses, isLoading: isLoadingDiagnosticStatuses } = useQuery<DiagnosticStatus[], Error>({
    queryKey: ['diagnosticStatusesForFlow', user?.id],
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

  const isLoadingPage = isLoadingDiagnostics || isLoadingAllPillars || isLoadingAllPillarBlocks || isLoadingAllCompanyQuestionnaireEntries || isLoadingClassificationScales || isLoadingDiagnosticStatuses;

  // --- Lógica de Cálculo de Indicadores Agregados por Pilar ---
  const { pillarIndicators, classificationDistribution } = useMemo(() => {
    if (!allPillars || !allCompanyQuestionnaireEntries || !allPillarBlocks || !classificationScales) {
      return { pillarIndicators: [], classificationDistribution: [] };
    }

    const pillarResults: {
      [pillarId: string]: {
        description: string;
        totalWeightedScore: number;
        totalWeight: number;
        blocks: {
          [blockId: string]: {
            name: string;
            totalScore: number;
            maxScore: number;
            questionCount: number;
            weight: number;
          };
        };
      };
    } = {};

    // Initialize pillar results
    allPillars.forEach(pillar => {
      if (pillar.id) {
        pillarResults[pillar.id] = {
          description: pillar.description,
          totalWeightedScore: 0,
          totalWeight: 0,
          blocks: {},
        };
      }
    });

    // Initialize block results within each pillar
    allPillarBlocks.forEach(block => {
      if (block.pillar_id && pillarResults[block.pillar_id] && block.id) {
        pillarResults[block.pillar_id].blocks[block.id] = {
          name: block.name,
          totalScore: 0,
          maxScore: 0,
          questionCount: 0,
          weight: block.weight_percentage,
        };
      }
    });

    // Aggregate scores for each block from ALL questionnaire entries
    allCompanyQuestionnaireEntries.forEach(entry => {
      const pillarId = entry.kpis?.pillar_id;
      const blockId = entry.kpis?.pillar_block_id;
      const score = entry.scoring_scales?.score;

      if (pillarId && blockId && score !== undefined && pillarResults[pillarId]?.blocks[blockId]) {
        pillarResults[pillarId].blocks[blockId].totalScore += score;
        pillarResults[pillarId].blocks[blockId].maxScore += 5; // Max score for one question is 5
        pillarResults[pillarId].blocks[blockId].questionCount += 1;
      }
    });

    const calculatedPillarIndicators: Array<{
      id: string;
      description: string;
      percentage: number;
      classification: ClassificationScale | null;
    }> = [];

    const classificationCounts: { [label: string]: number } = {};

    // Calculate percentage for each block and then weighted average for each pillar
    Object.keys(pillarResults).forEach(pillarId => {
      const pillarData = pillarResults[pillarId];
      let currentPillarWeightedScore = 0;
      let currentPillarTotalWeight = 0;

      Object.keys(pillarData.blocks).forEach(blockId => {
        const blockData = pillarData.blocks[blockId];
        if (blockData.questionCount > 0) {
          const blockPercentage = (blockData.totalScore / blockData.maxScore) * 100;
          currentPillarWeightedScore += (blockPercentage * blockData.weight);
          currentPillarTotalWeight += blockData.weight;
        } else {
          // If no questions answered for a block, its weight still contributes to total weight
          // but its score contribution is 0.
          currentPillarTotalWeight += blockData.weight;
        }
      });

      const pillarOverallPercentage = currentPillarTotalWeight > 0 ? (currentPillarWeightedScore / currentPillarTotalWeight) : 0;
      const pillarOverallClassification = classifyPercentage(pillarOverallPercentage, classificationScales, pillarId, null);

      calculatedPillarIndicators.push({
        id: pillarId,
        description: pillarData.description,
        percentage: pillarOverallPercentage,
        classification: pillarOverallClassification,
      });

      if (pillarOverallClassification) {
        const label = pillarOverallClassification.classification_label;
        classificationCounts[label] = (classificationCounts[label] || 0) + 1;
      }
    });

    const chartData = Object.keys(classificationCounts).map(label => {
      const classification = classificationScales.find(s => s.classification_label === label);
      return {
        name: label,
        value: classificationCounts[label],
        color: classification ? getColorClass(classification.color_code) : '#ccc',
      };
    });

    return { pillarIndicators: calculatedPillarIndicators, classificationDistribution: chartData };
  }, [allPillars, allCompanyQuestionnaireEntries, allPillarBlocks, classificationScales]);

  // Diagnostic Status Counts
  const diagnosticStatusCounts = useMemo(() => {
    const counts: { [statusId: string]: number } = {};
    diagnostics?.forEach(d => {
      if (d.diagnostic_status_id) {
        counts[d.diagnostic_status_id] = (counts[d.diagnostic_status_id] || 0) + 1;
      }
    });
    return counts;
  }, [diagnostics]);

  const getStatusDescription = (statusId: string) => {
    return diagnosticStatuses?.find(s => s.id === statusId)?.description || 'Desconhecido';
  };

  if (!selectedCompany) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Por favor, selecione uma empresa na barra lateral para visualizar o dashboard SOLLUX FLOW™.
      </div>
    );
  }

  if (isLoadingPage) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-sollux-red" />
        <span className="ml-2 text-muted-foreground">Carregando dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="text-foreground uppercase font-bold">SOLLUX FLOW™ - Dashboard de Operações</CardTitle>
          <CardDescription className="text-muted-foreground">
            Visão consolidada dos diagnósticos para a empresa: <span className="font-semibold">{selectedCompany.name}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Visão Geral dos Diagnósticos */}
          <h3 className="text-lg font-semibold text-foreground mb-4">Visão Geral dos Diagnósticos</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="p-4 border border-border rounded-lg bg-muted/50">
              <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5 text-blue-600" /> Total de Diagnósticos
              </h4>
              <p className="text-2xl font-bold text-foreground">{diagnostics?.length || 0}</p>
            </Card>
            {Object.keys(diagnosticStatusCounts).map(statusId => (
              <Card key={statusId} className="p-4 border border-border rounded-lg bg-muted/50">
                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  {statusId === diagnosticStatuses?.find(s => s.description === 'Concluído')?.id && <CheckCircle className="h-5 w-5 text-green-600" />}
                  {statusId === diagnosticStatuses?.find(s => s.description === 'Em Andamento')?.id && <Clock className="h-5 w-5 text-yellow-600" />}
                  {statusId === diagnosticStatuses?.find(s => s.description === 'Pendente')?.id && <XCircle className="h-5 w-5 text-red-600" />}
                  {getStatusDescription(statusId)}
                </h4>
                <p className="text-2xl font-bold text-foreground">{diagnosticStatusCounts[statusId]}</p>
              </Card>
            ))}
          </div>

          {/* Performance por Pilar */}
          <h3 className="text-lg font-semibold text-foreground mb-4">Performance por Pilar</h3>
          {pillarIndicators.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum dado de diagnóstico encontrado para calcular a performance dos pilares.
              Certifique-se de que há diagnósticos criados e questionários respondidos.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {pillarIndicators.map(pillar => (
                <Card key={pillar.id} className="p-4 border border-border rounded-lg bg-muted/50">
                  <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-sollux-orange" /> {pillar.description}
                  </h4>
                  <p className="text-2xl font-bold text-foreground">
                    {pillar.percentage.toFixed(2)}%
                    {pillar.classification && (
                      <Badge className={getColorClass(pillar.classification.color_code)} style={{ marginLeft: '10px' }}>
                        {pillar.classification.classification_label}
                      </Badge>
                    )}
                  </p>
                </Card>
              ))}
            </div>
          )}

          {/* Gráfico de Distribuição de Classificação */}
          {classificationDistribution.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-foreground mb-4">Distribuição de Classificação dos Pilares</h3>
              <Card className="p-4 border border-border rounded-lg bg-muted/50 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={classificationDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                    >
                      {classificationDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value: number, name: string) => [`${value} Pilares`, name]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </div>
          )}

          {/* Diagnósticos Recentes */}
          <h3 className="text-lg font-semibold text-foreground mb-4">Diagnósticos Recentes</h3>
          {diagnostics && diagnostics.length > 0 ? (
            <div className="space-y-3">
              {diagnostics.slice(0, 5).map(diagnostic => (
                <Card key={diagnostic.id} className="p-3 border border-border rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-foreground">
                        {diagnostic.pillars?.description || 'Pilar Desconhecido'} - {diagnostic.pillar_blocks?.name || 'Bloco Desconhecido'}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Status: {diagnostic.diagnostic_statuses?.description || 'N/A'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Criado em: {format(new Date(diagnostic.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </p>
                    </div>
                    <Link to={`/ops/insight/evaluation`}> {/* Link para a página de avaliação */}
                      <Button variant="outline" size="sm" className="rounded-lg text-foreground border-border hover:bg-accent">
                        Ver Detalhes
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
              {diagnostics.length > 5 && (
                <div className="text-center mt-4">
                  <Link to="/ops/diagnostics">
                    <Button variant="outline" className="text-foreground border-border hover:bg-accent">
                      Ver todos os diagnósticos
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Nenhum diagnóstico recente encontrado.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FlowPage;