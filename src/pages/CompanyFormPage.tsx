import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Company, CompanyFormData } from '@/types/company';
import { showSuccess, showError } from '@/utils/toast';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(1, { message: 'O nome da empresa é obrigatório.' }),
});

const CompanyFormPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const navigate = useNavigate();
  const { id: companyId } = useParams<{ id: string }>();
  const isEditing = !!companyId;

  const { data: editingCompany, isLoading: isLoadingCompany } = useQuery<Company, Error>({
    queryKey: ['company', companyId],
    queryFn: async () => {
      if (!companyId) throw new Error("ID da empresa está faltando.");
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .eq('user_id', user?.id) // Garante que o usuário só edite suas próprias empresas
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isEditing && !!user?.id,
    retry: false, // Não tentar novamente em caso de erro, especialmente para 404/permissão
  });

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
    },
  });

  useEffect(() => {
    if (isEditing && editingCompany) {
      form.reset({ name: editingCompany.name });
    } else if (!isEditing) {
      form.reset({ name: '' });
    }
  }, [isEditing, editingCompany, form]);

  const mutationOptions = {
    onSuccess: () => {
      // Invalida ambas as queries para atualizar a lista de gerenciamento e o seletor global
      queryClient.invalidateQueries({ queryKey: ['ownedCompanies', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['companies', user?.id] });
      navigate('/id/companies'); // Redireciona de volta para a lista de empresas
    },
    onError: (error: Error) => {
      showError(`Erro: ${error.message}`);
    },
  };

  const createCompanyMutation = useMutation({
    mutationFn: async (data: CompanyFormData) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { data: newCompany, error } = await supabase
        .from('companies')
        .insert({ name: data.name, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return newCompany;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Empresa criada com sucesso!');
    },
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async (data: CompanyFormData) => {
      if (!companyId) throw new Error("ID da empresa está faltando.");
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { data: updatedCompany, error } = await supabase
        .from('companies')
        .update({ name: data.name })
        .eq('id', companyId)
        .eq('user_id', user.id) // Garante que o usuário só edite suas próprias empresas
        .select()
        .single();
      if (error) throw error;
      return updatedCompany;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Empresa atualizada com sucesso!');
    },
  });

  const onSubmit = (data: CompanyFormData) => {
    if (isEditing) {
      updateCompanyMutation.mutate(data);
    } else {
      createCompanyMutation.mutate(data);
    }
  };

  const isLoadingForm = createCompanyMutation.isPending || updateCompanyMutation.isPending || isLoadingCompany;

  if (isEditing && isLoadingCompany) {
    return <div className="text-center text-gray-600">Carregando empresa...</div>;
  }

  if (isEditing && !editingCompany && !isLoadingCompany) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Card className="w-full max-w-md bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg p-6 text-center border border-sollux-card-border">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-sollux-red">Empresa não encontrada</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">A empresa que você está tentando editar não existe ou você não tem permissão.</p>
            <Button onClick={() => navigate('/id/companies')} className="mt-4 rounded-lg bg-sollux-red hover:bg-sollux-orange">
              Voltar para Empresas
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <Card className="w-full max-w-2xl bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg p-6 text-center border border-sollux-card-border">
        <CardHeader>
          <CardTitle className="text-3xl font-bold mb-2 text-sollux-black">
            {isEditing ? 'Editar Empresa' : 'Criar Nova Empresa'}
          </CardTitle>
          <CardDescription className="text-lg text-gray-600">
            {isEditing ? 'Atualize o nome da sua empresa.' : 'Adicione uma nova empresa à sua conta.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sollux-black">Nome da Empresa</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome da empresa" {...field} className="rounded-lg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/id/companies')}
                  disabled={isLoadingForm}
                  className="rounded-lg"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isLoadingForm}
                  className="rounded-lg bg-sollux-red hover:bg-sollux-orange"
                >
                  {isLoadingForm ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isEditing ? 'Salvando...' : 'Criando...'}
                    </>
                  ) : (
                    isEditing ? 'Salvar Alterações' : 'Criar Empresa'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanyFormPage;