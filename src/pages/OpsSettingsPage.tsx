import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Settings, SlidersHorizontal, LayoutDashboard, Briefcase, ListChecks } from 'lucide-react'; // Importar ListChecks
import FeatureCard from '@/components/FeatureCard';
import { useNavigate } from 'react-router-dom';

const OpsSettingsPage: React.FC = () => {
  const navigate = useNavigate();

  const handlePillarTypesClick = () => {
    navigate('/core/global-settings/ops/pillar-types');
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <Card className="w-full max-w-4xl bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg p-6 text-center border border-sollux-card-border">
        <CardHeader>
          <div className="flex items-center justify-center gap-4 mb-4">
            <Settings className="h-10 w-10 text-sollux-red" />
            <CardTitle className="text-4xl font-bold text-sollux-black">Configurações do OPS</CardTitle>
          </div>
          <CardDescription className="text-xl text-gray-600">
            Gerencie os cadastros e configurações para o SOLLUX OPS.
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              title="Tipos de Pilares"
              description="Crie e gerencie os tipos de pilares para as suas operações."
              icon={ListChecks} // Ícone para Tipos de Pilares
              onClick={handlePillarTypesClick}
            />
            {/* Outros FeatureCards para configurações do OPS podem ser adicionados aqui */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OpsSettingsPage;