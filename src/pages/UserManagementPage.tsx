import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useSession } from '@/components/SessionContextProvider';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { ProfileFormData } from '@/types/profile';
import DatePicker from '@/components/DatePicker';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Importar Select
import { useTheme } from 'next-themes'; // Importar useTheme

const formSchema = z.object({
  first_name: z.string().min(1, { message: 'O primeiro nome é obrigatório.' }),
  last_name: z.string().min(1, { message: 'O sobrenome é obrigatório.' }),
  birthdate: z.date().optional().nullable(),
  city: z.string().optional(),
  state: z.string().optional(),
  avatar_url: z.string().url({ message: 'URL de avatar inválida.' }).optional().or(z.literal('')),
});

const UserManagementPage: React.FC = () => {
  const { user, profile, isLoading, refetchProfile } = useSession();
  const queryClient = useQueryClient();
  const { setTheme, theme } = useTheme(); // Obter setTheme e theme do hook useTheme

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      birthdate: undefined,
      city: '',
      state: '',
      avatar_url: '',
    },
  });

  useEffect(() => {
    if (profile) {
      // Corrige o problema de fuso horário ao carregar a data do banco de dados.
      // A string 'YYYY-MM-DD' é convertida para uma data no fuso horário local.
      const birthdateString = profile.birthdate;
      const localBirthdate = birthdateString ? new Date(birthdateString + 'T00:00:00') : undefined;

      form.reset({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        birthdate: localBirthdate,
        city: profile.city || '',
        state: profile.state || '',
        avatar_url: profile.avatar_url || '',
      });
    }
  }, [profile, form]);

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) {
      showError('Usuário não autenticado.');
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            first_name: data.first_name,
            last_name: data.last_name,
            birthdate: data.birthdate ? format(data.birthdate, 'yyyy-MM-dd') : null,
            city: data.city || null,
            state: data.state || null,
            avatar_url: data.avatar_url || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' } // Use upsert to insert if not exists, update if exists
        );

      if (error) {
        throw error;
      }

      showSuccess('Perfil atualizado com sucesso!');
      refetchProfile(); // Recarregar o perfil para atualizar o contexto
      queryClient.invalidateQueries({ queryKey: ['profiles'] }); // Invalida a query de perfis para atualizar em outros componentes
      queryClient.invalidateQueries({ queryKey: ['companyShares'] }); // Invalida queries de compartilhamento de empresas
      queryClient.invalidateQueries({ queryKey: ['sharedWithMe'] }); // Invalida queries de empresas compartilhadas comigo
    } catch (error: any) {
      showError(`Erro ao atualizar perfil: ${error.message}`);
      console.error('Erro ao atualizar perfil:', error);
    }
  };

  if (isLoading) {
    return <div className="text-center text-gray-600">Carregando perfil...</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <Card className="w-full max-w-2xl bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg p-6 text-center border border-sollux-card-border">
        <CardHeader>
          <CardTitle className="text-3xl font-bold mb-4 text-sollux-black">Gerenciar Perfil</CardTitle>
          <p className="text-lg text-gray-600">
            Atualize suas informações pessoais.
          </p>
        </CardHeader>
        <CardContent className="mt-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sollux-black">Primeiro Nome</FormLabel>
                      <FormControl>
                        <Input placeholder="Seu primeiro nome" {...field} className="rounded-lg" />
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
                      <FormLabel className="text-sollux-black">Sobrenome</FormLabel>
                      <FormControl>
                        <Input placeholder="Seu sobrenome" {...field} className="rounded-lg" />
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
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-sollux-black text-left">Data de Nascimento</FormLabel>
                    <FormControl>
                      <DatePicker
                        date={field.value}
                        setDate={field.onChange}
                        placeholder="Selecione sua data de nascimento"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sollux-black">Cidade</FormLabel>
                      <FormControl>
                        <Input placeholder="Sua cidade" {...field} className="rounded-lg" />
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
                      <FormLabel className="text-sollux-black">Estado</FormLabel>
                      <FormControl>
                        <Input placeholder="Seu estado" {...field} className="rounded-lg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="avatar_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sollux-black">URL do Avatar</FormLabel>
                    <FormControl>
                      <Input placeholder="https://exemplo.com/avatar.jpg" {...field} className="rounded-lg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Theme Selector */}
              <FormItem>
                <FormLabel className="text-sollux-black text-left">Tema da Interface</FormLabel>
                <Select value={theme} onValueChange={(value) => setTheme(value)}>
                  <FormControl>
                    <SelectTrigger className="rounded-lg">
                      <SelectValue placeholder="Selecionar tema" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="light">Claro</SelectItem>
                    <SelectItem value="dark">Escuro</SelectItem>
                    <SelectItem value="system">Sistema</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription className="text-left">
                  Selecione o tema da interface: claro, escuro ou baseado nas configurações do seu sistema.
                </FormDescription>
                <FormMessage />
              </FormItem>

              <Button type="submit" className="w-full rounded-lg bg-sollux-red hover:bg-sollux-orange">
                Salvar Alterações
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagementPage;