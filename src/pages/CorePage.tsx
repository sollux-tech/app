import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import FeatureCard from '@/components/FeatureCard';
import { Settings, UserCog, Newspaper, Bell, Building2, Wrench, Store, FileText } from 'lucide-react'; // Importar FileText para Documentos

const CorePage: React.FC = () => {
  const navigate = useNavigate();

  const handleManageUserTypesClick = () => {
    navigate('/core/user-types');
  };

  const handleManagePulseInformativesClick = () => {
    navigate('/core/pulse-informatives');
  };

  const handleGlobalSettingsClick = () => {
    navigate('/core/global-settings');
  };

  const handleManageNotificationsClick = () => {
    navigate('/core/notifications');
  };

  const handleManageAllCompaniesClick = () => {
    navigate('/core/all-companies');
  };

  const handleDataDoctorClick = () => {
    navigate('/core/data-doctor');
  };

  const handleMarketManagementClick = () => {
    navigate('/core/markets');
  };

  const handleDocumentManagementClick = () => {
    navigate('/core/documents'); // Nova rota para gerenciamento de documentos
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <Card className="w-full max-w-4xl bg-card backdrop-blur-md rounded-2xl shadow-lg p-6 text-center border border-border">
        <CardHeader>
          <CardTitle className="text-4xl font-bold mb-4 text-foreground">SOLLUX CORE</CardTitle>
          <p className="text-xl text-muted-foreground">
            Gerencie os elementos centrais da sua plataforma.
          </p>
        </CardHeader>
        <CardContent className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              title="Diagnóstico de Empresas"
              description="Visualize todas as empresas na plataforma para fins de diagnóstico (visão de admin)."
              icon={Building2}
              onClick={handleManageAllCompaniesClick}
            />
            <FeatureCard
              title="Tipos de Usuário"
              description="Crie e gerencie os diferentes tipos de usuários da plataforma."
              icon={UserCog}
              onClick={handleManageUserTypesClick}
            />
            <FeatureCard
              title="Informativos PULSE"
              description="Cadastre e gerencie os informativos para os usuários do PULSE."
              icon={Newspaper}
              onClick={handleManagePulseInformativesClick}
            />
            <FeatureCard
              title="Notificações"
              description="Crie e envie notificações e alertas para os usuários da plataforma."
              icon={Bell}
              onClick={handleManageNotificationsClick}
            />
            <FeatureCard
              title="Diagnóstico de Dados"
              description="Verifique e corrija problemas de associação de dados da sua conta."
              icon={Wrench}
              onClick={handleDataDoctorClick}
            />
            <FeatureCard
              title="Configurações Globais"
              description="Ajuste as configurações gerais da plataforma."
              icon={Settings}
              onClick={handleGlobalSettingsClick}
            />
            <FeatureCard
              title="Gerenciar Mercados"
              description="Cadastre e gerencie os mercados de atuação das empresas."
              icon={Store}
              onClick={handleMarketManagementClick}
            />
            <FeatureCard
              title="Documentos"
              description="Cadastre e gerencie documentos para usuários específicos ou todos."
              icon={FileText}
              onClick={handleDocumentManagementClick}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CorePage;