import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import FeatureCard from '@/components/FeatureCard';
import { LayoutDashboard, Settings } from 'lucide-react'; // Importar ícones relevantes

const GlobalSettingsPage: React.FC = () => {
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
              icon={LayoutDashboard} // Ícone representativo para layout/sidebar
              onClick={() => alert('Configurações da Barra Lateral em breve!')}
            />
            {/* Adicione mais FeatureCards para outras configurações globais aqui */}
            <FeatureCard
              title="Outras Configurações"
              description="Gerencie outras configurações importantes da plataforma."
              icon={Settings}
              onClick={() => alert('Outras Configurações em breve!')}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GlobalSettingsPage;