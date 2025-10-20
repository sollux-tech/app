import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, FileText, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Document, DocumentFormData } from '@/types/document';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DatePicker from '@/components/DatePicker';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Profile } from '@/types/profile';

const formSchema = z.object({
  title: z.string().min(1, { message: 'O título é obrigatório.' }),
  version: z.string().min(1, { message: 'A versão é obrigatória.' }),
  content: z.string().min(1, { message: 'O conteúdo é obrigatório.' }),
  publication_date: z.date({ required_error: 'A data de publicação é obrigatória.' }),
  target_user_id: z.string().optional().nullable(), // 'all' or specific user ID
});

const DocumentManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [isViewContentDialogOpen, setIsViewContentDialogOpen] = useState(false);
  const [documentToViewContent, setDocumentToViewContent] = useState<Document | null>(null);

  const form = useForm<DocumentFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      version: '',
      content: '',
      publication_date: undefined,
      target_user_id: 'all',
    },
  });

  const [editorLoaded, setEditorLoaded] = useState(false);
  useEffect(() => { setEditorLoaded(true); }, []);

  useEffect(() => {
    if (editingDocument) {
      const publicationDate = editingDocument.publication_date ? new Date(editingDocument.publication_date + 'T00:00:00') : undefined;
      form.reset({
        title: editingDocument.title,
        version: editingDocument.version,
        content: editingDocument.content,
        publication_date: publicationDate,
        target_user_id: editingDocument.target_user_id || 'all',
      });
    } else {
      form.reset({
        title: '',
        version: '',
        content: '',
        publication_date: undefined,
        target_user_id: 'all',
      });
    }
  }, [editingDocument, form, isDialogOpen]);

  const { data: documents, isLoading: isLoadingDocuments, error: errorDocuments } = useQuery<Document[], Error>({
    queryKey: ['documents', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('documents')
        .select('*, profiles(first_name, last_name)') // Fetch creator and target user profiles
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: allUsers, isLoading: isLoadingUsers } = useQuery<Profile[], Error>({
    queryKey: ['allUsersForDocuments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, first_name, last_name');
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const userOptions = useMemo(() => {
    const options = allUsers?.map(u => ({
      value: u.id,
      label: `${u.first_name || ''} ${u.last_name || ''}`.trim() || `Usuário ${u.id.substring(0, 8)}`
    })) || [];
    return [{ value: 'all', label: 'Todos os Usuários' }, ...options];
  }, [allUsers]);

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', user?.id] });
      setIsDialogOpen(false);
      setEditingDocument(null);
    },
    onError: (error: Error) => {
      showError(`Erro: ${error.message}`);
    },
  };

  const createDocumentMutation = useMutation({
    mutationFn: async (data: DocumentFormData) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { data: newDocument, error } = await supabase
        .from('documents')
        .insert({
          title: data.title,
          version: data.version,
          content: data.content,
          publication_date: data.publication_date ? format(data.publication_date, 'yyyy-MM-dd') : null,
          target_user_id: data.target_user_id === 'all' ? null : data.target_user_id,
          creator_user_id: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return newDocument;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Documento criado com sucesso!');
    },
  });

  const updateDocumentMutation = useMutation({
    mutationFn: async (data: DocumentFormData) => {
      if (!editingDocument?.id) throw new Error("ID do documento está faltando.");
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { data: updatedDocument, error } = await supabase
        .from('documents')
        .update({
          title: data.title,
          version: data.version,
          content: data.content,
          publication_date: data.publication_date ? format(data.publication_date, 'yyyy-MM-dd') : null,
          target_user_id: data.target_user_id === 'all' ? null : data.target_user_id,
        })
        .eq('id', editingDocument.id)
        .eq('creator_user_id', user.id)
        .select()
        .single();
      if (error) throw error;
      return updatedDocument;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Documento atualizado com sucesso!');
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { error, count } = await supabase
        .from('documents')
        .delete()
        .eq('id', id)
        .eq('creator_user_id', user.id);
      
      if (error) {
        throw error;
      }
      if (count === 0) {
        throw new Error("Documento não encontrado ou você não tem permissão para excluí-lo.");
      }
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Documento excluído com sucesso!');
    },
  });

  const onSubmit = (data: DocumentFormData) => {
    if (editingDocument) {
      updateDocumentMutation.mutate(data);
    } else {
      createDocumentMutation.mutate(data);
    }
  };

  const handleAddClick = () => {
    setEditingDocument(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (document: Document) => {
    setEditingDocument(document);
    setIsDialogOpen(true);
  };

  const handleViewContentClick = (document: Document) => {
    setDocumentToViewContent(document);
    setIsViewContentDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este documento?')) {
      deleteDocumentMutation.mutate(id);
    }
  };

  const isMutating = createDocumentMutation.isPending || updateDocumentMutation.isPending || deleteDocumentMutation.isPending;
  const isLoadingPage = isLoadingDocuments || isLoadingUsers;

  if (isLoadingPage) {
    return <div className="text-center text-muted-foreground">Carregando documentos...</div>;
  }

  if (errorDocuments) {
    return <div className="text-center text-destructive">Erro ao carregar documentos: {errorDocuments.message}</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground uppercase font-bold">Gerenciar Documentos</CardTitle>
          <Button onClick={handleAddClick} className="bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg">
            <Plus className="mr-2 h-4 w-4" /> Adicionar Documento
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-foreground">Título</TableHead>
                <TableHead className="text-foreground">Versão</TableHead>
                <TableHead className="text-foreground">Publicado em</TableHead>
                <TableHead className="text-foreground">Para</TableHead>
                <TableHead className="text-right text-foreground">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum documento encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                documents?.map((doc) => {
                  const targetUser = (doc as any).profiles;
                  const targetUserName = targetUser ? `${targetUser.first_name || ''} ${targetUser.last_name || ''}`.trim() : 'Todos os Usuários';
                  return (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium text-foreground">{doc.title}</TableCell>
                      <TableCell className="text-muted-foreground">{doc.version}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(doc.publication_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {doc.target_user_id === user?.id ? 'Você' : targetUserName}
                      </TableCell>
                      <TableCell className="text-right flex justify-end items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewContentClick(doc)}
                          className="text-blue-600 hover:bg-blue-50 rounded-lg"
                          disabled={isMutating}
                          title="Visualizar Conteúdo"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(doc)}
                          className="mr-2 text-foreground hover:bg-accent rounded-lg"
                          disabled={isMutating}
                          title="Editar Documento"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteClick(doc.id)}
                          className="bg-sollux-red hover:bg-red-700 text-white rounded-lg"
                          disabled={isMutating}
                          title="Excluir Documento"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl bg-card backdrop-blur-md rounded-2xl shadow-lg border border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editingDocument ? 'Editar Documento' : 'Adicionar Novo Documento'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Título</FormLabel>
                    <FormControl>
                      <Input placeholder="Título do documento" {...field} className="rounded-lg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="version"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Versão do Documento</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 1.0.0" {...field} className="rounded-lg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="publication_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-foreground text-left">Data de Publicação</FormLabel>
                    <FormControl>
                      <DatePicker
                        date={field.value}
                        setDate={field.onChange}
                        placeholder="Selecione a data de publicação"
                        disabled={isMutating}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="target_user_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Visibilidade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || 'all'} disabled={isLoadingUsers || isMutating}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Selecione o público-alvo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {userOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Conteúdo</FormLabel>
                    <FormControl>
                      {editorLoaded ? (
                        <ReactQuill
                          theme="snow"
                          value={field.value}
                          onChange={field.onChange}
                          className="bg-card rounded-lg"
                          modules={{
                            toolbar: [
                              [{ 'header': [1, 2, false] }],
                              ['bold', 'italic', 'underline', 'strike', 'link'],
                              [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                              [{ 'indent': '-1'}, { 'indent': '+1' }],
                              ['image', 'code-block'],
                              [{ 'color': [] }, { 'background': [] }],
                              ['clean']
                            ],
                          }}
                        />
                      ) : (
                        <div className="h-[200px] w-full bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                          Carregando editor de texto...
                        </div>
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isMutating} className="rounded-lg">
                  Cancelar
                </Button>
                <Button type="submit" disabled={isMutating} className="rounded-lg bg-sollux-red hover:bg-sollux-orange">
                  {editingDocument ? 'Salvar Alterações' : 'Adicionar Documento'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog para Visualizar Conteúdo do Documento */}
      <Dialog open={isViewContentDialogOpen} onOpenChange={setIsViewContentDialogOpen}>
        <DialogContent className="sm:max-w-3xl bg-card backdrop-blur-md rounded-2xl shadow-lg border border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Visualizar Documento: {documentToViewContent?.title}</DialogTitle>
          </DialogHeader>
          {documentToViewContent && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm bg-muted p-3 rounded-lg">
                <div>
                  <p className="font-medium text-muted-foreground">Versão:</p>
                  <p className="text-foreground">{documentToViewContent.version}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Publicado em:</p>
                  <p className="text-foreground">
                    {format(new Date(documentToViewContent.publication_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
              </div>
              <div className="prose max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: documentToViewContent.content }} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewContentDialogOpen(false)} className="rounded-lg">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentManagementPage;