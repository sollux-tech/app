import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import FeatureCard from '@/components/FeatureCard';
import { Building2, Users, Settings, BarChart2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

const IdPage: React.FC = () => {
  const navigate = useNavigate();

  const handleManageCompaniesClick = () => {
    navigate('/id/companies');
  };

  const handleManageUsersClick = () => {
    navigate('/id/users'); // Nova rota para gerenciamento de usuários
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <Card className="w-full max-w-4xl bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg p-6 text-center border border-sollux-card-border">
        <CardHeader>
          <CardTitle className="text-4xl font-bold mb-4 text-sollux-black">SOLLUX ID</CardTitle>
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
              onClick={handleManageUsersClick}
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