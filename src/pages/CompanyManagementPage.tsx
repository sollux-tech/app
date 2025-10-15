import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import { showSuccess, showError } from '@/utils/toast';
import CompanyCard from '@/components/CompanyCard';
import { Company } from '@/types/company';
import { useNavigate } from 'react-router-dom'; // Importar useNavigate
import { useCompany } from '@/components/CompanyContext';

const CompanyManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { companies, isLoadingCompanies, setSelectedCompany } = useCompany();
  const navigate = useNavigate(); // Inicializar useNavigate

  const deleteCompanyMutation = useMutation({
    mutationFn: async (companyId: string) => {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', companyId)
        .eq('user_id', user?.id); // Garante que o usuário só delete suas próprias empresas
      if (error) throw error;
    },
    onSuccess: () => {
      // Invalida a query principal no contexto para que toda a UI seja atualizada
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
    navigate('/id/companies/new'); // Navega para a página de criação
  };

  const handleEditClick = (company: Company) => {
    navigate(`/id/companies/${company.id}`); // Navega para a página de edição
  };

  if (isLoadingCompanies) {
    return <div className="text-center text-gray-600">Carregando suas empresas...</div>;
  }

  // Filtra a lista de empresas do contexto para mostrar apenas as que o usuário é proprietário
  const ownedCompanies = companies.filter(company => company.user_id === user?.id);

  return (
    <div className="space-y-6">
      <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sollux-black uppercase font-bold">Minhas Empresas</CardTitle>
          <Button onClick={handleAddClick} className="bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg">
            <Plus className="mr-2 h-4 w-4" /> Adicionar Empresa
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ownedCompanies.length === 0 ? (
              <p className="text-gray-500 col-span-full text-center">Nenhuma empresa encontrada. Adicione uma nova empresa para começar.</p>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanyManagementPage;