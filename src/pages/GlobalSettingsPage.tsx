import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import FeatureCard from '@/components/FeatureCard';
import { LayoutDashboard, Settings, Briefcase, FileText, Laptop2 } from 'lucide-react';

const GlobalSettingsPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSidebarSettingsClick = () => {
    navigate('/core/sidebar-settings');
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <Card className="w-full max-w-4xl bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg p-6 text-center border border-sollux-card-border">
        <CardHeader>
          <CardTitle className="text-4xl font-bold mb-4 text-sollux-black">Configurações Globais</CardTitle>
          <p className="text-xl text-gray-600">
            Gerencie as configurações gerais da sua plataforma.
          </p>
        </CardHeader>
        <CardContent className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              title="Configurações da Barra Lateral"
              description="Ajuste as opções de exibição e comportamento da barra lateral."
              icon={LayoutDashboard}
              onClick={handleSidebarSettingsClick}
            />
            <FeatureCard
              title="Jobs - Área/Setor"
              description="Gerencie as áreas e setores para as vagas de emprego."
              icon={Briefcase}
              onClick={() => navigate('/core/global-settings/job-sectors')}
            />
            <FeatureCard
              title="Jobs - Tipo de Contrato"
              description="Gerencie os tipos de contrato (CLT, PJ, etc.)."
              icon={FileText}
              onClick={() => navigate('/core/global-settings/contract-types')}
            />
            <FeatureCard
              title="Jobs - Modelo de Trabalho"
              description="Gerencie os modelos de trabalho (Remoto, Híbrido, etc.)."
              icon={Laptop2}
              onClick={() => navigate('/core/global-settings/work-models')}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GlobalSettingsPage;