import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { PulseInformative, PulseInformativeFormData } from '@/types/pulseInformative';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { useNavigate, useParams } from 'react-router-dom';
import DatePicker from '@/components/DatePicker';
import { format } from 'date-fns';

// Importar ReactQuill e seus estilos dinamicamente
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // Importar os estilos do editor
// import { Textarea } from '@/components/ui/textarea'; // Removido, pois não será mais usado para short_summary

const formSchema = z.object({
  title: z.string().min(1, { message: 'O título do informativo é obrigatório.' }),
  short_summary: z.string().min(1, { message: 'O resumo do informativo é obrigatório.' }).max(2000, { message: 'O resumo deve ter no máximo 2000 caracteres (incluindo HTML).' }), // Aumentado o limite
  content: z.string().min(1, { message: 'O conteúdo do informativo é obrigatório.' }),
  publication_date: z.date().optional().nullable(),
});

const PulseInformativeFormPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const navigate = useNavigate();
  const { id: informativeId } = useParams<{ id: string }>();
  const isEditing = !!informativeId;

  const [editorLoaded, setEditorLoaded] = useState(false);

  useEffect(() => {
    setEditorLoaded(true);
  }, []);

  const { data: editingInformative, isLoading: isLoadingInformative, error: errorInformative } = useQuery<PulseInformative, Error>({
    queryKey: ['pulseInformative', informativeId],
    queryFn: async () => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { data, error } = await supabase
        .from('pulse_informatives')
        .select('*')
        .eq('id', informativeId)
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        // Handle case where no rows are found (PGRST116) or other errors
        if (error.code === 'PGRST116') {
          throw new Error("Informativo não encontrado ou você não tem permissão para editá-lo.");
        }
        throw error;
      }
      return data;
    },
    enabled: isEditing && !!user?.id,
    retry: false, // Do not retry on error, especially for 404/permission issues
  });

  const form = useForm<PulseInformativeFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      short_summary: '',
      content: '',
      publication_date: undefined,
    },
  });

  useEffect(() => {
    if (isEditing && editingInformative) {
      // Corrige o problema de fuso horário ao carregar a data do banco de dados.
      const publicationDateString = editingInformative.publication_date;
      const localPublicationDate = publicationDateString ? new Date(publicationDateString + 'T00:00:00') : undefined;

      form.reset({
        title: editingInformative.title,
        short_summary: editingInformative.short_summary || '',
        content: editingInformative.content,
        publication_date: localPublicationDate,
      });
    } else if (!isEditing) {
      form.reset({
        title: '',
        short_summary: '',
        content: '',
        publication_date: undefined,
      });
    }
  }, [isEditing, editingInformative, form]);

  const createInformativeMutation = useMutation({
    mutationFn: async (data: PulseInformativeFormData) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      console.log("Creating informative with data:", data); // Log para depuração
      const { data: newInformative, error } = await supabase
        .from('pulse_informatives')
        .insert({
          title: data.title,
          short_summary: data.short_summary,
          content: data.content,
          publication_date: data.publication_date ? format(data.publication_date, 'yyyy-MM-dd') : null,
          user_id: user.id
        })
        .select()
        .single();
      if (error) throw error;
      return newInformative;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulseInformatives'] });
      showSuccess('Informativo criado com sucesso!');
      navigate('/core/pulse-informatives');
    },
    onError: (error) => {
      console.error("Error creating informative:", error); // Log de erro
      showError(`Erro ao criar informativo: ${error.message}`);
    },
  });

  const updateInformativeMutation = useMutation({
    mutationFn: async (data: PulseInformativeFormData) => {
      if (!informativeId) throw new Error("ID do informativo está faltando.");
      if (!user?.id) throw new Error("Usuário não autenticado.");
      console.log("Updating informative with data:", data); // Log para depuração
      const { data: updatedInformative, error } = await supabase
        .from('pulse_informatives')
        .update({
          title: data.title,
          short_summary: data.short_summary,
          content: data.content,
          publication_date: data.publication_date ? format(data.publication_date, 'yyyy-MM-dd') : null,
        })
        .eq('id', informativeId)
        .eq('user_id', user.id) // Garantir que o usuário só edite seus próprios informativos
        .select()
        .single();
      if (error) throw error;
      return updatedInformative;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulseInformatives'] });
      showSuccess('Informativo atualizado com sucesso!');
      navigate('/core/pulse-informatives');
    },
    onError: (error) => {
      console.error("Error updating informative:", error); // Log de erro
      showError(`Erro ao atualizar informativo: ${error.message}`);
    },
  });

  const onSubmit = (data: PulseInformativeFormData) => {
    console.log("Form submitted with data:", data); // Log na submissão do formulário
    if (isEditing) {
      updateInformativeMutation.mutate(data);
    } else {
      createInformativeMutation.mutate(data);
    }
  };

  const isLoadingForm = createInformativeMutation.isPending || updateInformativeMutation.isPending || isLoadingInformative;

  if (isEditing && isLoadingInformative) {
    return <div className="text-center text-muted-foreground">Carregando informativo...</div>;
  }

  if (isEditing && errorInformative) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Card className="w-full max-w-md bg-card backdrop-blur-md rounded-2xl shadow-lg p-6 text-center border border-border">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-sollux-red">Erro ao Carregar Informativo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{errorInformative.message}</p>
            <Button onClick={() => navigate('/core/pulse-informatives')} className="mt-4 rounded-lg bg-sollux-red hover:bg-sollux-orange">
              Voltar para Informativos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <Card className="w-full max-w-4xl bg-card backdrop-blur-md rounded-2xl shadow-lg p-6 text-center border border-border">
        <CardHeader>
          <CardTitle className="text-3xl font-bold mb-4 text-foreground">
            {isEditing ? 'Editar Informativo PULSE' : 'Novo Informativo PULSE'}
          </CardTitle>
          <p className="text-lg text-muted-foreground">
            {isEditing ? 'Atualize os detalhes do informativo.' : 'Crie um novo informativo para seus usuários.'}
          </p>
        </CardHeader>
        <CardContent className="mt-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Título</FormLabel>
                    <FormControl>
                      <Input placeholder="Título do informativo" {...field} className="rounded-lg" />
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
                    <FormLabel className="text-foreground text-left">Data de Publicação (Opcional)</FormLabel>
                    <FormControl>
                      <DatePicker
                        date={field.value || undefined}
                        setDate={field.onChange}
                        placeholder="Selecione a data de publicação"
                        disabled={isLoadingForm}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="short_summary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Resumo do Informativo (Leitura Rápida)</FormLabel>
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
                        <div className="h-[150px] w-full bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                          Carregando editor de texto...
                        </div>
                      )}
                    </FormControl>
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
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate('/core/pulse-informatives')} disabled={isLoadingForm} className="rounded-lg">
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoadingForm} className="rounded-lg bg-sollux-red hover:bg-sollux-orange">
                  {isEditing ? 'Salvar Alterações' : 'Criar Informativo'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PulseInformativeFormPage;