import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import { showSuccess, showError } from '@/utils/toast';
import { AlertCircle, CheckCircle, Wrench, ShieldQuestion } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Company } from '@/types/company';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const DataDoctorPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();

  const { data: allCompanies, isLoading, error, refetch } = useQuery<Company[], Error>({
    queryKey: ['allCompaniesAdminViewForDoctor'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-all-companies-admin');
      if (error) throw new Error(`Function error: ${error.message}`);
      if (data.error) throw new Error(`Function returned an error: ${data.error}`);
      return data;
    },
    enabled: !!user,
  });

  const claimMutation = useMutation({
    mutationFn: async (companyId: string) => {
      const { data, error } = await supabase.functions.invoke('reassign-company-owner', {
        body: { companyId },
      });
      if (error) throw new Error(`Function error: ${error.message}`);
      if (data.error) throw new Error(`Function returned an error: ${data.error}`);
      return data;
    },
    onSuccess: (data) => {
      showSuccess(`Empresa "${data.claimedCompany.name}" foi associada à sua conta!`);
      // Invalidate all relevant queries to update the UI everywhere
      queryClient.invalidateQueries({ queryKey: ['allCompaniesAdminViewForDoctor'] });
      queryClient.invalidateQueries({ queryKey: ['ownedCompanies', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['companies', user?.id] });
    },
    onError: (error: Error) => {
      showError(`Erro ao reivindicar empresa: ${error.message}`);
    },
  });

  const problemCompanies = allCompanies?.filter(c => c.user_id !== user?.id) || [];

  const renderStatus = () => {
    if (isLoading) {
      return <Skeleton className="h-20 w-full" />;
    }

    if (error) {
      return (
        <div className="flex items-center gap-4 text-destructive p-4 bg-destructive/10 rounded-lg">
          <AlertCircle className="h-8 w-8" />
          <div>
            <p className="font-semibold">Erro ao verificar os dados.</p>
            <p className="text-sm">{error.message}</p>
          </div>
        </div>
      );
    }

    if (problemCompanies.length === 0) {
      return (
        <div className="flex items-center gap-4 text-green-600 p-4 bg-green-50 rounded-lg">
          <CheckCircle className="h-8 w-8" />
          <div>
            <p className="font-semibold">Tudo certo!</p>
            <p className="text-sm">Todas as empresas no sistema parecem estar corretamente associadas.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center gap-4 text-yellow-800 mb-4">
          <ShieldQuestion className="h-8 w-8" />
          <div>
            <p className="font-semibold">Ação Necessária</p>
            <p className="text-sm">
              Encontramos {problemCompanies.length} empresa(s) que não estão associadas à sua conta. Se você as criou, pode reivindicá-las.
            </p>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-foreground">Nome da Empresa</TableHead>
              <TableHead className="text-foreground">ID do Proprietário Atual</TableHead>
              <TableHead className="text-right text-foreground">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {problemCompanies.map(company => (
              <TableRow key={company.id}>
                <TableCell className="font-medium text-foreground">{company.name}</TableCell>
                <TableCell className="font-mono text-xs">
                  {company.user_id ? company.user_id : <span className="text-destructive font-bold">NENHUM (Órfã)</span>}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    onClick={() => claimMutation.mutate(company.id)}
                    disabled={claimMutation.isPending}
                    className="bg-sollux-red hover:bg-sollux-orange text-white rounded-lg"
                  >
                    Reivindicar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Wrench className="h-8 w-8 text-sollux-red" />
            <div>
              <CardTitle className="text-foreground uppercase font-bold">Reparo de Dados</CardTitle>
              <CardDescription className="text-muted-foreground">
                Esta ferramenta permite que você reivindique a propriedade de empresas que não estão associadas à sua conta.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {renderStatus()}
        </CardContent>
      </Card>
    </div>
  );
};

export default DataDoctorPage;