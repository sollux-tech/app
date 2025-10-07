import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import CompanyCard from '@/components/CompanyCard';
import CompanyFormDialog from '@/components/CompanyFormDialog';
import { Company } from '@/types/company';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const CompaniesPage: React.FC = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

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

  const handleCardClick = (company: Company) => {
    setSelectedCompany(company);
    setIsDialogOpen(true);
  };

  const handleNewCompanyClick = () => {
    setSelectedCompany(null);
    setIsDialogOpen(true);
  };

  if (isSessionLoading || isCompaniesLoading) {
    return (
      <div className="p-6 bg-white rounded-2xl shadow-lg min-h-[calc(100vh-64px)] flex flex-col items-center justify-center">
        <Card className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-6 text-center">
          <CardHeader>
            <CardTitle className="text-4xl font-bold mb-4 text-[#212121]">Minhas Empresas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white rounded-2xl shadow-lg">
        <h2 className="text-2xl font-bold text-red-600">Erro ao carregar empresas</h2>
        <p className="text-gray-700">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-2xl shadow-lg min-h-[calc(100vh-64px)] flex flex-col items-center">
      <Card className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-6 text-center">
        <CardHeader>
          <CardTitle className="text-4xl font-bold mb-4 text-[#212121]">Minhas Empresas</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={handleNewCompanyClick} className="mb-6 bg-sollux-red hover:bg-sollux-orange text-white">
            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Nova Empresa
          </Button>

          {companies && companies.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
              {companies.map((company) => (
                <CompanyCard key={company.id} company={company} onClick={handleCardClick} />
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

export default CompaniesPage;