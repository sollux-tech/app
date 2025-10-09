import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Company } from '@/types/company';
import { Profile } from '@/types/profile';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EnrichedCompany extends Company {
  userName: string;
}

const AllCompaniesManagementPage: React.FC = () => {
  const { data: companies, isLoading: isLoadingCompanies, error: errorCompanies } = useQuery<Company[], Error>({
    queryKey: ['allCompanies'],
    queryFn: async () => {
      const { data, error } = await supabase.from('companies').select('*').order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles, isLoading: isLoadingProfiles, error: errorProfiles } = useQuery<Profile[], Error>({
    queryKey: ['allProfiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, first_name, last_name');
      if (error) throw error;
      return data;
    },
  });

  const enrichedCompanies = useMemo((): EnrichedCompany[] => {
    if (!companies || !profiles) return [];
    const profileMap = new Map(profiles.map(p => [p.id, `${p.first_name || ''} ${p.last_name || ''}`.trim()]));
    return companies.map(company => ({
      ...company,
      userName: profileMap.get(company.user_id) || 'Usuário desconhecido',
    }));
  }, [companies, profiles]);

  const isLoading = isLoadingCompanies || isLoadingProfiles;
  const error = errorCompanies || errorProfiles;

  if (isLoading) {
    return <div className="text-center text-gray-600">Carregando empresas...</div>;
  }

  if (error) {
    return <div className="text-center text-red-600">Erro ao carregar empresas: {error.message}</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="text-sollux-black uppercase font-bold">Todas as Empresas Cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-sollux-black">Nome da Empresa</TableHead>
                <TableHead className="text-sollux-black">Usuário Responsável</TableHead>
                <TableHead className="text-sollux-black">Data de Criação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrichedCompanies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-gray-500">
                    Nenhuma empresa encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                enrichedCompanies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium text-sollux-black">{company.name}</TableCell>
                    <TableCell className="text-gray-700">{company.userName}</TableCell>
                    <TableCell className="text-gray-700">
                      {format(new Date(company.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AllCompaniesManagementPage;