import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Settings } from 'lucide-react';

const OpsSettingsPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center">
      <Card className="w-full max-w-4xl bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg p-6 text-center border border-sollux-card-border">
        <CardHeader>
          <div className="flex items-center justify-center gap-4 mb-4">
            <Settings className="h-10 w-10 text-sollux-red" />
            <CardTitle className="text-4xl font-bold text-sollux-black">Configurações do OPS</CardTitle>
          </div>
          <CardDescription className="text-xl text-gray-600">
            Gerencie os cadastros e configurações para o SOLLUX OPS.
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-8">
          <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
            <h3 className="font-bold text-lg mb-2">Em Desenvolvimento</h3>
            <p>Esta página será onde você poderá configurar e gerenciar os cadastros específicos para as funcionalidades do SOLLUX OPS.</p>
            <p className="mt-2 text-sm">Fique atento para as próximas atualizações!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OpsSettingsPage;