import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, UserPlus, Building, CheckCircle } from 'lucide-react';
import { useCompany } from '@/components/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { CompanyShareResponse, SharedUser } from '@/types/companyShare';
import { useSession } from '@/components/SessionContextProvider';
import { Company } from '@/types/company';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label'; // Importar o componente Label

const formSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um e-mail válido.' }),
});

interface SharedWithMeCompany extends Company {
  owner_name: string;
}

const CompanySharingPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { companies, isLoadingCompanies } = useCompany(); // Pega todas as empresas (próprias e compartilhadas)

  const [companyToManageSharing, setCompanyToManageSharing] = useState<Company | null>(null);

  const form = useForm<{ email: string }>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '' },
  });

  // Filtra apenas as empresas que o usuário logado é proprietário
  const ownedCompanies = useMemo(() => {
    if (!user?.id || !companies) return [];
    return companies.filter(company => company.user_id === user.id);
  }, [companies, user?.id]);

  // Define a primeira empresa própria como padrão para gerenciamento, se houver
  useEffect(() => {
    if (ownedCompanies.length > 0 && !companyToManageSharing) {
      setCompanyToManageSharing(ownedCompanies[0]);
    } else if (ownedCompanies.length === 0 && companyToManageSharing) {
      setCompanyToManageSharing(null);
    }
  }, [ownedCompanies, companyToManageSharing]);

  // Query para buscar usuários com quem a empresa selecionada está compartilhada
  const { data: sharedUsers, isLoading: isLoadingSharedUsers } = useQuery<SharedUser[], Error>({
    queryKey: ['companyShares', companyToManageSharing?.id],
    queryFn: async () => {
      if (!companyToManageSharing) {
        return [];
      }
      const { data, error } = await supabase
        .from('company_shares')
        .select('id, shared_with_user_id, profiles(first_name, last_name)') // Mantendo a busca pelos dados do perfil
        .eq('company_id', companyToManageSharing.id);

      if (error) {
        throw error;
      }

      // Adicionando log para depuração
      console.log('Dados brutos de compartilhamento:', data);

      return data.map(share => {
        const profile = share.profiles?.[0]; // Supabase pode retornar um array, pegamos o primeiro
        const firstName = profile?.first_name || '';
        const lastName = profile?.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim();

        return {
          id: share.id,
          user_id: share.shared_with_user_id,
          full_name: fullName || `ID: ${share.shared_with_user_id} (Usuário precisa preencher o perfil)`, // Fallback mais descritivo
        };
      });
    },
    enabled: !!companyToManageSharing,
  });

  // Query para buscar empresas que foram compartilhadas COMIGO
  const { data: sharedWithMe, isLoading: isLoadingSharedWithMe } = useQuery<any[], Error>({
    queryKey: ['sharedWithMe', user?.id],
    queryFn: async () => {
        if (!user) return [];
        const { data, error } = await supabase
            .from('company_shares')
            .select('companies(*, profiles(first_name, last_name))')
            .eq('shared_with_user_id', user.id);
        if (error) throw error;
        return data;
    },
    enabled: !!user,
  });

  const inviteMutation = useMutation({
    mutationFn: async (email: string) => {
      if (!companyToManageSharing) throw new Error('Nenhuma empresa selecionada para compartilhar.');
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: { companyId: companyToManageSharing.id, inviteeEmail: email },
      });
      
      if (error) {
        if (error instanceof FunctionsHttpError) {
          const errorJson = await error.context.json();
          if (errorJson.error) {
            throw new Error(errorJson.error);
          }
        }
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      showSuccess('Convite enviado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['companyShares', companyToManageSharing?.id] });
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
      queryClient.invalidateQueries({ queryKey: ['companyShares', companyToManageSharing?.id] });
    },
    onError: (error: Error) => {
      showError(`Erro ao remover acesso: ${error.message}`);
    },
  });

  const onSubmit = (data: { email: string }) => {
    inviteMutation.mutate(data.email);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle>Compartilhar Minhas Empresas</CardTitle>
          <CardDescription>Selecione uma das suas empresas para gerenciar o compartilhamento com outros usuários.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Label className="text-sollux-black">Minhas Empresas</Label> {/* Usando Label aqui */}
            <Select
              value={companyToManageSharing?.id || ''}
              onValueChange={(value) => setCompanyToManageSharing(ownedCompanies.find(c => c.id === value) || null)}
              disabled={isLoadingCompanies || ownedCompanies.length === 0}
            >
              <SelectTrigger className="w-full rounded-lg">
                <SelectValue placeholder="Selecione uma empresa para compartilhar..." />
              </SelectTrigger>
              <SelectContent className="bg-sollux-card-bg backdrop-blur-md rounded-lg shadow-lg border border-sollux-card-border">
                {isLoadingCompanies ? (
                  <SelectItem value="loading" disabled>Carregando empresas...</SelectItem>
                ) : ownedCompanies.length === 0 ? (
                  <SelectItem value="no-companies" disabled>Nenhuma empresa própria encontrada.</SelectItem>
                ) : (
                  ownedCompanies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {ownedCompanies.length === 0 && (
              <p className="text-sm text-red-500 mt-2">Você precisa criar uma empresa em "ID | Gerenciar Empresas" antes de poder compartilhar.</p>
            )}
          </div>

          {!companyToManageSharing ? (
            <p className="text-gray-500 text-center py-4">Selecione uma empresa acima para gerenciar o compartilhamento.</p>
          ) : (
            <>
              <h3 className="font-semibold mb-4 text-sollux-black">
                Convidar para: <span className="text-sollux-red">{companyToManageSharing.name}</span>
              </h3>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-start gap-4 mb-6">
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem className="flex-1"><FormLabel className="sr-only">Email</FormLabel><FormControl><Input placeholder="email@exemplo.com" {...field} className="rounded-lg" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <Button type="submit" disabled={inviteMutation.isPending} className="rounded-lg bg-sollux-red hover:bg-sollux-orange"><UserPlus className="mr-2 h-4 w-4" /> Convidar</Button>
                </form>
              </Form>
              <h4 className="font-semibold mb-2 text-sollux-black">Usuários com Acesso a "{companyToManageSharing.name}"</h4>
              <Table>
                <TableHeader><TableRow><TableHead className="text-sollux-black">Nome</TableHead><TableHead className="text-right text-sollux-black">Ações</TableHead></TableRow></TableHeader>
                <TableBody>
                  {isLoadingSharedUsers ? (
                    <TableRow><TableCell colSpan={2} className="text-center">Carregando...</TableCell></TableRow>
                  ) : sharedUsers && sharedUsers.length > 0 ? (
                    sharedUsers.map(u => (
                      <TableRow key={u.id}><TableCell className="font-medium text-sollux-black">{u.full_name}</TableCell><TableCell className="text-right"><Button variant="destructive" size="sm" onClick={() => removeMutation.mutate(u.id)} disabled={removeMutation.isPending} className="rounded-lg"><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={2} className="text-center text-gray-500">Ninguém com acesso ainda.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle>Empresas Compartilhadas Comigo</CardTitle>
          <CardDescription>Lista de empresas que outros usuários compartilharam com você.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead className="text-sollux-black">Nome da Empresa</TableHead><TableHead className="text-sollux-black">Proprietário</TableHead><TableHead className="text-sollux-black">Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoadingSharedWithMe ? (
                <TableRow><TableCell colSpan={3} className="text-center">Carregando...</TableCell></TableRow>
              ) : sharedWithMe && sharedWithMe.length > 0 ? (
                sharedWithMe.map(item => {
                  const company = item.companies;
                  const ownerProfile = company.profiles;
                  const ownerName = `${ownerProfile?.first_name || ''} ${ownerProfile?.last_name || ''}`.trim() || 'Desconhecido';
                  return (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium text-sollux-black">{company.name}</TableCell>
                      <TableCell className="text-gray-700">{ownerName}</TableCell>
                      <TableCell>
                        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200">
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Acesso Concedido
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow><TableCell colSpan={3} className="text-center text-gray-500">Nenhuma empresa compartilhada com você.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanySharingPage;