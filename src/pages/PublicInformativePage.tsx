import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom'; // Importar useNavigate
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PulseInformative } from '@/types/pulseInformative';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PublicInformativePage: React.FC = () => {
  const { id: informativeId } = useParams<{ id: string }>();
  const navigate = useNavigate(); // Inicializar useNavigate

  const { data: informative, isLoading, error } = useQuery<PulseInformative, Error>({
    queryKey: ['publicInformative', informativeId],
    queryFn: async () => {
      if (!informativeId) throw new Error("ID do informativo está faltando.");
      const { data, error } = await supabase
        .from('pulse_informatives')
        .select('*')
        .eq('id', informativeId)
        .single();
      if (error) {
        // Handle case where no rows are found (PGRST116)
        if (error.code === 'PGRST116') {
          throw new Error("Informativo não encontrado.");
        }
        throw error;
      }
      return data;
    },
    enabled: !!informativeId,
    retry: false, // Do not retry on error, especially for 404
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando informativo...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md bg-card backdrop-blur-md rounded-2xl shadow-lg p-6 text-center border border-border">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-sollux-red">Erro</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Não foi possível carregar o informativo: {error.message}</p>
            <Button onClick={() => navigate('/')} className="mt-4 inline-flex items-center rounded-lg bg-sollux-red hover:bg-sollux-orange">
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para o início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!informative) {
    // This case should ideally be caught by the error handler above if single() fails
    // but as a fallback, if data is null and no error, show not found.
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md bg-card backdrop-blur-md rounded-2xl shadow-lg p-6 text-center border border-border">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-foreground">Informativo não encontrado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">O informativo que você está procurando não existe ou foi removido.</p>
            <Button onClick={() => navigate('/')} className="mt-4 inline-flex items-center rounded-lg bg-sollux-red hover:bg-sollux-orange">
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para o início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8 flex justify-center">
      <Card className="w-full max-w-3xl bg-card backdrop-blur-md rounded-2xl shadow-lg border border-border p-8">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-4xl font-bold text-foreground mb-2">{informative.title}</CardTitle>
          <CardDescription className="text-muted-foreground">
            Publicado em: {informative.publication_date ? format(new Date(informative.publication_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}
          </CardDescription>
        </CardHeader>
        <CardContent className="prose prose-lg max-w-none text-foreground">
          {informative.short_summary && (
            <div className="mb-6 p-4 bg-muted rounded-lg border border-border">
              <h3 className="text-xl font-semibold text-foreground mb-2">Resumo</h3>
              <p className="text-muted-foreground">{informative.short_summary}</p>
            </div>
          )}
          <div dangerouslySetInnerHTML={{ __html: informative.content }} />
        </CardContent>
        <div className="mt-8 text-center">
          <Button onClick={() => navigate('/core/pulse-informatives')} className="inline-flex items-center rounded-lg bg-sollux-red hover:bg-sollux-orange">
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para Gerenciamento
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default PublicInformativePage;