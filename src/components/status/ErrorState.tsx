import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message,
  onRetry,
  retryLabel = 'Tentar novamente',
}) => {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
      <span className="text-muted-foreground">
        {message ?? 'Não foi possível carregar os dados no momento.'}
      </span>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} type="button">
          {retryLabel}
        </Button>
      )}
    </div>
  );
};

export default ErrorState;
