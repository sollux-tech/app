import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Award, CheckCircle, Clock, XCircle, TrendingUp, LayoutDashboard, Settings } from 'lucide-react';
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
import { Link } from '@/components/ui/link'; // Importar Link do shadcn/ui
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { usePageConfig } from '@/hooks/usePageConfig'; // Importar o novo hook
import PageSettingsDialog from '@/components/PageSettingsDialog'; // Importar o novo componente
import SectionWrapper from '@/components/SectionWrapper'; // Importar o novo componente

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

const getColorHex = (colorCode: 'red' | 'yellow' | 'blue' | 'green' | undefined) => {
  switch (colorCode) {
    case 'red': return '#EF4444'; // Tailwind red-500
    case 'yellow': return '#F59E0B'; // Tailwind yellow-500
    case 'blue': return '#3B82F6'; // Tailwind blue-500
    case 'green': return '#22C55E'; // Tailwind green-500
    default: return '#9CA3AF'; // Tailwind gray-400
  }
};

// Definição das seções disponíveis para a página Flow
const flowSections = [
  { id: 'overview-diagnostics', label: 'Visão Geral dos Diagnósticos' },
  { id: 'pillar-performance', label: 'Performance por Pilar' },
  { id: 'classification-distribution', label: 'Distribuição de Classificação dos Pilares' },
  { id: 'recent-diagnostics', label: 'Diagnósticos Recentes' },
];

