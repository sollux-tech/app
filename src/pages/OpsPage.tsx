import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import FeatureCard from '@/components/FeatureCard';
import { Brain, Target, TrendingUp, ListChecks } from 'lucide-react'; // Importar ListChecks

const OpsPage: React.FC = () => {
  const navigate = useNavigate();

  const handleInsightClick = () => {
    navigate('/ops/insight');
  };

  const handleShiftClick = () => {
    navigate('/ops/shift'); // Rota para a nova ShiftPage
  };

  const handleFlowClick = () => {
    navigate('/ops/flow'); // Navega para a nova página FlowPage
  };

  // Nova função para navegar para a página de apontamentos
  const handleKpiApontamentosClick = () => {
    // Precisamos decidir como navegar aqui. Se houver um KPI selecionado, ir para ele.
    // Se não, talvez ir para uma página que lista os KPIs liberados e permite escolher.
    // Por enquanto, vamos assumir que a navegação será feita a partir de uma lista de KPIs liberados.
    // Se a intenção é ir para uma página que lista TODOS os KPIs liberados para o usuário,
    // a rota seria /ops/shift/kpi-smarts-liberated.
    // Se a intenção é ir para a página de apontamentos de UM KPI específico, a rota seria /ops/shift/kpi-apontamentos/:kpiLiberatedId
    // Vamos assumir que o usuário irá para a lista de KPIs Liberados primeiro.
    navigate('/ops/shift/kpi-smarts-liberated'); 
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <Card className="w-full max-w-4xl bg-card backdrop-blur-md rounded-2xl shadow-lg p-6 text-center border border-border">
        <CardHeader>
          <CardTitle className="text-4xl font-bold mb-4 text-foreground">SOLLUX OPS</CardTitle>
          <p className="text-xl text-muted-foreground">
            Gerencie operações e estratégias da sua plataforma.
          </p>
        </CardHeader>
        <CardContent className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              title="SOLLUX INSIGHT™"
              description="Avaliação do momento atual da sua empresa."
              icon={Brain}
              onClick={handleInsightClick}
            />
            <FeatureCard
              title="SOLLUX SHIFT™"
              description="Definição de metas e construção de um plano de ação."
              icon={Target}
              onClick={handleShiftClick}
            />
            <FeatureCard
              title="SOLLUX FLOW™"
              description="Acompanhamento contínuo da evolução dos indicadores."
              icon={TrendingUp}
              onClick={handleFlowClick}
            />
            {/* Novo Card para Apontamentos de KPIs */}
            <FeatureCard
              title="Apontamentos de KPIs"
              description="Registre e visualize os valores e notas dos seus KPIs Smart."
              icon={ListChecks} // Ícone apropriado para apontamentos/registros
              onClick={handleKpiApontamentosClick}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OpsPage;