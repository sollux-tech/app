import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Job, JobFormData } from '@/types/job';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { useCompany } from '@/components/CompanyContext';
import { useNavigate, useParams } from 'react-router-dom';

const formSchema = z.object({
  title: z.string().min(1, { message: 'O título da vaga é obrigatório.' }),
  description: z.string().min(1, { message: 'A descrição da vaga é obrigatória.' }),
});

const JobFormPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const { id: jobId } = useParams<{ id: string }>();
  const isEditing = !!jobId;

  const { data: editingJob, isLoading: isLoadingJob, error: errorJob } = useQuery<Job, Error>({
    queryKey: ['job', jobId],
    queryFn: async () => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error("Vaga não encontrada ou você não tem permissão para editá-la.");
        }
        throw error;
      }
      return data;
    },
    enabled: isEditing && !!user?.id,
    retry: false,
  });

  const form = useForm<JobFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
    },
  });

  useEffect(() => {
    if (isEditing && editingJob) {
      form.reset({
        title: editingJob.title,
        description: editingJob.description || '',
      });
    } else if (!isEditing) {
      form.reset({
        title: '',
        description: '',
      });
    }
  }, [isEditing, editingJob, form]);

  const createJobMutation = useMutation({
    mutationFn: async (data: JobFormData) => {
      if (!user?.id || !selectedCompany?.id) throw new Error("Usuário ou empresa não selecionada.");
      const { error } = await supabase.from('jobs').insert({
        ...data,
        user_id: user.id,
        company_id: selectedCompany.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs', selectedCompany?.id] });
      showSuccess('Vaga criada com sucesso!');
      navigate('/connect/jobs');
    },
    onError: (error) => {
      showError(`Erro ao criar vaga: ${error.message}`);
    },
  });

  const updateJobMutation = useMutation({
    mutationFn: async (data: JobFormData) => {
      if (!jobId) throw new Error("ID da vaga está faltando.");
      const { error } = await supabase.from('jobs').update(data).eq('id', jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs', selectedCompany?.id] });
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      showSuccess('Vaga atualizada com sucesso!');
      navigate('/connect/jobs');
    },
    onError: (error) => {
      showError(`Erro ao atualizar vaga: ${error.message}`);
    },
  });

  const onSubmit = (data: JobFormData) => {
    if (!selectedCompany && !isEditing) {
        showError("Por favor, selecione uma empresa antes de criar uma vaga.");
        return;
    }
    if (isEditing) {
      updateJobMutation.mutate(data);
    } else {
      createJobMutation.mutate(data);
    }
  };

  const isLoadingForm = createJobMutation.isPending || updateJobMutation.isPending || isLoadingJob;

  if (isEditing && isLoadingJob) {
    return <div className="text-center text-gray-600">Carregando vaga...</div>;
  }

  if (isEditing && errorJob) {
    return (
      <div className="flex flex-col items-center justify-center">
        <Card className="w-full max-w-md bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg p-6 text-center border border-sollux-card-border">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-sollux-red">Erro ao Carregar Vaga</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{errorJob.message}</p>
            <Button onClick={() => navigate('/connect/jobs')} className="mt-4 rounded-lg bg-sollux-red hover:bg-sollux-orange">
              Voltar para Vagas
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <Card className="w-full max-w-4xl bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg p-6 border border-sollux-card-border">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-sollux-black">
            {isEditing ? 'Editar Vaga' : 'Nova Vaga'}
          </CardTitle>
          <p className="text-lg text-gray-600">
            {isEditing ? 'Atualize os detalhes da vaga.' : `Crie uma nova vaga para ${selectedCompany?.name || 'sua empresa'}.`}
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
                    <FormLabel className="text-sollux-black">Título da Vaga</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Desenvolvedor React Sênior" {...field} className="rounded-lg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sollux-black">Descrição</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Descreva as responsabilidades, requisitos, etc." {...field} className="rounded-lg min-h-[250px]" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate('/connect/jobs')} disabled={isLoadingForm} className="rounded-lg">
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoadingForm} className="rounded-lg bg-sollux-red hover:bg-sollux-orange">
                  {isEditing ? 'Salvar Alterações' : 'Criar Vaga'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default JobFormPage;