const FlowPage: React.FC = () => {
  const { user } = useSession();
  const { selectedCompany } = useCompany();

  // Global filter states
  const [selectedPillarFilter, setSelectedPillarFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);

  // Usar o hook usePageConfig para gerenciar a visibilidade das seções
  const {
    visibleSections,
    isLoadingConfig,
    isSavingConfig,
    toggleSectionVisibility,
    setAllVisibleSections,
  } = usePageConfig('flow', flowSections);

  // Fetch all pillars for the current user (for filter dropdown)
  const { data: allPillars, isLoading: isLoadingAllPillars } = useQuery<Pillar[], Error>({
    queryKey: ['allPillarsForFlowFilter', user?.id],
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

  // Fetch all diagnostic statuses for the current user (for filter dropdown)
  const { data: allDiagnosticStatuses, isLoading: isLoadingAllDiagnosticStatuses } = useQuery<DiagnosticStatus[], Error>({
    queryKey: ['allDiagnosticStatusesForFlowFilter', user?.id],
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

  // Fetch diagnostics based on selected filters for the selected company and user
  const { data: diagnostics, isLoading: isLoadingDiagnostics } = useQuery<Diagnostic[], Error>({
    queryKey: ['diagnosticsForFlow', user?.id, selectedCompany?.id, selectedPillarFilter, selectedStatusFilter],
    queryFn: async () => {
      if (!user?.id || !selectedCompany?.id) return [];
      let query = supabase
        .from('diagnostics')
        .select('*, companies(name), pillars(description), pillar_blocks(name), diagnostic_statuses(description)')
        .eq('user_id', user.id)
        .eq('company_id', selectedCompany.id);
      
      if (selectedPillarFilter !== 'all') {
        query = query.eq('pillar_id', selectedPillarFilter);
      }
      if (selectedStatusFilter !== 'all') {
        query = query.eq('diagnostic_status_id', selectedStatusFilter);
      }

      query = query.order('created_at', { ascending: false });
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!selectedCompany?.id,
  });

  // Fetch all pillar blocks for the current user (filtered by selectedPillarFilter if applicable)
  const { data: allPillarBlocks, isLoading: isLoadingAllPillarBlocks } = useQuery<PillarBlock[], Error>({
    queryKey: ['allPillarBlocksForFlow', user?.id, selectedPillarFilter],
    queryFn: async () => {
      if (!user?.id) return [];
      let query = supabase
        .from('pillar_blocks')
        .select('*')
        .eq('user_id', user.id);
      
      if (selectedPillarFilter !== 'all') {
        query = query.eq('pillar_id', selectedPillarFilter);
      }

      query = query.order('name', { ascending: true });
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch ALL questionnaire entries for ALL diagnostics under the selected company and filters
  const { data: allCompanyQuestionnaireEntries, isLoading: isLoadingAllCompanyQuestionnaireEntries } = useQuery<DiagnosticQuestionnaire[], Error>({
    queryKey: ['allCompanyQuestionnaireEntriesForFlow', user?.id, selectedCompany?.id, selectedPillarFilter, selectedStatusFilter],
    queryFn: async () => {
      if (!user?.id || !selectedCompany?.id) return [];

      // First, get all diagnostic IDs for the selected company and filters
      let diagnosticIdsQuery = supabase
        .from('diagnostics')
        .select('id')
        .eq('user_id', user.id)
        .eq('company_id', selectedCompany.id);
      
      if (selectedPillarFilter !== 'all') {
        diagnosticIdsQuery = diagnosticIdsQuery.eq('pillar_id', selectedPillarFilter);
      }
      if (selectedStatusFilter !== 'all') {
        diagnosticIdsQuery = diagnosticIdsQuery.eq('diagnostic_status_id', selectedStatusFilter);
      }

      const { data: diagnosticIdsData, error: diagnosticIdsError } = await diagnosticIdsQuery;

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

  const isLoadingPage = isLoadingDiagnostics || isLoadingAllPillars || isLoadingAllPillarBlocks || isLoadingAllCompanyQuestionnaireEntries || isLoadingClassificationScales || isLoadingAllDiagnosticStatuses || isLoadingConfig;

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

    // Initialize pillar results for all relevant pillars (based on filter)
    const filteredPillars = selectedPillarFilter === 'all'
      ? allPillars
      : allPillars.filter(p => p.id === selectedPillarFilter);

    filteredPillars.forEach(pillar => {
      if (pillar.id) {
        pillarResults[pillar.id] = {
          description: pillar.description,
          totalWeightedScore: 0,
          totalWeight: 0,
          blocks: {},
        };
      }
    });

    // Initialize block results within each pillar (filtered by selectedPillarFilter if applicable)
    const filteredPillarBlocks = selectedPillarFilter === 'all'
      ? allPillarBlocks
      : allPillarBlocks.filter(block => block.pillar_id === selectedPillarFilter);

    filteredPillarBlocks.forEach(block => {
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

    // Aggregate scores for each block from ALL answered questionnaire entries
    allCompanyQuestionnaireEntries
      .filter(entry => entry.score_id !== null) // ONLY process answered questions
      .forEach(entry => {
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
      let hasAnsweredQuestionsInPillar = false; // Flag to check if any question in this pillar was answered

      Object.keys(pillarData.blocks).forEach(blockId => {
        const blockData = pillarData.blocks[blockId];
        if (blockData.questionCount > 0) {
          const blockPercentage = (blockData.totalScore / blockData.maxScore) * 100;
          currentPillarWeightedScore += (blockPercentage * blockData.weight);
          currentPillarTotalWeight += blockData.weight;
          hasAnsweredQuestionsInPillar = true;
        } else {
          // If no questions answered for a block, its weight still contributes to total weight
          // but its score contribution is 0.
          currentPillarTotalWeight += blockData.weight;
        }
      });

      // Only include pillars that actually have some answered questions
      if (hasAnsweredQuestionsInPillar && currentPillarTotalWeight > 0) {
        const pillarOverallPercentage = (currentPillarWeightedScore / currentPillarTotalWeight);
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
      }
    });

    const chartData = Object.keys(classificationCounts).map(label => {
      const classification = classificationScales.find(s => s.classification_label === label);
      return {
        name: label,
        value: classificationCounts[label],
        color: classification ? getColorHex(classification.color_code) : '#ccc', // Usar getColorHex aqui
      };
    });

    return { pillarIndicators: calculatedPillarIndicators, classificationDistribution: chartData };
  }, [allPillars, allCompanyQuestionnaireEntries, allPillarBlocks, classificationScales, selectedPillarFilter]);

  // Diagnostic Status Counts (filtered by global filters)
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
    return allDiagnosticStatuses?.find(s => s.id === statusId)?.description || 'Desconhecido';
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
      <div className="flex justify-end mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsSettingsDialogOpen(true)}
          className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg"
          title="Configurar seções da página"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>

      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="text-foreground uppercase font-bold">Filtros Globais</CardTitle>
          <CardDescription className="text-muted-foreground">
            Aplique filtros para refinar os dados exibidos no dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Filtro por Pilar */}
            <div>
              <Label htmlFor="pillar-filter" className="text-foreground">Filtrar por Pilar</Label>
              <Select
                value={selectedPillarFilter}
                onValueChange={setSelectedPillarFilter}
                disabled={isLoadingAllPillars}
              >
                <SelectTrigger id="pillar-filter" className="rounded-lg">
                  <SelectValue placeholder="Todos os Pilares" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Pilares</SelectItem>
                  {allPillars?.map((pillar) => (
                    <SelectItem key={pillar.id} value={pillar.id}>
                      {pillar.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Status */}
            <div>
              <Label htmlFor="status-filter" className="text-foreground">Filtrar por Status</Label>
              <Select
                value={selectedStatusFilter}
                onValueChange={setSelectedStatusFilter}
                disabled={isLoadingAllDiagnosticStatuses}
              >
                <SelectTrigger id="status-filter" className="rounded-lg">
                  <SelectValue placeholder="Todos os Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  {allDiagnosticStatuses?.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      {status.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visão Geral dos Diagnósticos */}
      <SectionWrapper
        id="overview-diagnostics"
        title="Visão Geral dos Diagnósticos"
        isVisible={visibleSections.includes('overview-diagnostics')}
        onDismiss={toggleSectionVisibility}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 border border-border rounded-lg bg-muted/50">
            <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5 text-blue-600" /> Total de Diagnósticos
            </h4>
            <p className="text-2xl font-bold text-foreground">{diagnostics?.length || 0}</p>
          </Card>
          {Object.keys(diagnosticStatusCounts).map(statusId => (
            <Card key={statusId} className="p-4 border border-border rounded-lg bg-muted/50">
              <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                {statusId === allDiagnosticStatuses?.find(s => s.description === 'Concluído')?.id && <CheckCircle className="h-5 w-5 text-green-600" />}
                {statusId === allDiagnosticStatuses?.find(s => s.description === 'Em Andamento')?.id && <Clock className="h-5 w-5 text-yellow-600" />}
                {statusId === allDiagnosticStatuses?.find(s => s.description === 'Pendente')?.id && <XCircle className="h-5 w-5 text-red-600" />}
                {getStatusDescription(statusId)}
              </h4>
              <p className="text-2xl font-bold text-foreground">{diagnosticStatusCounts[statusId]}</p>
            </Card>
          ))}
        </div>
      </SectionWrapper>

      {/* Performance por Pilar */}
      <SectionWrapper
        id="pillar-performance"
        title="Performance por Pilar"
        isVisible={visibleSections.includes('pillar-performance')}
        onDismiss={toggleSectionVisibility}
      >
        {pillarIndicators.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum dado de diagnóstico encontrado para calcular a performance dos pilares com os filtros aplicados.
            Certifique-se de que há diagnósticos criados e questionários respondidos.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
      </SectionWrapper>

      {/* Gráfico de Distribuição de Classificação */}
      <SectionWrapper
        id="classification-distribution"
        title="Distribuição de Classificação dos Pilares"
        isVisible={visibleSections.includes('classification-distribution')}
        onDismiss={toggleSectionVisibility}
      >
        {classificationDistribution.length > 0 ? (
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
        ) : (
          <p className="text-center text-muted-foreground py-8">
            Nenhum dado de diagnóstico encontrado para calcular a distribuição de classificação dos pilares com os filtros aplicados.
          </p>
        )}
      </SectionWrapper>

      {/* Diagnósticos Recentes */}
      <SectionWrapper
        id="recent-diagnostics"
        title="Diagnósticos Recentes"
        isVisible={visibleSections.includes('recent-diagnostics')}
        onDismiss={toggleSectionVisibility}
      >
        {diagnostics && diagnostics.length > 0 ? (
          <div className="space-y-3">
            {diagnostics.map(diagnostic => (
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
                  <Link to={`/ops/flow/diagnostic-results/${diagnostic.id}`}>
                    <Button variant="outline" size="sm" className="rounded-lg text-foreground border-border hover:bg-accent">
                      Ver Detalhes
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">Nenhum diagnóstico encontrado com os filtros aplicados.</p>
        )}
      </SectionWrapper>

      <PageSettingsDialog
        open={isSettingsDialogOpen}
        onOpenChange={setIsSettingsDialogOpen}
        availableSections={flowSections}
        currentVisibleSections={visibleSections}
        onSave={setAllVisibleSections}
        isSaving={isSavingConfig}
      />
    </div>
  );
};

export default FlowPage;