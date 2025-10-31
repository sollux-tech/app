import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Profile, ProfileFormData } from '@/types/profile';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ManagementPageLayout } from '@/components/layout/ManagementPageLayout';
import { LoadingState } from '@/components/status/LoadingState';
import { ErrorState } from '@/components/status/ErrorState';

const formSchema = z.object({
  first_name: z.string().min(1, { message: 'O primeiro nome é obrigatório.' }),
  last_name: z.string().min(1, { message: 'O sobrenome é obrigatório.' }),
  birthdate: z.date({ required_error: 'A data de nascimento é obrigatória.' }).nullable(),
  city: z.string().optional(),
  state: z.string().optional(),
  avatar_url: z.string().url({ message: 'URL de avatar inválida.' }).optional().nullable(),
  theme: z.enum(['light', 'dark', 'system'], { required_error: 'O tema é obrigatório.' }).default('system'),
});

const UserManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user, refetchProfile } = useSession();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      birthdate: undefined,
      city: '',
      state: '',
      avatar_url: '',
      theme: 'system',
    },
  });

  const { data: profiles, isLoading: isLoadingProfiles, error: errorProfiles } = useQuery<Profile[], Error>({
    queryKey: ['profiles', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data ? [data] : [];
    },
    enabled: !!user?.id,
  });

  const mutationOptions = {
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profiles', user?.id] });
      await refetchProfile();
    },
    onError: (error: Error) => {
      showError(`Erro: ${error.message}`);
    },
  };

  const createProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { data: newProfile, error } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          first_name: data.first_name,
          last_name: data.last_name,
          birthdate: data.birthdate ? format(data.birthdate, 'yyyy-MM-dd') : null,
          city: data.city,
          state: data.state,
          avatar_url: data.avatar_url || null,
          theme: data.theme,
        })
        .select()
        .single();
      if (error) throw error;
      return newProfile;
    },
    ...mutationOptions,
    onSuccess: async () => {
      await mutationOptions.onSuccess();
      showSuccess('Perfil criado com sucesso!');
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          birthdate: data.birthdate ? format(data.birthdate, 'yyyy-MM-dd') : null,
          city: data.city,
          state: data.state,
          avatar_url: data.avatar_url || null,
          theme: data.theme,
        })
        .eq('id', user.id)
        .select()
        .single();
      if (error) throw error;
      return updatedProfile;
    },
    ...mutationOptions,
    onSuccess: async () => {
      await mutationOptions.onSuccess();
      showSuccess('Perfil atualizado com sucesso!');
    },
  });
 
  const onSubmit = (data: ProfileFormData) => {
    if (profiles && profiles.length > 0) {
      updateProfileMutation.mutate(data);
    } else {
      createProfileMutation.mutate(data);
    }
  };

  const isMutating = createProfileMutation.isPending || updateProfileMutation.isPending;
  const isLoadingPage = isLoadingProfiles;

  useEffect(() => {
    if (profiles && profiles.length > 0) {
      const profile = profiles[0];
      form.reset({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        birthdate: profile.birthdate ? new Date(profile.birthdate) : undefined,
        city: profile.city || '',
        state: profile.state || '',
        avatar_url: profile.avatar_url || '',
        theme: profile.theme || 'system',
      });
    }
  }, [profiles, form]);

  if (isLoadingPage) {
    return <LoadingState message="Carregando perfis..." />;
  }

  if (errorProfiles) {
    return (
      <ErrorState
        message={`Erro ao carregar perfis: ${errorProfiles.message}`}
        onRetry={() => queryClient.invalidateQueries({ queryKey: ['profiles', user?.id] })}
      />
    );
  }

  return (
    <ManagementPageLayout
      title="Gerenciar Perfis do Usuário"
      description="Gerencie os perfis associados à sua conta."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Primeiro Nome</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: João"
                      className="rounded-lg"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="last_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Sobrenome</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Silva"
                      className="rounded-lg"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="birthdate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">Data de Nascimento</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    placeholder="Selecione a data de nascimento"
                    value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                    onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                    className="rounded-lg"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">Cidade</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ex: São Paulo"
                    className="rounded-lg"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">Estado/Província</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ex: SP"
                    className="rounded-lg"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="avatar_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">URL do Avatar</FormLabel>
                <FormControl>
                  <Input
                    placeholder="https://exemplo.com/avatar.jpg"
                    className="rounded-lg"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="theme"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">Tema da Interface</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isMutating}>
                  <FormControl>
                    <SelectTrigger className="rounded-lg">
                      <SelectValue placeholder="Selecione um tema" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="light">Claro</SelectItem>
                    <SelectItem value="dark">Escuro</SelectItem>
                    <SelectItem value="system">Baseado no Sistema</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isMutating} className="mt-4 rounded-lg bg-sollux-red hover:bg-sollux-orange">
            Salvar Alterações
          </Button>
        </form>
      </Form>
    </ManagementPageLayout>
  );
};

export default UserManagementPage;