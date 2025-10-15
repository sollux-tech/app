import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import FeatureCard from '@/components/FeatureCard';
import { Briefcase, FileText, Calculator } from 'lucide-react'; // Importar Calculator

const ConnectPage: React.FC = () => {
  const navigate = useNavigate();

  const handleManageJobsClick = () => {
    navigate('/connect/jobs');
  };

  const handleFormsClick = () => {
    navigate('/connect/forms');
  };

  const handleSolluxCalcClick = () => {
    navigate('/connect/calc'); // Navega para a nova página SolluxCalcPage
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <Card className="w-full max-w-4xl bg-card backdrop-blur-md rounded-2xl shadow-lg p-6 text-center border border-border">
        <CardHeader>
          <CardTitle className="text-4xl font-bold mb-4 text-foreground">SOLLUX CONNECT</CardTitle>
          <p className="text-xl text-muted-foreground">
            Conecte sua empresa ao mundo e gerencie suas oportunidades.
          </p>
        </CardHeader>
        <CardContent className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"> {/* Ajustado para 3 colunas */}
            <FeatureCard
              title="SOLLUX JOBS™"
              description="Crie, edite e gerencie as vagas de emprego da sua empresa."
              icon={Briefcase}
              onClick={handleManageJobsClick}
            />
            <FeatureCard
              title="SOLLUX FORM™"
              description="Crie formulários elegantes e colete respostas com clareza e precisão."
              icon={FileText}
              onClick={handleFormsClick}
            />
            <FeatureCard
              title="SOLLUX CALC™"
              description="Auxilia gestores a calcularem o preço ideal de venda de seus produtos ou serviços."
              icon={Calculator} // Usando o ícone Calculator
              onClick={handleSolluxCalcClick}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConnectPage;