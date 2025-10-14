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

const formSchema = z.object({
  title: z.string().min(1, { message: 'O título do informativo é obrigatório.' }),
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
        content: editingInformative.content,
        publication_date: localPublicationDate,
      });
    } else if (!isEditing) {
      form.reset({
        title: '',
        content: '',
        publication_date: undefined,
      });
    }
  }, [isEditing, editingInformative, form]);

  const createInformativeMutation = useMutation({
    mutationFn: async (data: PulseInformativeFormData) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { data: newInformative, error } = await supabase
        .from('pulse_informatives')
        .insert({
          title: data.title,
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
      showError(`Erro ao criar informativo: ${error.message}`);
    },
  });

  const updateInformativeMutation = useMutation({
    mutationFn: async (data: PulseInformativeFormData) => {
      if (!informativeId) throw new Error("ID do informativo está faltando.");
      const { data: updatedInformative, error } = await supabase
        .from('pulse_informatives')
        .update({
          title: data.title,
          content: data.content,
          publication_date: data.publication_date ? format(data.publication_date, 'yyyy-MM-dd') : null,
        })
        .eq('id', informativeId)
        .eq('user_id', user?.id) // Garantir que o usuário só edite seus próprios informativos
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
      showError(`Erro ao atualizar informativo: ${error.message}`);
    },
  });

  const onSubmit = (data: PulseInformativeFormData) => {
    if (isEditing) {
      updateInformativeMutation.mutate(data);
    } else {
      createInformativeMutation.mutate(data);
    }
  };

  const isLoadingForm = createInformativeMutation.isPending || updateInformativeMutation.isPending || isLoadingInformative;

  if (isEditing && isLoadingInformative) {
    return <div className="text-center text-gray-600">Carregando informativo...</div>;
  }

  if (isEditing && errorInformative) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Card className="w-full max-w-md bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg p-6 text-center border border-sollux-card-border">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-sollux-red">Erro ao Carregar Informativo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{errorInformative.message}</p>
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
      <Card className="w-full max-w-4xl bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg p-6 text-center border border-sollux-card-border">
        <CardHeader>
          <CardTitle className="text-3xl font-bold mb-4 text-sollux-black">
            {isEditing ? 'Editar Informativo PULSE' : 'Novo Informativo PULSE'}
          </CardTitle>
          <p className="text-lg text-gray-600">
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
                    <FormLabel className="text-sollux-black">Título</FormLabel>
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
                    <FormLabel className="text-sollux-black text-left">Data de Publicação (Opcional)</FormLabel>
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
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sollux-black">Conteúdo</FormLabel>
                    <FormControl>
                      {editorLoaded ? (
                        <ReactQuill
                          theme="snow"
                          value={field.value}
                          onChange={field.onChange}
                          className="bg-white rounded-lg"
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
                        <div className="h-[200px] w-full bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
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