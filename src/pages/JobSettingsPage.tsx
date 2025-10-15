import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import FeatureCard from '@/components/FeatureCard';
import { Briefcase, FileText, Laptop2 } from 'lucide-react';

const JobSettingsPage: React.FC = () => {
  const navigate = useNavigate();

  const handleJobSectorsClick = () => {
    navigate('/core/global-settings/job-sectors');
  };

  const handleContractTypesClick = () => {
    navigate('/core/global-settings/contract-types');
  };

  const handleWorkModelsClick = () => {
    navigate('/core/global-settings/work-models');
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <Card className="w-full max-w-4xl bg-card backdrop-blur-md rounded-2xl shadow-lg p-6 text-center border border-border">
        <CardHeader>
          <CardTitle className="text-4xl font-bold mb-4 text-foreground">Configurações de Vagas</CardTitle>
          <p className="text-xl text-muted-foreground">
            Gerencie as configurações relacionadas às vagas de emprego.
          </p>
        </CardHeader>
        <CardContent className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              title="Áreas/Setores"
              description="Crie e gerencie as áreas e setores para as vagas de emprego."
              icon={Briefcase}
              onClick={handleJobSectorsClick}
            />
            <FeatureCard
              title="Tipos de Contrato"
              description="Gerencie os tipos de contrato (CLT, PJ, etc.)."
              icon={FileText}
              onClick={handleContractTypesClick}
            />
            <FeatureCard
              title="Modelos de Trabalho"
              description="Gerencie os modelos de trabalho (Remoto, Híbrido, etc.)."
              icon={Laptop2}
              onClick={handleWorkModelsClick}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JobSettingsPage;