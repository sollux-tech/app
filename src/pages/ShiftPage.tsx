import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import FeatureCard from '@/components/FeatureCard';
import { Target, ListChecks, ShoppingBag, Edit } from 'lucide-react'; // Importar Edit

const ShiftPage: React.FC = () => {
  const navigate = useNavigate();

  const handleKpiSmartLiberatedClick = () => {
    navigate('/ops/shift/kpi-smarts-liberated');
  };

  const handleKpiSmartAcquiredClick = () => {
    navigate('/ops/shift/kpi-smarts-acquired'); // Nova rota para KPIs Smart Adquiridos
  };

  const handleAppointmentClick = () => {
    navigate('/ops/shift/appointment'); // Nova rota para a página de apontamento
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <Card className="w-full max-w-4xl bg-card backdrop-blur-md rounded-2xl shadow-lg p-6 text-center border border-border">
        <CardHeader>
          <CardTitle className="text-4xl font-bold mb-4 text-foreground">SOLLUX SHIFT™</CardTitle>
          <CardDescription className="text-xl text-muted-foreground">
            Definição de metas e construção de um plano de ação.
          </CardDescription>
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
              icon={ShoppingBag} // Ícone para KPIs Smart Adquiridos
              onClick={handleKpiSmartAcquiredClick}
            />
            <FeatureCard
              title="Apontamento de KPI Smart"
              description="Registre dados e acompanhe o progresso dos seus KPIs Smart."
              icon={Edit} // Ícone para apontamento
              onClick={handleAppointmentClick}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShiftPage;