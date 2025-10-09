import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import FeatureCard from '@/components/FeatureCard';
import { Users, Settings, ShieldCheck, Briefcase, UserCog } from 'lucide-react';

const CorePage: React.FC = () => {
  const navigate = useNavigate();

  const handleManageUserTypesClick = () => {
    navigate('/core/user-types');
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <Card className="w-full max-w-4xl bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg p-6 text-center border border-sollux-card-border">
        <CardHeader>
          <CardTitle className="text-4xl font-bold mb-4 text-sollux-black">SOLLUX CORE</CardTitle>
          <p className="text-xl text-gray-600">
            Gerencie os elementos centrais da sua plataforma.
          </p>
        </CardHeader>
        <CardContent className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              title="Tipos de Usuário"
              description="Crie e gerencie os diferentes tipos de usuários da plataforma."
              icon={UserCog}
              onClick={handleManageUserTypesClick}
            />

            {/* Outros FeatureCards de exemplo para o CORE */}
            <FeatureCard
              title="Gerenciar Permissões"
              description="Defina e ajuste as permissões de acesso para cada tipo de usuário."
              icon={ShieldCheck}
              onClick={() => alert('Gerenciar Permissões em breve!')}
            />
            <FeatureCard
              title="Estrutura Organizacional"
              description="Mapeie a hierarquia e os departamentos da sua empresa."
              icon={Briefcase}
              onClick={() => alert('Estrutura Organizacional em breve!')}
            />
            <FeatureCard
              title="Configurações Globais"
              description="Ajuste as configurações gerais da plataforma."
              icon={Settings}
              onClick={() => alert('Configurações Globais em breve!')}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CorePage;