import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Share2, QrCode } from 'lucide-react'; // Importar QrCode
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/components/CompanyContext';
import { showSuccess, showError } from '@/utils/toast';
import { Job } from '@/types/job';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import ShareJobDialog from '@/components/ShareJobDialog';
import ShareJobQrDialog from '@/components/ShareJobQrDialog'; // Importar o novo componente
import { Badge } from '@/components/ui/badge';

const JobsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [jobToShare, setJobToShare] = useState<{ id: string; title: string } | null>(null);
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false); // Novo estado para o diálogo de QR Code
  const [jobToQr, setJobToQr] = useState<{ id: string; title: string } | null>(null); // Novo estado para a vaga do QR Code

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

  const handleShareClick = (job: Job) => {
    if (job.status !== 'active') {
      showError('Apenas vagas ativas podem ser compartilhadas publicamente.');
      return;
    }
    setJobToShare({ id: job.id, title: job.title });
    setIsShareDialogOpen(true);
  };

  const handleGenerateQrClick = (job: Job) => { // Nova função para gerar QR Code
    if (job.status !== 'active') {
      showError('Apenas vagas ativas podem ter QR Code gerado publicamente.');
      return;
    }
    setJobToQr({ id: job.id, title: job.title });
    setIsQrDialogOpen(true);
  };

  const isMutating = deleteJobMutation.isPending;

  return (
    <div className="space-y-6">
      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-foreground uppercase font-bold">Gerenciar Vagas</CardTitle>
            <CardDescription className="text-muted-foreground">
              {selectedCompany ? `Vagas para: ${selectedCompany.name}` : 'Selecione uma empresa para ver as vagas.'}
            </CardDescription>
          </div>
          <Button onClick={handleAddClick} disabled={!selectedCompany} className="bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg">
            <Plus className="mr-2 h-4 w-4" /> Adicionar Vaga
          </Button>
        </CardHeader>
        <CardContent>
          {!selectedCompany ? (
            <p className="text-center text-muted-foreground py-8">Por favor, selecione uma empresa na barra lateral para gerenciar as vagas.</p>
          ) : isLoading ? (
            <p className="text-muted-foreground">Carregando vagas...</p>
          ) : error ? (
            <p className="text-destructive">Erro ao carregar vagas: {error.message}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-foreground">Título</TableHead>
                  <TableHead className="text-foreground">Status</TableHead>
                  <TableHead className="text-foreground">Criado em</TableHead>
                  <TableHead className="text-right text-foreground">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Nenhuma vaga encontrada para esta empresa.
                    </TableCell>
                  </TableRow>
                ) : (
                  jobs?.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium text-foreground">{job.title}</TableCell>
                      <TableCell>
                        <Badge
                          variant={job.status === 'active' ? 'default' : 'secondary'}
                          className={job.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-800 border-gray-200'}
                        >
                          {job.status === 'active' ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{format(new Date(job.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</TableCell>
                      <TableCell className="text-right flex justify-end items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleGenerateQrClick(job)} className="text-purple-600 hover:bg-purple-50 rounded-lg" disabled={isMutating} title="Gerar QR Code">
                          <QrCode className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleShareClick(job)} className="text-blue-600 hover:bg-blue-50 rounded-lg" disabled={isMutating} title="Compartilhar Vaga">
                          <Share2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEditClick(job.id)} className="rounded-lg text-foreground hover:bg-accent" disabled={isMutating} title="Editar Vaga">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(job.id)} className="rounded-lg bg-sollux-red hover:bg-red-700 text-white" disabled={isMutating} title="Excluir Vaga">
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

      {jobToShare && (
        <ShareJobDialog
          open={isShareDialogOpen}
          onOpenChange={setIsShareDialogOpen}
          jobId={jobToShare.id}
          jobTitle={jobToShare.title}
        />
      )}

      {jobToQr && (
        <ShareJobQrDialog
          open={isQrDialogOpen}
          onOpenChange={setIsQrDialogOpen}
          jobId={jobToQr.id}
          jobTitle={jobToQr.title}
        />
      )}
    </div>
  );
};

export default JobsPage;