import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Settings, SlidersHorizontal, LayoutDashboard, Briefcase, ListChecks, ListTodo, Blocks, Scale, Target, Tag, ClipboardCheck, Award, Lightbulb, Ruler, Repeat, CheckCircle } from 'lucide-react'; 
import FeatureCard from '@/components/FeatureCard';
import { useNavigate } from 'react-router-dom';

const OpsSettingsPage: React.FC = () => {
  const navigate = useNavigate();

  const handlePillarTypesClick = () => {
    navigate('/core/global-settings/ops/pillar-types');
  };

  const handlePillarsClick = () => {
    navigate('/core/global-settings/ops/pillars');
  };

  const handlePillarBlocksClick = () => {
    navigate('/core/global-settings/ops/pillar-blocks');
  };

  const handleScoringScaleClick = () => {
    navigate('/core/global-settings/ops/scoring-scale');
  };

  const handleKpiManagementClick = () => {
    navigate('/core/global-settings/ops/kpis');
  };

  const handleTagManagementClick = () => {
    navigate('/core/global-settings/ops/tags');
  };

  const handleDiagnosticStatusClick = () => {
    navigate('/core/global-settings/ops/diagnostic-statuses'); // Nova rota para Status do Diagnóstico
  };

  const handleClassificationScaleClick = () => {
    navigate('/core/global-settings/ops/classification-scale'); // Nova rota para Régua de Classificação
  };

  const handleKpiSmartTypeClick = () => {
    navigate('/core/global-settings/ops/kpi-smart-types'); // Nova rota para Tipo KPI Smart
  };

  const handleKpiSmartUnitClick = () => {
    navigate('/core/global-settings/ops/kpi-smart-units'); // Nova rota para Unidade de Medida KPI Smart
  };

  const handleKpiSmartFrequencyClick = () => {
    navigate('/core/global-settings/ops/kpi-smart-frequencies'); // Nova rota para Frequência de Monitoramento
  };

  const handleKpiSmartStatusClick = () => {
    navigate('/core/global-settings/ops/kpi-smart-statuses'); // Nova rota para Status KPI Smart
  };

  const handleKpiSmartFocusClick = () => {
    navigate('/core/global-settings/ops/kpi-smart-focuses'); // Nova rota para Foco KPI Smart
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <Card className="w-full max-w-4xl bg-card backdrop-blur-md rounded-2xl shadow-lg p-6 text-center border border-border">
        <CardHeader>
          <div className="flex items-center justify-center gap-4 mb-4">
            <Settings className="h-10 w-10 text-sollux-red" />
            <CardTitle className="text-4xl font-bold text-foreground">Configurações do OPS</CardTitle>
          </div>
          <CardDescription className="text-xl text-muted-foreground">
            Gerencie os cadastros e configurações para o SOLLUX OPS.
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              title="Tipos de Pilares"
              description="Crie e gerencie os tipos de pilares para as suas operações."
              icon={ListChecks}
              onClick={handlePillarTypesClick}
            />
            <FeatureCard
              title="Pilares"
              description="Crie e gerencie os pilares do OPS, associando-os a tipos específicos."
              icon={ListTodo}
              onClick={handlePillarsClick}
            />
            <FeatureCard
              title="Blocos dos Pilares"
              description="Crie e gerencie os blocos que compõem cada pilar do OPS."
              icon={Blocks}
              onClick={handlePillarBlocksClick}
            />
            <FeatureCard
              title="Régua de Pontuação"
              description="Crie a padronização de respostas para avaliações."
              icon={Scale}
              onClick={handleScoringScaleClick}
            />
            <FeatureCard
              title="Perguntas para os KPIs de Diagnóstico"
              description="Cadastre e gerencie as perguntas para o questionário de diagnóstico."
              icon={Target} 
              onClick={handleKpiManagementClick}
            />
            <FeatureCard
              title="Tags"
              description="Cadastre e gerencie tags para identificação de perguntas."
              icon={Tag} 
              onClick={handleTagManagementClick}
            />
            <FeatureCard
              title="Status do Diagnósticos"
              description="Cadastre e gerencie os status para os diagnósticos."
              icon={ClipboardCheck} 
              onClick={handleDiagnosticStatusClick}
            />
            <FeatureCard
              title="Régua de Classificação"
              description="Defina níveis de classificação com base em percentuais para pilares/blocos."
              icon={Award} 
              onClick={handleClassificationScaleClick}
            />
            <FeatureCard
              title="Tipo KPI Smart"
              description="Cadastre e gerencie os tipos de KPI Smart (Ex: Específico, Mensurável)."
              icon={Lightbulb} 
              onClick={handleKpiSmartTypeClick}
            />
            <FeatureCard
              title="Unidades de Medida KPI Smart"
              description="Cadastre e gerencie as unidades de medida para os KPIs Smart (Ex: %, R$, #)."
              icon={Ruler} 
              onClick={handleKpiSmartUnitClick}
            />
            <FeatureCard
              title="Frequência de Monitoramento"
              description="Cadastre e gerencie as frequências de monitoramento para os KPIs Smart (Ex: Diário, Mensal)."
              icon={Repeat} 
              onClick={handleKpiSmartFrequencyClick}
            />
            <FeatureCard
              title="Status KPI Smart"
              description="Cadastre e gerencie os status para os KPIs Smart (Ex: Em Andamento, Concluído)."
              icon={CheckCircle} 
              onClick={handleKpiSmartStatusClick}
            />
            <FeatureCard
              title="Foco KPI Smart"
              description="Cadastre e gerencie os focos para os KPIs Smart (Ex: Crescimento, Eficiência)."
              icon={Target} 
              onClick={handleKpiSmartFocusClick}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OpsSettingsPage;