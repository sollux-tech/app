import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import FeatureCard from '@/components/FeatureCard';
import { Building2, Users, Settings, BarChart2 } from 'lucide-react';

const IdPage: React.FC = () => {
  const navigate = useNavigate();

  const handleManageCompaniesClick = () => {
    navigate('/id/companies');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] p-4">
      <Card className="w-full max-w-4xl bg-white rounded-2xl shadow-lg p-6 text-center">
        <CardHeader>
          <CardTitle className="text-4xl font-bold mb-4 text-[#212121]">SOLLUX ID</CardTitle>
          <p className="text-xl text-gray-600">
            Gerencie suas identidades e recursos aqui.
          </p>
        </CardHeader>
        <CardContent className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              title="Gerenciar Empresas"
              description="Crie, edite e exclua as empresas associadas à sua conta."
              icon={Building2}
              onClick={handleManageCompaniesClick}
            />
            <FeatureCard
              title="Gerenciar Usuários"
              description="Adicione e gerencie usuários dentro das suas empresas."
              icon={Users}
              onClick={() => alert('Funcionalidade de Gerenciar Usuários em breve!')}
            />
            <FeatureCard
              title="Configurações de ID"
              description="Ajuste as configurações de segurança e privacidade da sua identidade."
              icon={Settings}
              onClick={() => alert('Funcionalidade de Configurações de ID em breve!')}
            />
            <FeatureCard
              title="Relatórios de Acesso"
              description="Visualize logs e relatórios de acesso às suas empresas."
              icon={BarChart2}
              onClick={() => alert('Funcionalidade de Relatórios de Acesso em breve!')}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IdPage;