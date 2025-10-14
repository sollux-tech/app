import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import FeatureCard from '@/components/FeatureCard';
import { Briefcase, Settings } from 'lucide-react';

const ConnectPage: React.FC = () => {
  const navigate = useNavigate();

  const handleManageJobsClick = () => {
    navigate('/connect/jobs');
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <Card className="w-full max-w-4xl bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg p-6 text-center border border-sollux-card-border">
        <CardHeader>
          <CardTitle className="text-4xl font-bold mb-4 text-sollux-black">SOLLUX CONNECT</CardTitle>
          <p className="text-xl text-gray-600">
            Conecte sua empresa ao mundo e gerencie suas oportunidades.
          </p>
        </CardHeader>
        <CardContent className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              title="Gerenciar Vagas (Jobs)"
              description="Crie, edite e gerencie as vagas de emprego da sua empresa."
              icon={Briefcase}
              onClick={handleManageJobsClick}
            />
            <FeatureCard
              title="Configurações do Connect"
              description="Ajuste as configurações de integração e visibilidade."
              icon={Settings}
              onClick={() => alert('Funcionalidade de Configurações do Connect em breve!')}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConnectPage;