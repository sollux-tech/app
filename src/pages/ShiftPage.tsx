import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import FeatureCard from '@/components/FeatureCard';
import { ListChecks, ShoppingBag, PencilRuler } from 'lucide-react'; // PencilRuler para apontamentos

const ShiftPage: React.FC = () => {
  const navigate = useNavigate();

  const handleKpiSmartLiberatedClick = () => {
    navigate('/ops/shift/kpi-smarts-liberated');
  };

  const handleKpiSmartAcquiredClick = () => {
    navigate('/ops/shift/kpi-smarts-acquired');
  };

  const handleKpiApontamentoClick = () => {
    navigate('/ops/shift/kpi-apontamentos'); // Rota para a página de apontamentos
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <Card className="w-full max-w-4xl bg-card backdrop-blur-md rounded-2xl shadow-lg p-6 text-center border border-border">
        <CardHeader>
          <CardTitle className="text-4xl font-bold mb-4 text-foreground">SOLLUX SHIFT™</CardTitle>
          <p className="text-xl text-muted-foreground">
            Definição de metas e construção de um plano de ação.
          </p>
        </CardHeader>
        <CardContent className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              title="Gerenciar KPIs Smart Liberados"
              description="Selecione e gerencie os KPIs Smart que estarão disponíveis para uso."
              icon={ListChecks}
              onClick={handleKpiSmartLiberatedClick}
            />
            <FeatureCard
              title="KPIs Smart Adquiridos"
              description="Gerencie os KPIs Smart que sua empresa adquiriu."
              icon={ShoppingBag}
              onClick={handleKpiSmartAcquiredClick}
            />
            {/* Novo Card para Apontamento de KPIs */}
            <FeatureCard
              title="Apontamento de KPIs"
              description="Registre os dados e apontamentos para os KPIs designados a você."
              icon={PencilRuler}
              onClick={handleKpiApontamentoClick}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShiftPage;