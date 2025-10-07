import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import { Button } from '@/components/ui/button';
import { PlusCircle, ArrowLeft } from 'lucide-react';
import CompanyCard from '@/components/CompanyCard';
import CompanyFormDialog from '@/components/CompanyFormDialog';
import { Company } from '@/types/company';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { showError, showSuccess } from '@/utils/toast';

const CompanyManagementPage: React.FC = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: companies, isLoading: isCompaniesLoading, error } = useQuery<Company[], Error>({
    queryKey: ['companies', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !isSessionLoading,
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: async (companyId: string) => {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      showSuccess('Empresa excluída com sucesso!');
    },
    onError: (error) => {
      showError(`Erro ao excluir empresa: ${error.message}`);
    },
  });

  const handleEditClick = (company: Company) => {
    setSelectedCompany(company);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (companyId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta empresa?')) {
      deleteCompanyMutation.mutate(companyId);
    }
  };

  const handleNewCompanyClick = () => {
    setSelectedCompany(null);
    setIsDialogOpen(true);
  };

  if (isSessionLoading || isCompaniesLoading) {
    return (
      <div className="flex flex-col items-center justify-center">
        <Card className="w-full max-w-2xl bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg p-6 text-center border border-sollux-card-border">
          <CardHeader>
            <CardTitle className="text-4xl font-bold mb-4 text-sollux-black">Minhas Empresas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl bg-gray-200" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg border border-sollux-card-border">
        <h2 className="text-2xl font-bold text-red-600">Erro ao carregar empresas</h2>
        <p className="text-gray-700">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <Card className="w-full max-w-4xl bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg p-6 text-center border border-sollux-card-border">
        <CardHeader className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-6 top-6 text-sollux-black hover:bg-gray-100 rounded-lg"
            onClick={() => navigate('/id')}
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <CardTitle className="text-4xl font-bold mb-4 text-sollux-black">Minhas Empresas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center mb-6">
            <Button onClick={handleNewCompanyClick} className="bg-sollux-red hover:bg-sollux-orange text-white rounded-lg">
              <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Nova Empresa
            </Button>
          </div>

          {companies && companies.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
              {companies.map((company) => (
                <CompanyCard
                  key={company.id}
                  company={company}
                  onEdit={handleEditClick}
                  onDelete={handleDeleteClick}
                />
              ))}
            </div>
          ) : (
            <p className="text-gray-600 mt-4">Nenhuma empresa encontrada. Adicione uma para começar!</p>
          )}
        </CardContent>
      </Card>

      <CompanyFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        company={selectedCompany}
      />
    </div>
  );
};

export default CompanyManagementPage;