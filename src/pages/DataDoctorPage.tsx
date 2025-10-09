import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import { showSuccess, showError } from '@/utils/toast';
import { AlertCircle, CheckCircle, Wrench } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const DataDoctorPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();

  const { data: orphanData, isLoading, error, refetch } = useQuery<{ orphanCount: number }, Error>({
    queryKey: ['orphanCompaniesCheck'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('check-orphan-companies');
      if (error) throw new Error(`Function error: ${error.message}`);
      if (data.error) throw new Error(`Function returned an error: ${data.error}`);
      return data;
    },
  });

  const claimMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('claim-orphan-companies');
      if (error) throw new Error(`Function error: ${error.message}`);
      if (data.error) throw new Error(`Function returned an error: ${data.error}`);
      return data;
    },
    onSuccess: (data) => {
      showSuccess(`${data.updatedCount} empresa(s) foram associadas à sua conta!`);
      // Invalidate queries to refetch data across the app
      queryClient.invalidateQueries({ queryKey: ['ownedCompanies', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['companies', user?.id] });
      refetch(); // Refetch the orphan count
    },
    onError: (error: Error) => {
      showError(`Erro ao reivindicar empresas: ${error.message}`);
    },
  });

  const renderStatus = () => {
    if (isLoading) {
      return (
        <div className="space-y-2">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-10 w-1/2" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center gap-4 text-red-600">
          <AlertCircle className="h-8 w-8" />
          <div>
            <p className="font-semibold">Erro ao verificar os dados.</p>
            <p className="text-sm">{error.message}</p>
          </div>
        </div>
      );
    }

    if (orphanData?.orphanCount === 0) {
      return (
        <div className="flex items-center gap-4 text-green-600">
          <CheckCircle className="h-8 w-8" />
          <div>
            <p className="font-semibold">Tudo certo!</p>
            <p className="text-sm">Nenhum problema de associação de dados foi encontrado.</p>
          </div>
        </div>
      );
    }

    if (orphanData && orphanData.orphanCount > 0) {
      return (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-yellow-800">
          <div className="flex items-center gap-4">
            <AlertCircle className="h-8 w-8" />
            <div>
              <p className="font-semibold">Ação Necessária</p>
              <p className="text-sm">
                Encontramos {orphanData.orphanCount} empresa(s) sem um proprietário associado.
              </p>
            </div>
          </div>
          <Button
            onClick={() => claimMutation.mutate()}
            disabled={claimMutation.isPending}
            className="bg-sollux-red hover:bg-sollux-orange text-white rounded-lg"
          >
            {claimMutation.isPending ? 'Corrigindo...' : 'Reivindicar Minhas Empresas'}
          </Button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Wrench className="h-8 w-8 text-sollux-red" />
            <div>
              <CardTitle className="text-sollux-black uppercase font-bold">Diagnóstico de Dados</CardTitle>
              <CardDescription>
                Esta ferramenta verifica e corrige problemas de associação de dados na sua conta.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="p-6 bg-gray-50 rounded-lg border">
            {renderStatus()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataDoctorPage;