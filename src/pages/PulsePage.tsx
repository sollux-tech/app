import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { HeartPulse, TrendingUp, Activity, Bell, Settings, Search, Briefcase, Users, Calendar, FileText, MessageSquareText, CheckCircle, Award, LayoutDashboard, Loader2 } from 'lucide-react'; 
import FeatureCard from '@/components/FeatureCard';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PulseInformative } from '@/types/pulseInformative';
import { Job } from '@/types/job';
import { Form as FormType } from '@/types/form'; // Importar o tipo Form
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link, useNavigate } from 'react-router-dom'; // Importar useNavigate
import { Button } from '@/components/ui/button';
import { useCompany } from '@/components/CompanyContext';
import { Pillar } from '@/types/pillar'; // Importar Pillar
import { PillarBlock } from '@/types/pillarBlock'; // Importar PillarBlock
import { ClassificationScale } from '@/types/classificationScale'; // Importar ClassificationScale
import { DiagnosticQuestionnaire } from '@/types/diagnosticQuestionnaire'; // Importar DiagnosticQuestionnaire
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { usePageConfig } from '@/hooks/usePageConfig'; // Importar o novo hook
import PageSettingsDialog from '@/components/PageSettingsDialog'; // Importar o novo componente
import SectionWrapper from '@/components/SectionWrapper'; // Importar o novo componente

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

