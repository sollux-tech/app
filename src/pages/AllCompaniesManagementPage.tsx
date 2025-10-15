import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Company } from '@/types/company';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSession } from '@/components/SessionContextProvider';
import { AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const AllCompaniesManagementPage: React.FC = () => {
  const { user } = useSession();

  const { data: allCompanies, isLoading, error } = useQuery<Company[], Error>({
    queryKey: ['allCompaniesAdminView'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-all-companies-admin');
      if (error) throw new Error(`Function error: ${error.message}`);
      if (data.error) throw new Error(`Function returned an error: ${data.error}`);
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="text-foreground uppercase font-bold">Diagnóstico de Empresas</CardTitle>
          <CardDescription className="text-muted-foreground">
            Esta tabela mostra todas as empresas no banco de dados, ignorando as regras de segurança, para fins de diagnóstico.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 mb-6 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
            <p className="font-bold">Seu ID de Usuário atual é:</p>
            <code className="text-sm bg-blue-100 p-1 rounded break-all">{user?.id || 'Não foi possível obter o ID'}</code>
            <p className="mt-2 text-sm">Compare este ID com a coluna "ID do Proprietário" abaixo. As empresas que você espera ver devem ter este mesmo ID. Linhas em verde pertencem a você.</p>
          </div>

          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          )}
          {error && <p className="text-destructive">Erro ao carregar dados: {error.message}</p>}

          {!isLoading && !error && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-foreground">Nome da Empresa</TableHead>
                  <TableHead className="text-foreground">ID do Proprietário (user_id)</TableHead>
                  <TableHead className="text-foreground">Data de Criação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allCompanies?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Nenhuma empresa encontrada no banco de dados.
                    </TableCell>
                  </TableRow>
                ) : (
                  allCompanies?.map((company) => (
                    <TableRow key={company.id} className={company.user_id === user?.id ? 'bg-green-100' : ''}>
                      <TableCell className="font-medium text-foreground">{company.name}</TableCell>
                      <TableCell className="font-mono text-xs break-all">
                        {company.user_id ? company.user_id : (
                          <span className="text-destructive font-bold flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" /> NENHUM (Órfã)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(company.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AllCompaniesManagementPage;