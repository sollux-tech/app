import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/components/CompanyContext';
import { showSuccess, showError } from '@/utils/toast';
import { Job } from '@/types/job';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const JobsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();

  const { data: jobs, isLoading, error } = useQuery<Job[], Error>({
    queryKey: ['jobs', selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany) return [];
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('company_id', selectedCompany.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompany,
  });

  const deleteJobMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('jobs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs', selectedCompany?.id] });
      showSuccess('Vaga excluída com sucesso!');
    },
    onError: (err: Error) => {
      showError(`Erro: ${err.message}`);
    },
  });

  const handleAddClick = () => {
    navigate('/connect/jobs/new');
  };

  const handleEditClick = (jobId: string) => {
    navigate(`/connect/jobs/${jobId}`);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta vaga?')) {
      deleteJobMutation.mutate(id);
    }
  };

  const isMutating = deleteJobMutation.isPending;

  return (
    <div className="space-y-6">
      <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sollux-black uppercase font-bold">Gerenciar Vagas</CardTitle>
            <CardDescription>
              {selectedCompany ? `Vagas para: ${selectedCompany.name}` : 'Selecione uma empresa para ver as vagas.'}
            </CardDescription>
          </div>
          <Button onClick={handleAddClick} disabled={!selectedCompany} className="bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg">
            <Plus className="mr-2 h-4 w-4" /> Adicionar Vaga
          </Button>
        </CardHeader>
        <CardContent>
          {!selectedCompany ? (
            <p className="text-center text-gray-500 py-8">Por favor, selecione uma empresa na barra lateral para gerenciar as vagas.</p>
          ) : isLoading ? (
            <p>Carregando vagas...</p>
          ) : error ? (
            <p className="text-red-500">Erro ao carregar vagas: {error.message}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-sollux-black">Título</TableHead>
                  <TableHead className="text-sollux-black">Criado em</TableHead>
                  <TableHead className="text-right text-sollux-black">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-500">
                      Nenhuma vaga encontrada para esta empresa.
                    </TableCell>
                  </TableRow>
                ) : (
                  jobs?.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium text-sollux-black">{job.title}</TableCell>
                      <TableCell className="text-gray-700">{format(new Date(job.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleEditClick(job.id)} className="mr-2 rounded-lg" disabled={isMutating}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(job.id)} className="rounded-lg" disabled={isMutating}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
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

export default JobsPage;