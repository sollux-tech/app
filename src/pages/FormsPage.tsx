import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Share2, Eye, Download, Copy, QrCode } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Form } from '@/types/form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { useCompany } from '@/components/CompanyContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom'; // Importar useNavigate

const formSchema = z.object({
  title: z.string().min(1, { message: 'O título do formulário é obrigatório.' }),
  description: z.string().optional(),
});

const FormsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { selectedCompany } = useCompany();
  const navigate = useNavigate(); // Inicializar useNavigate
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);
  const [currentForm, setCurrentForm] = useState<Form | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
    },
  });

  const { data: forms, isLoading, error } = useQuery<Form[], Error>({
    queryKey: ['forms', selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany) return [];
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('company_id', selectedCompany.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompany,
  });

  const deleteFormMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('forms').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms', selectedCompany?.id] });
      showSuccess('Formulário excluído com sucesso!');
    },
    onError: (error) => {
      showError(`Erro ao excluir formulário: ${error.message}`);
    },
  });

  const publishFormMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('forms')
        .update({ status: 'published' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms', selectedCompany?.id] });
      showSuccess('Formulário publicado com sucesso!');
    },
    onError: (error) => {
      showError(`Erro ao publicar formulário: ${error.message}`);
    },
  });

  const handleDeleteForm = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este formulário?')) {
      deleteFormMutation.mutate(id);
    }
  };

  const handlePublishForm = (form: Form) => {
    if (form.questions && form.questions.length === 0) {
      showError('Adicione pelo menos uma pergunta antes de publicar.');
      return;
    }
    publishFormMutation.mutate(form.id);
  };

  const handleCopyLink = async (formId: string) => {
    const url = `${window.location.origin}/form/${formId}`;
    try {
      await navigator.clipboard.writeText(url);
      showSuccess('Link copiado para a área de transferência!');
    } catch (error) {
      showError('Erro ao copiar link.');
    }
  };

  const handleGenerateQR = async (form: Form) => {
    setCurrentForm(form);
    // Simulação de geração de QR Code
    setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin)}/form/${form.id}`);
    setIsQRDialogOpen(true);
  };

  const handleExportCSV = async (formId: string) => {
    try {
      const { data, error } = await supabase
        .from('form_responses')
        .select('*')
        .eq('form_id', formId);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const headers = Object.keys(data[0]);
        const csvContent = [
          headers.join(','),
          ...data.map(row => 
            headers.map(header => {
              const value = row[header];
              // Escape quotes and wrap in quotes if contains comma or quote
              if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return value;
            }).join(',')
          )
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
          const url = URL.createObjectURL(blob);
          link.setAttribute('href', url);
          link.setAttribute('download', `respostas_${formId}.csv`);
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        showSuccess('CSV exportado com sucesso!');
      } else {
        showError('Nenhuma resposta encontrada para exportar.');
      }
    } catch (error) {
      showError(`Erro ao exportar CSV: ${error.message}`);
    }
  };

  if (isLoading) {
    return <div className="text-center text-muted-foreground">Carregando formulários...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-foreground uppercase font-bold">SOLLUX FORM™</CardTitle>
            <p className="text-muted-foreground">Crie formulários elegantes e colete respostas com clareza e precisão.</p>
          </div>
          <Button onClick={() => navigate('/connect/forms/new')} className="bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg">
            <Plus className="mr-2 h-4 w-4" /> Novo Formulário
          </Button>
        </CardHeader>
        <CardContent>
          {forms?.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Nenhum formulário criado</h3>
              <p className="text-muted-foreground mb-6">Crie seu primeiro formulário para começar a coletar respostas.</p>
              <Button onClick={() => navigate('/connect/forms/new')} className="bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg">
                <Plus className="mr-2 h-4 w-4" /> Criar Formulário
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-foreground">Título</TableHead>
                  <TableHead className="text-foreground">Status</TableHead>
                  <TableHead className="text-foreground">Criado em</TableHead>
                  <TableHead className="text-foreground">Respostas</TableHead>
                  <TableHead className="text-right text-foreground">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forms?.map((form) => (
                  <TableRow key={form.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-foreground">{form.title}</div>
                        {form.description && (
                          <div className="text-sm text-muted-foreground">{form.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={form.status === 'published' ? 'default' : 'secondary'}
                        className={form.status === 'published' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-800 border-gray-200'}
                      >
                        {form.status === 'published' ? 'Publicado' : 'Rascunho'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(form.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {form.response_count || 0}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-1">
                        {form.status === 'draft' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePublishForm(form)}
                            className="text-green-600 hover:bg-green-50 rounded-lg"
                          >
                            Publicar
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyLink(form.id)}
                          className="text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Copiar Link"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleGenerateQR(form)}
                          className="text-purple-600 hover:bg-purple-50 rounded-lg"
                          title="QR Code"
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/connect/forms/${form.id}/responses`)}
                          className="text-orange-600 hover:bg-orange-50 rounded-lg"
                          title="Ver Respostas"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`/form/${form.id}`, '_blank')}
                          className="text-foreground hover:bg-accent rounded-lg"
                          title="Visualizar"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/connect/forms/${form.id}/edit`)}
                          className="text-foreground hover:bg-accent rounded-lg"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteForm(form.id)}
                          className="rounded-lg bg-sollux-red hover:bg-red-700 text-white"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de QR Code */}
      
      <Dialog open={isQRDialogOpen} onOpenChange={setIsQRDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card backdrop-blur-md rounded-2xl shadow-lg border border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">QR Code do Formulário</DialogTitle>
          </DialogHeader>
          <div className="text-center">
            {currentForm && (
              <>
                <h3 className="font-semibold text-foreground mb-2">{currentForm.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">Escaneie o QR Code ou copie o link</p>
                {qrCodeUrl && (
                  <div className="flex justify-center mb-4">
                    <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48 border rounded-lg" />
                  </div>
                )}
                <div className="bg-muted p-3 rounded-lg mb-4">
                  <p className="text-sm font-mono text-foreground break-all">
                    {window.location.origin}/form/{currentForm.id}
                  </p>
                </div>
                <Button
                  onClick={() => handleCopyLink(currentForm.id)}
                  className="w-full rounded-lg bg-sollux-red hover:bg-sollux-orange"
                >
                  <Copy className="mr-2 h-4 w-4" /> Copiar Link
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FormsPage;