import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, UserPlus } from 'lucide-react';
import { useCompany } from '@/components/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { CompanyShareResponse, SharedUser } from '@/types/companyShare';

const formSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um e-mail válido.' }),
});

const CompanySharingPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  const form = useForm<{ email: string }>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '' },
  });

  const { data: sharedUsers, isLoading: isLoadingSharedUsers } = useQuery<SharedUser[], Error>({
    queryKey: ['companyShares', selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany) return [];
      const { data, error } = await supabase
        .from('company_shares')
        .select('id, shared_with_user_id, profiles(first_name, last_name)')
        .eq('company_id', selectedCompany.id);

      if (error) throw error;

      return (data as CompanyShareResponse[]).map(share => {
        const profile = share.profiles?.[0]; // Get the first profile from the array
        return {
          id: share.id,
          user_id: share.shared_with_user_id,
          full_name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Usuário sem nome',
        };
      });
    },
    enabled: !!selectedCompany,
  });

  const inviteMutation = useMutation({
    mutationFn: async (email: string) => {
      if (!selectedCompany) throw new Error('Nenhuma empresa selecionada.');
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: { companyId: selectedCompany.id, inviteeEmail: email },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      showSuccess('Convite enviado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['companyShares', selectedCompany?.id] });
      form.reset();
    },
    onError: (error: Error) => {
      showError(`Erro ao convidar: ${error.message}`);
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (shareId: string) => {
      const { error } = await supabase.from('company_shares').delete().eq('id', shareId);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess('Acesso removido com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['companyShares', selectedCompany?.id] });
    },
    onError: (error: Error) => {
      showError(`Erro ao remover acesso: ${error.message}`);
    },
  });

  const onSubmit = (data: { email: string }) => {
    inviteMutation.mutate(data.email);
  };

  if (!selectedCompany) {
    return (
      <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle>Nenhuma Empresa Selecionada</CardTitle>
          <CardDescription>Por favor, selecione uma empresa na barra lateral para gerenciar o compartilhamento.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle>Compartilhar Empresa: <span className="text-sollux-red">{selectedCompany.name}</span></CardTitle>
          <CardDescription>Convide usuários para colaborar na sua empresa. Eles terão acesso de visualização.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-start gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel className="sr-only">Email do usuário</FormLabel>
                    <FormControl>
                      <Input placeholder="email@exemplo.com" {...field} className="rounded-lg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={inviteMutation.isPending} className="rounded-lg bg-sollux-red hover:bg-sollux-orange">
                <UserPlus className="mr-2 h-4 w-4" /> Convidar
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle>Usuários com Acesso</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-sollux-black">Nome do Usuário</TableHead>
                <TableHead className="text-right text-sollux-black">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingSharedUsers ? (
                <TableRow><TableCell colSpan={2} className="text-center">Carregando...</TableCell></TableRow>
              ) : sharedUsers && sharedUsers.length > 0 ? (
                sharedUsers.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium text-sollux-black">{user.full_name}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeMutation.mutate(user.id)}
                        disabled={removeMutation.isPending}
                        className="rounded-lg"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={2} className="text-center text-gray-500">Ninguém com acesso ainda.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanySharingPage;