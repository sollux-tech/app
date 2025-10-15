import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calculator } from 'lucide-react';

const SolluxCalcPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
      <Card className="w-full max-w-2xl bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg p-6 text-center border border-sollux-card-border">
        <CardHeader>
          <Calculator className="h-16 w-16 text-sollux-red mx-auto mb-4" />
          <CardTitle className="text-4xl font-bold mb-2 text-sollux-black">SOLLUX CALC™</CardTitle>
          <CardDescription className="text-lg text-gray-600">
            Esta é a página para auxiliar gestores a calcularem o preço ideal de venda de seus produtos ou serviços.
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-4">
          <p className="text-gray-700">
            Em breve, você encontrará aqui ferramentas e funcionalidades para otimizar suas estratégias de precificação.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SolluxCalcPage;