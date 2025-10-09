import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import { showSuccess, showError } from '@/utils/toast';
import CompanyCard from '@/components/CompanyCard';
import { Company } from '@/types/company';
import CompanyFormDialog from '@/components/CompanyFormDialog';
import { useCompany } from '@/components/CompanyContext';

const CompanyManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { setSelectedCompany } = useCompany(); // Apenas para limpar a seleção ao excluir

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);

  // Query dedicada para buscar APENAS as empresas que o usuário criou
  const { data: ownedCompanies, isLoading: isLoadingCompanies } = useQuery<Company[], Error>({
    queryKey: ['ownedCompanies', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: async (companyId: string) => {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', companyId);
      if (error) throw error;
    },
    onSuccess: (_, companyId) => {
      // Invalida ambas as queries para atualizar a lista de gerenciamento e o seletor global
      queryClient.invalidateQueries({ queryKey: ['ownedCompanies', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['companies', user?.id] });
      setSelectedCompany(null);
      showSuccess('Empresa excluída com sucesso!');
    },
    onError: (error: Error) => {
      showError(`Erro ao excluir empresa: ${error.message}`);
    },
  });

  const handleDeleteCompany = (companyId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta empresa?')) {
      return;
    }
    deleteCompanyMutation.mutate(companyId);
  };

  const openAddDialog = () => {
    setCurrentCompany(null);
    setIsFormOpen(true);
  };

  const openEditDialog = (company: Company) => {
    setCurrentCompany(company);
    setIsFormOpen(true);
  };

  if (isLoadingCompanies) {
    return <div className="text-center text-gray-600">Carregando suas empresas...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sollux-black uppercase font-bold">Minhas Empresas</CardTitle>
          <Button onClick={openAddDialog} className="bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg">
            <Plus className="mr-2 h-4 w-4" /> Adicionar Empresa
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ownedCompanies?.length === 0 ? (
              <p className="text-gray-500 col-span-full text-center">Nenhuma empresa encontrada. Adicione uma nova empresa para começar.</p>
            ) : (
              ownedCompanies?.map((company) => (
                <CompanyCard
                  key={company.id}
                  company={company}
                  onEdit={openEditDialog}
                  onDelete={handleDeleteCompany}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <CompanyFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        company={currentCompany}
      />
    </div>
  );
};

export default CompanyManagementPage;