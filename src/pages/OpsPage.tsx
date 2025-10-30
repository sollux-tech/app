import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import FeatureCard from '@/components/FeatureCard';
import { Brain, Target, TrendingUp } from 'lucide-react'; // Removido ClipboardCheck

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
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OpsPage;