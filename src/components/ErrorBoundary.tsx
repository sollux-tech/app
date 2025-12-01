import React from 'react';
import { Button } from './ui/button';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    // Atualiza o estado para que a próxima renderização mostre a UI de fallback.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Loga o erro para um serviço de relatórios de erro
    console.error("ErrorBoundary capturou um erro:", error, errorInfo);
    console.error("Stack trace:", error.stack);
    console.error("Component stack:", errorInfo.componentStack);
  }

  handleReload = () => {
    // Limpa o estado de erro antes de recarregar
    this.setState({ hasError: false, error: null });
    // Pequeno delay para garantir que o estado foi limpo
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  render() {
    if (this.state.hasError) {
      // Você pode renderizar qualquer UI de fallback personalizada
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center p-4">
          <div className="bg-card p-8 rounded-2xl shadow-lg border border-border max-w-md">
            <h1 className="text-2xl font-bold text-sollux-red mb-4">Oops! Algo deu errado.</h1>
            <p className="text-muted-foreground mb-4">
              Ocorreu um erro inesperado na aplicação.
            </p>
            {this.state.error && (
              <details className="text-left mb-4 text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Detalhes do erro
                </summary>
                <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-40">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            <Button onClick={this.handleReload} className="rounded-lg bg-sollux-red hover:bg-sollux-orange">
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