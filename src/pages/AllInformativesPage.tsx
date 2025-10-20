import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PulseInformative } from '@/types/pulseInformative';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

const AllInformativesPage: React.FC = () => {
  const { data: informatives, isLoading, error } = useQuery<PulseInformative[], Error>({
    queryKey: ['allPulseInformatives'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pulse_informatives')
        .select('*')
        .order('publication_date', { ascending: false }); // Ordenar por data de publicação mais recente
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="text-center text-muted-foreground">Carregando informativos...</div>;
  }

  if (error) {
    return <div className="text-center text-destructive">Erro ao carregar informativos: {error.message}</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="text-foreground uppercase font-bold">Todos os Informativos PULSE</CardTitle>
          <CardDescription className="text-muted-foreground">
            Explore todos os informativos publicados pela SOLLUX.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {informatives?.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Nenhum informativo encontrado</h3>
              <p className="text-muted-foreground">Não há informativos publicados no momento.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-foreground">Título</TableHead>
                  <TableHead className="text-foreground">Resumo</TableHead>
                  <TableHead className="text-foreground">Publicado em</TableHead>
                  <TableHead className="text-right text-foreground">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {informatives?.map((informative) => (
                  <TableRow key={informative.id}>
                    <TableCell className="font-medium text-foreground">{informative.title}</TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate" dangerouslySetInnerHTML={{ __html: informative.short_summary || 'N/A' }} />
                    <TableCell className="text-muted-foreground">
                      {informative.publication_date ? format(new Date(informative.publication_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link to={`/informative/${informative.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Eye className="h-4 w-4 mr-2" /> Ler
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AllInformativesPage;