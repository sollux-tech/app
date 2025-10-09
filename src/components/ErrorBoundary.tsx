import React from 'react';
import { Button } from './ui/button';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    // Atualiza o estado para que a próxima renderização mostre a UI de fallback.
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Você também pode logar o erro para um serviço de relatórios de erro
    console.error("ErrorBoundary capturou um erro:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Você pode renderizar qualquer UI de fallback personalizada
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-sollux-light-gray text-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-sollux-card-border">
            <h1 className="text-2xl font-bold text-sollux-red mb-4">Oops! Algo deu errado.</h1>
            <p className="text-gray-700 mb-6">
              Ocorreu um erro inesperado na aplicação. Por favor, tente recarregar a página.
            </p>
            <Button onClick={() => window.location.reload()} className="rounded-lg bg-sollux-red hover:bg-sollux-orange">
              Recarregar Página
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;