// Função para obter o código hexadecimal da cor
const getColorHex = (colorCode: 'red' | 'yellow' | 'blue' | 'green' | undefined) => {
  switch (colorCode) {
    case 'red': return '#EF4444'; // Tailwind red-500
    case 'yellow': return '#F59E0B'; // Tailwind yellow-500
    case 'blue': return '#3B82F6'; // Tailwind blue-500
    case 'green': return '#22C55E'; // Tailwind green-500
    default: return '#9CA3AF'; // Tailwind gray-400
  }
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

// Definição das seções disponíveis para a página Pulse
const pulseSections = [
  { id: 'pulse-of-the-day', label: 'PULSE do Dia' },
  { id: 'indicator-dashboard', label: 'Dashboard de Indicadores' },
  { id: 'jobs-dashboard', label: 'Dashboard de Vagas Publicadas' },
  { id: 'forms-dashboard', label: 'Dashboard de Formulários' },
];

const PulsePage: React.FC = () => {
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const today = format(new Date(), 'yyyy-MM-dd');
  const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');

  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);

  // Usar o hook usePageConfig para gerenciar a visibilidade das seções
  const {
    visibleSections,
    isLoadingConfig,
    isSavingConfig,
    toggleSectionVisibility,
    setAllVisibleSections,
  } = usePageConfig('pulse', pulseSections);

  // Query para o informativo do dia
  const { data: informativeToday, isLoading: isLoadingInformative, error: errorInformative } = useQuery<PulseInformative | null, Error>({
    queryKey: ['pulseInformativeToday', today],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('pulse_informatives')
          .select('*')
          .eq('publication_date', today)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (error) {
          console.error("PulsePage: Erro na consulta de informativo:", error);
          console.error("PulsePage: Detalhes do erro:", JSON.stringify(error, null, 2));
          throw error;
        }
        return data.length > 0 ? data[0] : null;
      } catch (e: any) {
        console.error("PulsePage: Erro inesperado ao buscar informativo:", e);
        console.error("PulsePage: Detalhes do erro inesperado:", JSON.stringify(e, null, 2));
        throw e;
      }
    },
  });

  // Query para vagas publicadas nos últimos 30 dias
  const { data: recentJobs, isLoading: isLoadingJobs } = useQuery<Job[], Error>({
    queryKey: ['recentJobs', selectedCompany?.id, thirtyDaysAgo],
    queryFn: async () => {
      if (!selectedCompany) return [];
      
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('company_id', selectedCompany.id)
        .gte('created_at', `${thirtyDaysAgo}T00:00:00.000Z`)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompany,
  });

  // Query para formulários criados nos últimos 30 dias
  const { data: recentForms, isLoading: isLoadingForms } = useQuery<FormType[], Error>({
    queryKey: ['recentForms', selectedCompany?.id, thirtyDaysAgo],
    queryFn: async () => {
      if (!selectedCompany) return [];

      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('company_id', selectedCompany.id)
        .gte('created_at', `${thirtyDaysAgo}T00:00:00.000Z`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompany,
  });

  // --- Queries para o Dashboard de Indicadores ---
  const { data: allPillars, isLoading: isLoadingAllPillars } = useQuery<Pillar[], Error>({
    queryKey: ['allPillarsForPulseDashboard', selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) return [];
      const { data, error } = await supabase
        .from('pillars')
        .select('*')
        .eq('user_id', selectedCompany.user_id) // Assuming company owner is the user for pillars
        .order('description', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompany?.id,
  });

  const { data: allPillarBlocks, isLoading: isLoadingAllPillarBlocks } = useQuery<PillarBlock[], Error>({
    queryKey: ['allPillarBlocksForPulseDashboard', selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) return [];
      const { data, error } = await supabase
        .from('pillar_blocks')
        .select('*')
        .eq('user_id', selectedCompany.user_id) // Assuming company owner is the user for pillar blocks
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompany?.id,
  });

  const { data: allCompanyQuestionnaireEntries, isLoading: isLoadingAllCompanyQuestionnaireEntries } = useQuery<DiagnosticQuestionnaire[], Error>({
    queryKey: ['allCompanyQuestionnaireEntriesForPulseDashboard', selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) return [];

      // First, get all diagnostic IDs for the selected company
      const { data: diagnosticIdsData, error: diagnosticIdsError } = await supabase
        .from('diagnostics')
        .select('id')
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
    enabled: !!selectedCompany?.id,
  });

  const { data: classificationScales, isLoading: isLoadingClassificationScales } = useQuery<ClassificationScale[], Error>({
    queryKey: ['classificationScalesForPulseDashboard', selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) return [];
      const { data, error } = await supabase
        .from('classification_scales')
        .select('*, pillars(description), pillar_blocks(name)')
        .eq('user_id', selectedCompany.user_id) // Assuming company owner is the user for classification scales
        .order('min_percentage', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompany?.id,
  });
  // --- Fim das Queries para o Dashboard de Indicadores ---

  // Calcular estatísticas de vagas
  const totalJobs = recentJobs?.length || 0;
  const activeJobs = recentJobs?.filter(job => job.status === 'active').length || 0;
  const inactiveJobs = totalJobs - activeJobs;
  const avgSalary = recentJobs?.reduce((sum, job) => {
    if (job.salary_min && job.salary_max) {
      return sum + ((job.salary_min + job.salary_max) / 2);
    }
    return sum;
  }, 0) / totalJobs || 0;

  // Calcular estatísticas de formulários
  const totalForms = recentForms?.length || 0;
  const publishedForms = recentForms?.filter(form => form.status === 'published').length || 0;
  const draftForms = totalForms - publishedForms;
  const totalFormResponses = recentForms?.reduce((sum, form) => sum + (form.response_count || 0), 0) || 0;

  // --- Lógica de Cálculo de Indicadores Agregados por Pilar (para o Dashboard de Indicadores) ---
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

    // Initialize pillar results for all relevant pillars
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
        color: classification ? getColorHex(classification.color_code) : '#ccc',
      };
    });

    return { pillarIndicators: calculatedPillarIndicators, classificationDistribution: chartData };
  }, [allPillars, allCompanyQuestionnaireEntries, allPillarBlocks, classificationScales, selectedCompany?.id]);
  // --- Fim da Lógica de Cálculo de Indicadores ---

  const isLoadingIndicators = isLoadingAllPillars || isLoadingAllPillarBlocks || isLoadingAllCompanyQuestionnaireEntries || isLoadingClassificationScales;

  if (isLoadingConfig) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-sollux-red" />
        <span className="ml-2 text-muted-foreground">Carregando configurações da página...</span>
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

      {/* Informativo PULSE do Dia */}
      <SectionWrapper
        id="pulse-of-the-day"
        title="PULSE do Dia"
        isVisible={visibleSections.includes('pulse-of-the-day')}
        onDismiss={toggleSectionVisibility}
      >
        {isLoadingInformative ? (
          <p className="text-muted-foreground text-center">Carregando informativo...</p>
        ) : errorInformative ? (
          <p className="text-destructive text-center">Erro ao carregar informativo: {errorInformative.message}</p>
        ) : informativeToday ? (
          <div className="space-y-4">
            {informativeToday.short_summary && (
              <div className="prose max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: informativeToday.short_summary }} />
            )}
            <div className="mt-4 text-right">
              <Link to={`/informative/${informativeToday.id}`}>
                <Button variant="link" className="text-sollux-red hover:underline">
                  Ler na Íntegra
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground text-center">Nenhum informativo PULSE publicado para hoje.</div>
        )}
        <div className="mt-6 text-right">
          <Link to="/pulse/informatives">
            <Button variant="outline" size="sm" className="rounded-lg text-foreground border-border hover:bg-accent">
              Ver Todos os Informativos
            </Button>
          </Link>
        </div>
      </SectionWrapper>

      {/* Dashboard de Indicadores */}
      <SectionWrapper
        id="indicator-dashboard"
        title="Dashboard de Indicadores"
        description={selectedCompany ? `Visão consolidada para: ${selectedCompany.name}` : 'Selecione uma empresa para ver os indicadores.'}
        isVisible={visibleSections.includes('indicator-dashboard')}
        onDismiss={toggleSectionVisibility}
      >
        {!selectedCompany ? (
          <p className="text-center text-muted-foreground py-8">Por favor, selecione uma empresa na barra lateral para ver os indicadores.</p>
        ) : isLoadingIndicators ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-sollux-red" />
            <span className="ml-2 text-muted-foreground">Carregando indicadores...</span>
          </div>
        ) : pillarIndicators.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum dado de diagnóstico encontrado para calcular a performance dos pilares.
            Certifique-se de que há diagnósticos criados e questionários respondidos para esta empresa.
          </p>
        ) : (
          <div className="space-y-6">
            {/* Performance por Pilar */}
            <h3 className="text-lg font-semibold text-foreground mb-4">Performance por Pilar</h3>
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
          </div>
        )}
        {selectedCompany && (
          <div className="mt-6 text-right">
            <Link to="/ops/flow">
              <Button variant="outline" size="sm" className="rounded-lg text-foreground border-border hover:bg-accent">
                Ver Detalhes no Flow
              </Button>
            </Link>
          </div>
        )}
      </SectionWrapper>

      {/* Dashboard de Vagas Publicadas */}
      <SectionWrapper
        id="jobs-dashboard"
        title="Dashboard de Vagas Publicadas"
        description={selectedCompany ? `Últimos 30 dias - ${selectedCompany.name}` : 'Selecione uma empresa para ver as estatísticas'}
        isVisible={visibleSections.includes('jobs-dashboard')}
        onDismiss={toggleSectionVisibility}
      >
        {!selectedCompany ? (
          <p className="text-center text-muted-foreground py-8">Por favor, selecione uma empresa na barra lateral para ver as estatísticas de vagas.</p>
        ) : isLoadingJobs ? (
          <p className="text-center text-muted-foreground">Carregando estatísticas...</p>
        ) : (
          <div className="space-y-6">
            {/* Estatísticas Principais */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Total de Vagas</span>
                </div>
                <div className="text-2xl font-bold text-blue-900">{totalJobs}</div>
                <p className="text-xs text-blue-700">Últimos 30 dias</p>
              </div>
              
              <div className="bg-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-900">Vagas Ativas</span>
                </div>
                <div className="text-2xl font-bold text-green-900">{activeJobs}</div>
                <p className="text-xs text-green-700">Disponíveis para candidatos</p>
              </div>
              
              <div className="bg-muted p-4 rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Vagas Inativas</span>
                </div>
                <div className="text-2xl font-bold text-foreground">{inactiveJobs}</div>
                <p className="text-xs text-muted-foreground">Pausadas ou encerradas</p>
              </div>
              
              <div className="bg-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium text-purple-900">Média Salarial</span>
                </div>
                <div className="text-2xl font-bold text-purple-900">
                  {avgSalary > 0 ? `R$ ${avgSalary.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}` : 'N/A'}
                </div>
                <p className="text-xs text-purple-700">Baseado nas vagas publicadas</p>
              </div>
            </div>

            {/* Vagas Recentes */}
            {recentJobs && recentJobs.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-foreground mb-4">Vagas Recentes</h4>
                <div className="space-y-3">
                  {recentJobs.slice(0, 5).map((job) => (
                    <div key={job.id} className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border">
                      <div className="flex-1">
                        <h5 className="font-medium text-foreground">{job.title}</h5>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(job.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          job.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {job.status === 'active' ? 'Ativa' : 'Inativa'}
                        </span>
                        <Link to={`/jobs/${job.id}`}>
                          <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50 rounded-lg">
                            Ver
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
                {recentJobs.length > 5 && (
                  <div className="text-center mt-4">
                    <Link to="/connect/jobs">
                      <Button variant="outline" className="text-foreground border-border hover:bg-accent">
                        Ver todas as vagas
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {selectedCompany && (
          <div className="mt-6 text-right">
            <Link to="/connect/jobs">
              <Button variant="outline" size="sm" className="rounded-lg text-foreground border-border hover:bg-accent">
                Gerenciar Vagas
              </Button>
            </Link>
          </div>
        )}
      </SectionWrapper>

      {/* Novo Dashboard de Formulários */}
      <SectionWrapper
        id="forms-dashboard"
        title="Dashboard de Formulários"
        description={selectedCompany ? `Últimos 30 dias - ${selectedCompany.name}` : 'Selecione uma empresa para ver as estatísticas'}
        isVisible={visibleSections.includes('forms-dashboard')}
        onDismiss={toggleSectionVisibility}
      >
        {!selectedCompany ? (
          <p className="text-center text-muted-foreground py-8">Por favor, selecione uma empresa na barra lateral para ver as estatísticas de formulários.</p>
        ) : isLoadingForms ? (
          <p className="text-center text-muted-foreground">Carregando estatísticas...</p>
        ) : (
          <div className="space-y-6">
            {/* Estatísticas Principais de Formulários */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Total de Formulários</span>
                </div>
                <div className="text-2xl font-bold text-blue-900">{totalForms}</div>
                <p className="text-xs text-blue-700">Últimos 30 dias</p>
              </div>
              
              <div className="bg-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-900">Formulários Publicados</span>
                </div>
                <div className="text-2xl font-bold text-green-900">{publishedForms}</div>
                <p className="text-xs text-green-700">Disponíveis para respostas</p>
              </div>
              
              <div className="bg-muted p-4 rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Formulários em Rascunho</span>
                </div>
                <div className="text-2xl font-bold text-foreground">{draftForms}</div>
                <p className="text-xs text-muted-foreground">Aguardando edição</p>
              </div>
              
              <div className="bg-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquareText className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium text-purple-900">Total de Respostas</span>
                </div>
                <div className="text-2xl font-bold text-purple-900">{totalFormResponses}</div>
                  <p className="text-xs text-purple-700">Recebidas nos formulários</p>
                </div>
              </div>

              {/* Formulários Recentes */}
              {recentForms && recentForms.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-foreground mb-4">Formulários Recentes</h4>
                  <div className="space-y-3">
                    {recentForms.slice(0, 5).map((formItem) => (
                      <div key={formItem.id} className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border">
                        <div className="flex-1">
                          <h5 className="font-medium text-foreground">{formItem.title}</h5>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(formItem.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            formItem.status === 'published' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {formItem.status === 'published' ? 'Publicado' : 'Rascunho'}
                          </span>
                          <Link to={`/form/${formItem.id}`}>
                            <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50 rounded-lg">
                              Ver
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                  {recentForms.length > 5 && (
                    <div className="text-center mt-4">
                      <Link to="/connect/forms">
                        <Button variant="outline" className="text-foreground border-border hover:bg-accent">
                          Ver todos os formulários
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {selectedCompany && (
            <div className="mt-6 text-right">
              <Link to="/connect/forms">
                <Button variant="outline" size="sm" className="rounded-lg text-foreground border-border hover:bg-accent">
                  Gerenciar Formulários
                </Button>
              </Link>
            </div>
          )}
      </SectionWrapper>

      <PageSettingsDialog
        open={isSettingsDialogOpen}
        onOpenChange={setIsSettingsDialogOpen}
        availableSections={pulseSections}
        currentVisibleSections={visibleSections}
        onSave={setAllVisibleSections}
        isSaving={isSavingConfig}
      />
    </div>
  );
};

export default PulsePage;