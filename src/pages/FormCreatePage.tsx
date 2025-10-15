import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { useCompany } from '@/components/CompanyContext';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  title: z.string().min(1, { message: 'O título do formulário é obrigatório.' }),
  description: z.string().optional(),
});

// Define o tipo inferido do schema para uso consistente
type FormInput = z.infer<typeof formSchema>;

const FormCreatePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();

  const form = useForm<FormInput>({ // Usar o tipo FormInput aqui
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
    },
  });

  const createFormMutation = useMutation({
    mutationFn: async (data: FormInput) => { // Usar o tipo FormInput aqui
      if (!user?.id || !selectedCompany?.id) throw new Error("Usuário não autenticado ou empresa não selecionada.");
      const { data: newForm, error } = await supabase
        .from('forms')
        .insert({
          title: data.title,
          description: data.description,
          company_id: selectedCompany.id,
          user_id: user.id,
          status: 'draft',
          questions: [],
          response_count: 0,
        })
        .select()
        .single();
      if (error) throw error;
      return newForm;
    },
    onSuccess: (newForm) => {
      queryClient.invalidateQueries({ queryKey: ['forms', selectedCompany?.id] });
      showSuccess('Formulário criado com sucesso! Agora você pode adicionar perguntas.');
      navigate(`/connect/forms/${newForm.id}/edit`); // Redireciona para a página de edição do novo formulário
    },
    onError: (error) => {
      showError(`Erro ao criar formulário: ${error.message}`);
    },
  });

  const onSubmit = (data: FormInput) => { // Usar o tipo FormInput aqui
    createFormMutation.mutate(data);
  };

  const isLoading = createFormMutation.isPending;

  return (
    <div className="flex flex-col items-center justify-center">
      <Card className="w-full max-w-2xl bg-card backdrop-blur-md rounded-2xl shadow-lg p-6 text-center border border-border">
        <CardHeader>
          <CardTitle className="text-3xl font-bold mb-2 text-foreground">Criar Novo Formulário</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Comece definindo o título e a descrição do seu formulário.
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Título do Formulário</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Pesquisa de Clima Organizacional"
                        {...field}
                        className="rounded-lg"
                      />
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
                    <FormLabel className="text-foreground">Descrição (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Breve descrição sobre o objetivo do formulário"
                        {...field}
                        className="rounded-lg"
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/connect/forms')}
                  disabled={isLoading}
                  className="rounded-lg"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !selectedCompany}
                  className="rounded-lg bg-sollux-red hover:bg-sollux-orange"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    'Criar Formulário'
                  )}
                </Button>
              </div>
              {!selectedCompany && (
                <p className="text-destructive text-sm mt-2">Por favor, selecione uma empresa na barra lateral para criar um formulário.</p>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default FormCreatePage;