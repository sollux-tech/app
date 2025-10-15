import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import FeatureCard from '@/components/FeatureCard';
import { Building2, Users, Share2 } from 'lucide-react';

const IdPage: React.FC = () => {
  const navigate = useNavigate();

  const handleManageCompaniesClick = () => {
    navigate('/id/companies');
  };

  const handleManageUsersClick = () => {
    navigate('/id/users');
  };

  const handleShareCompanyClick = () => {
    navigate('/id/sharing');
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <Card className="w-full max-w-4xl bg-card backdrop-blur-md rounded-2xl shadow-lg p-6 text-center border border-border">
        <CardHeader>
          <CardTitle className="text-4xl font-bold mb-4 text-foreground">SOLLUX ID</CardTitle>
          <p className="text-xl text-muted-foreground">
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
              title="Gerenciar Perfil"
              description="Adicione e gerencie usuários dentro das suas empresas."
              icon={Users}
              onClick={handleManageUsersClick}
            />
            <FeatureCard
              title="Compartilhar Empresa"
              description="Convide outros usuários para acessar e colaborar em suas empresas."
              icon={Share2}
              onClick={handleShareCompanyClick}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IdPage;