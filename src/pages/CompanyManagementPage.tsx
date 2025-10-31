import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import { showSuccess, showError } from '@/utils/toast';
import CompanyCard from '@/components/CompanyCard';
import { Company } from '@/types/company';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/components/CompanyContext';
import { ManagementPageLayout } from '@/components/layout/ManagementPageLayout';
import { LoadingState } from '@/components/status/LoadingState';

const CompanyManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { companies, isLoadingCompanies, setSelectedCompany } = useCompany();
  const navigate = useNavigate();

  const deleteCompanyMutation = useMutation({
    mutationFn: async (companyId: string) => {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', companyId)
        .eq('user_id', user?.id);
      if (error) throw error;
    },
    onSuccess: () => {
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

  const handleAddClick = () => {
    navigate('/id/companies/new');
  };

  const handleEditClick = (company: Company) => {
    navigate(`/id/companies/${company.id}`);
  };

  if (isLoadingCompanies) {
    return <LoadingState message="Carregando suas empresas..." />;
  }

  const ownedCompanies = companies.filter(company => company.user_id === user?.id);

  return (
    <ManagementPageLayout
      title="Minhas Empresas"
      actions={(
        <Button onClick={handleAddClick} className="bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg">
          <Plus className="mr-2 h-4 w-4" /> Adicionar Empresa
        </Button>
      )}
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {ownedCompanies.length === 0 ? (
          <p className="col-span-full text-center text-muted-foreground">
            Nenhuma empresa encontrada. Adicione uma nova empresa para começar.
          </p>
        ) : (
          ownedCompanies.map((company) => (
            <CompanyCard
              key={company.id}
              company={company}
              onEdit={handleEditClick}
              onDelete={handleDeleteCompany}
            />
          ))
        )}
      </div>
    </ManagementPageLayout>
  );
};

export default CompanyManagementPage;