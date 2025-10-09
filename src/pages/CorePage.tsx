import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import FeatureCard from '@/components/FeatureCard';
import { Users, Settings, ShieldCheck, Briefcase, UserCog } from 'lucide-react';

const userTypes = [
  'Admin Sollux',
  'Admin',
  'Consultor',
  'Colaborador',
  'Gerente',
  'Diretor',
  'CEO',
  'Conselheiro',
];

const CorePage: React.FC = () => {
  const navigate = useNavigate();

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
            <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl p-6 flex flex-col items-center text-center">
              <CardHeader className="pb-4">
                <UserCog className="h-12 w-12 text-sollux-red mb-2" />
                <CardTitle className="text-xl font-bold text-sollux-black">Tipos de Usuário</CardTitle>
              </CardHeader>
              <CardContent className="w-full">
                <ul className="space-y-2 text-gray-700 text-left">
                  {userTypes.map((type, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-sollux-orange" />
                      {type}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

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