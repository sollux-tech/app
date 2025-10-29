import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  className?: string;
  iconClassName?: string; // Nova prop para estilizar o ícone
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon: Icon, onClick, className, iconClassName }) => {
  return (
    <Card
      className={cn(
        "cursor-pointer hover:shadow-lg transition-shadow duration-200 flex flex-col items-center justify-center p-6 text-center",
        "bg-card backdrop-blur-md rounded-2xl shadow-md border border-border",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-4 flex flex-col items-center"> {/* Adicionado flex flex-col items-center aqui */}
        <Icon className={cn("h-12 w-12 text-sollux-red mb-2", iconClassName)} />
        <CardTitle className="text-xl font-bold text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
};

export default FeatureCard;