import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SectionWrapperProps {
  id: string;
  title: string;
  description?: string;
  isVisible: boolean;
  onDismiss: (sectionId: string) => void;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  showDismissButton?: boolean; // Prop para controlar a visibilidade do botão X
}

const SectionWrapper: React.FC<SectionWrapperProps> = ({
  id,
  title,
  description,
  isVisible,
  onDismiss,
  children,
  className,
  headerClassName,
  contentClassName,
  showDismissButton = true, // Padrão para true
}) => {
  if (!isVisible) {
    return null;
  }

  return (
    <Card className={cn("bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl", className)}>
      <CardHeader className={cn("flex flex-row items-center justify-between", headerClassName)}>
        <div>
          <CardTitle className="text-foreground uppercase font-bold">{title}</CardTitle>
          {description && <CardDescription className="text-muted-foreground">{description}</CardDescription>}
        </div>
        {showDismissButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDismiss(id)}
            className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg"
            title="Remover seção"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className={cn("pt-6", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
};

export default SectionWrapper;