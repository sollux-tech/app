import React from 'react';
import { useParams, Link } from 'react-router-dom';
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

  const { data: informative, isLoading, error } = useQuery<PulseInformative, Error>({
    queryKey: ['publicInformative', informativeId],
    queryFn: async () => {
      if (!informativeId) throw new Error("ID do informativo está faltando.");
      const { data, error } = await supabase
        .from('pulse_informatives')
        .select('*')
        .eq('id', informativeId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!informativeId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sollux-light-gray">
        <p className="text-gray-600">Carregando informativo...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sollux-light-gray">
        <Card className="w-full max-w-md bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg p-6 text-center border border-sollux-card-border">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-sollux-red">Erro</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">Não foi possível carregar o informativo: {error.message}</p>
            <Link to="/" className="mt-4 inline-flex items-center text-sollux-red hover:underline">
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para o início
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!informative) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sollux-light-gray">
        <Card className="w-full max-w-md bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg p-6 text-center border border-sollux-card-border">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-sollux-black">Informativo não encontrado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">O informativo que você está procurando não existe ou foi removido.</p>
            <Link to="/" className="mt-4 inline-flex items-center text-sollux-red hover:underline">
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para o início
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sollux-light-gray py-12 px-4 sm:px-6 lg:px-8 flex justify-center">
      <Card className="w-full max-w-3xl bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg border border-sollux-card-border p-8">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-4xl font-bold text-sollux-black mb-2">{informative.title}</CardTitle>
          <CardDescription className="text-gray-600">
            Publicado em: {informative.publication_date ? format(new Date(informative.publication_date), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}
          </CardDescription>
        </CardHeader>
        <CardContent className="prose prose-lg max-w-none text-sollux-black">
          <div dangerouslySetInnerHTML={{ __html: informative.content }} />
        </CardContent>
        <div className="mt-8 text-center">
          <Link to="/core/pulse-informatives" className="inline-flex items-center text-sollux-red hover:underline">
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para Gerenciamento
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default PublicInformativePage;