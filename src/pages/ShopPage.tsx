import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShoppingBag } from 'lucide-react';

const ShopPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
      <Card className="w-full max-w-2xl bg-card backdrop-blur-md rounded-2xl shadow-lg p-6 text-center border border-border">
        <CardHeader>
          <ShoppingBag className="h-16 w-16 text-sollux-red mx-auto mb-4" />
          <CardTitle className="text-4xl font-bold mb-2 text-foreground">SOLLUX SHOP™</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Em breve, um espaço para você explorar e adquirir soluções exclusivas da SOLLUX.
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-8">
          <p className="text-muted-foreground">
            Estamos trabalhando para trazer as melhores ferramentas e recursos para impulsionar o seu negócio.
            Fique atento para novidades!
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShopPage;