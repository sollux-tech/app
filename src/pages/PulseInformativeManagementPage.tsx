import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Eye, Share2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { PulseInformative } from '@/types/pulseInformative';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import ShareInformativeDialog from '@/components/ShareInformativeDialog'; // Importar o novo componente

const PulseInformativeManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const navigate = useNavigate();

  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [informativeToShare, setInformativeToShare] = useState<{ id: string; title: string } | null>(null);

  const { data: informatives, isLoading, error } = useQuery<PulseInformative[], Error>({
    queryKey: ['pulseInformatives', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('pulse_informatives')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const deleteInformativeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pulse_informatives')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id); // Garantir que o usuário só delete seus próprios informativos
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulseInformatives'] });
      showSuccess('Informativo excluído com sucesso!');
    },
    onError: (error) => {
      showError(`Erro ao excluir informativo: ${error.message}`);
    },
  });

  const handleAddClick = () => {
    navigate('/core/pulse-informatives/new');
  };

  const handleEditClick = (informativeId: string) => {
    navigate(`/core/pulse-informatives/${informativeId}`);
  };

  const handleViewClick = (informativeId: string) => {
    window.open(`/informative/${informativeId}`, '_blank');
  };

  const handleShareClick = (informative: PulseInformative) => {
    setInformativeToShare({ id: informative.id, title: informative.title });
    setIsShareDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este informativo?')) {
      deleteInformativeMutation.mutate(id);
    }
  };

  const isMutating = deleteInformativeMutation.isPending;

  if (isLoading) {
    return <div className="text-center text-muted-foreground">Carregando informativos...</div>;
  }

  if (error) {
    return <div className="text-center text-destructive">Erro ao carregar informativos: {error.message}</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground uppercase font-bold">Gerenciar Informativos PULSE</CardTitle>
          <Button onClick={handleAddClick} className="bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg">
            <Plus className="mr-2 h-4 w-4" /> Adicionar Informativo
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-foreground">Título</TableHead>
                <TableHead className="text-foreground">Publicado em</TableHead>
                <TableHead className="text-foreground">Criado em</TableHead>
                <TableHead className="text-right text-foreground">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {informatives?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhum informativo encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                informatives?.map((informative) => (
                  <TableRow key={informative.id}>
                    <TableCell className="font-medium text-foreground">{informative.title}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {informative.publication_date ? format(new Date(informative.publication_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(informative.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right flex justify-end items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewClick(informative.id)}
                        className="text-blue-600 hover:bg-blue-50 rounded-lg"
                        disabled={isMutating}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleShareClick(informative)}
                        className="text-green-600 hover:bg-green-50 rounded-lg"
                        disabled={isMutating}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(informative.id)}
                        className="text-foreground hover:bg-accent rounded-lg"
                        disabled={isMutating}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick(informative.id)}
                        className="bg-sollux-red hover:bg-red-700 text-white rounded-lg"
                        disabled={isMutating}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {informativeToShare && (
        <ShareInformativeDialog
          open={isShareDialogOpen}
          onOpenChange={setIsShareDialogOpen}
          informativeId={informativeToShare.id}
          informativeTitle={informativeToShare.title}
        />
      )}
    </div>
  );
};

export default PulseInformativeManagementPage;