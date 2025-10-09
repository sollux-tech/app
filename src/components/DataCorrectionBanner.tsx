import React, { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from './SessionContextProvider';

const DataCorrectionBanner: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useSession();

  const handleClaimCompanies = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('claim-orphan-companies');

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      if (data.updatedCount > 0) {
        showSuccess(`${data.updatedCount} empresa(s) foram associadas à sua conta!`);
        // Invalidate queries to refetch data and update the UI
        await queryClient.invalidateQueries({ queryKey: ['ownedCompanies', user?.id] });
        await queryClient.invalidateQueries({ queryKey: ['companies', user?.id] });
        await queryClient.invalidateQueries({ queryKey: ['orphanCompaniesCheck'] });
      } else {
        showError('Nenhuma empresa precisava de correção. Se o problema persistir, entre em contato com o suporte.');
      }
    } catch (error: any) {
      showError(`Erro ao reivindicar empresas: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Alert variant="destructive" className="mb-6 bg-yellow-50 border-yellow-300 text-yellow-800">
      <AlertCircle className="h-4 w-4 !text-yellow-800" />
      <AlertTitle className="font-bold">Ação Necessária</AlertTitle>
      <AlertDescription className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          Detectamos empresas que podem pertencer a você, mas não estão associadas à sua conta.
          <br />
          Clique no botão para corrigir e visualizar suas empresas.
        </div>
        <Button
          onClick={handleClaimCompanies}
          disabled={isLoading}
          className="mt-2 md:mt-0 md:ml-4 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg"
        >
          {isLoading ? 'Corrigindo...' : 'Reivindicar Minhas Empresas'}
        </Button>
      </AlertDescription>
    </Alert>
  );
};

export default DataCorrectionBanner;