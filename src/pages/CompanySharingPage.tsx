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
import { CompanyShareWithCompanyAndProfile, SharedUser } from '@/types/companyShare';
import { useSession } from '@/components/SessionContextProvider';
import { Company } from '@/types/company';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const formSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um e-mail válido.' }),
});

const CompanySharingPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { companies, isLoadingCompanies } = useCompany();

  const [companyToManageSharing, setCompanyToManageSharing] = useState<Company | null>(null);

  const form = useForm<{ email: string }>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '' },
  });

  const ownedCompanies = useMemo(() => {
    if (!user?.id || !companies) return [];
    return companies.filter(company => company.user_id === user.id);
  }, [companies, user?.id]);

  useEffect(() => {
    if (ownedCompanies.length > 0 && !companyToManageSharing) {
      setCompanyToManageSharing(ownedCompanies[0]);
    } else if (ownedCompanies.length === 0 && companyToManageSharing) {
      setCompanyToManageSharing(null);
    }
  }, [ownedCompanies, companyToManageSharing]);

  const { data: sharedUsers, isLoading: isLoadingSharedUsers, error: sharedUsersError } = useQuery<SharedUser[], Error>({
    queryKey: ['companyShares', companyToManageSharing?.id],
    queryFn: async (): Promise<SharedUser[]> => {
      if (!companyToManageSharing) return [];

      const { data: shares, error: sharesError } = await supabase
        .from('company_shares')
        .select('id, shared_with_user_id')
        .eq('company_id', companyToManageSharing.id);

      if (sharesError) {
        showError(`Erro ao carregar compartilhamentos: ${sharesError.message}`);
        throw sharesError;
      }

      if (!shares || shares.length === 0) return [];

      const sharedUserIds = shares.map(share => share.shared_with_user_id);

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', sharedUserIds);

      if (profilesError) {
        showError(`Erro ao carregar perfis: ${profilesError.message}`);
        throw profilesError;
      }

      return shares.map(share => {
        const profile = profiles?.find(p => p.id === share.shared_with_user_id);
        const fullName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || `ID: ${share.shared_with_user_id}`;
        return {
          id: share.id,
          user_id: share.shared_with_user_id,
          full_name: fullName,
        };
      });
    },
    enabled: !!companyToManageSharing,
  });

  const { data: sharedWithMe, isLoading: isLoadingSharedWithMe, error: sharedWithMeError } = useQuery<CompanyShareWithCompanyAndProfile[], Error>({
    queryKey: ['sharedWithMe', user?.id],
    queryFn: async (): Promise<CompanyShareWithCompanyAndProfile[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('company_shares')
        .select(`
          id,
          shared_with_user_id,
          companies (
            id,
            user_id,
            name,
            created_at
          )
        `)
        .eq('shared_with_user_id', user.id);

      if (error) {
        showError(`Erro ao carregar empresas compartilhadas: ${error.message}`);
        throw error;
      }

      // Primeiro mapeamos os dados básicos
      const mappedData = data.map(item => {
        const companiesArray = Array.isArray(item.companies) ? item.companies : [item.companies];
        
        return {
          id: item.id,
          shared_with_user_id: item.shared_with_user_id,
          companies: companiesArray.map(company => ({
            id: company.id,
            user_id: company.user_id,
            name: company.name,
            created_at: company.created_at,
            profiles: null
          }))
        };
      });

      // Agora buscamos os perfis dos proprietários
      const userIds = mappedData.flatMap(item => 
        item.companies.map(company => company.user_id)
      ).filter((id): id is string => id !== null);

      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', userIds);

        if (profilesError) {
          console.error("Erro ao carregar perfis dos proprietários:", profilesError);
        } else {
          // Associamos os perfis às empresas
          mappedData.forEach(item => {
            item.companies.forEach(company => {
              if (company.user_id) {
                const profile = profiles.find(p => p.id === company.user_id);
                if (profile) {
                  company.profiles = {
                    first_name: profile.first_name,
                    last_name: profile.last_name
                  };
                }
              }
            });
          });
        }
      }

      return mappedData;
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
      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="text-foreground">Compartilhar Minhas Empresas</CardTitle>
          <CardDescription className="text-muted-foreground">Selecione uma das suas empresas para gerenciar o compartilhamento com outros usuários.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Label className="text-foreground">Minhas Empresas</Label>
            <Select
              value={companyToManageSharing?.id || ''}
              onValueChange={(value) => setCompanyToManageSharing(ownedCompanies.find(c => c.id === value) || null)}
              disabled={isLoadingCompanies || ownedCompanies.length === 0}
            >
              <SelectTrigger className="w-full rounded-lg">
                <SelectValue placeholder="Selecione uma empresa para compartilhar..." />
              </SelectTrigger>
              <SelectContent className="bg-card backdrop-blur-md rounded-lg shadow-lg border border-border">
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
              <p className="text-sm text-destructive mt-2">Você precisa criar uma empresa em "ID | Gerenciar Empresas" antes de poder compartilhar.</p>
            )}
          </div>

          {!companyToManageSharing ? (
            <p className="text-muted-foreground text-center py-4">Selecione uma empresa acima para gerenciar o compartilhamento.</p>
          ) : (
            <>
              <h3 className="font-semibold mb-4 text-foreground">
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
              <h4 className="font-semibold mb-2 text-foreground">Usuários com Acesso a "{companyToManageSharing.name}"</h4>
              <Table>
                <TableHeader><TableRow><TableHead className="text-foreground">Nome</TableHead><TableHead className="text-right text-foreground">Ações</TableHead></TableRow></TableHeader>
                <TableBody>
                  {isLoadingSharedUsers ? (
                    <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : sharedUsersError ? (
                    <TableRow><TableCell colSpan={2} className="text-center text-destructive">Erro ao carregar usuários: {sharedUsersError.message}</TableCell></TableRow>
                  ) : sharedUsers && sharedUsers.length > 0 ? (
                    sharedUsers.map(u => (
                      <TableRow key={u.id}><TableCell className="font-medium text-foreground">{u.full_name}</TableCell><TableCell className="text-right"><Button variant="destructive" size="sm" onClick={() => removeMutation.mutate(u.id)} disabled={removeMutation.isPending} className="rounded-lg bg-sollux-red hover:bg-red-700 text-white"><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">Ninguém com acesso ainda.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="text-foreground">Empresas Compartilhadas Comigo</CardTitle>
          <CardDescription className="text-muted-foreground">Lista de empresas que outros usuários compartilharam com você.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead className="text-foreground">Nome da Empresa</TableHead><TableHead className="text-foreground">Proprietário</TableHead><TableHead className="text-foreground">Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoadingSharedWithMe ? (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : sharedWithMeError ? (
                <TableRow><TableCell colSpan={3} className="text-center text-destructive">Erro ao carregar empresas compartilhadas: {sharedWithMeError.message}</TableCell></TableRow>
              ) : sharedWithMe && sharedWithMe.length > 0 ? (
                sharedWithMe.map(item => {
                  const company = item.companies[0]; // Acessar o primeiro item do array
                  if (!company) { 
                    return null; 
                  }
                  const ownerProfile = company.profiles;
                  const ownerName = ownerProfile 
                    ? `${ownerProfile.first_name || ''} ${ownerProfile.last_name || ''}`.trim() || 'Desconhecido'
                    : 'Desconhecido';
                  return (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium text-foreground">{company.name}</TableCell>
                      <TableCell className="text-muted-foreground">{ownerName}</TableCell>
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
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Nenhuma empresa compartilhada com você.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanySharingPage;