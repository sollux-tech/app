import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Profile, ProfileFormData } from '@/types/profile';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { MultiSelectOption } from '@/components/MultiSelect'; // Importar o tipo MultiSelectOption

const formSchema = z.object({
  first_name: z.string().min(1, { message: 'O primeiro nome é obrigatório.' }),
  last_name: z.string().min(1, { message: 'O sobrenome é obrigatório.' }),
  birthdate: z.date({ required_error: 'A data de nascimento é obrigatória.' }).nullable(),
  city: z.string().optional(),
  state: z.string().optional(),
  avatar_url: z.string().url({ message: 'URL de avatar inválida.' }).optional(),
  theme: z.enum(['light', 'dark', 'system'], { required_error: 'O tema é obrigatório.' }).default('system'),
});

const UserManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

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

  useEffect(() => {
    if (editingProfile) {
      form.reset({
        first_name: editingProfile.first_name || '',
        last_name: editingProfile.last_name || '',
        birthdate: editingProfile.birthdate ? new Date(editingProfile.birthdate) : undefined,
        city: editingProfile.city || '',
        state: editingProfile.state || '',
        avatar_url: editingProfile.avatar_url || '',
        theme: editingProfile.theme || 'system',
      });
    } else {
      form.reset({
        first_name: '',
        last_name: '',
        birthdate: undefined,
        city: '',
        state: '',
        avatar_url: '',
        theme: 'system',
      });
    }
  }, [editingProfile, form, isDialogOpen]);

  const { data: profiles, isLoading: isLoadingProfiles, error: errorProfiles } = useQuery<Profile[], Error>({
    queryKey: ['profiles', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles', user?.id] });
      setIsDialogOpen(false);
      setEditingProfile(null);
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
          first_name: data.first_name,
          last_name: data.last_name,
          birthdate: data.birthdate ? data.birthdate.toISOString() : null,
          city: data.city,
          state: data.state,
          avatar_url: data.avatar_url || null,
          theme: data.theme,
          user_id: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return newProfile;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Perfil criado com sucesso!');
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      if (!editingProfile?.id) throw new Error("ID do perfil está faltando.");
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          birthdate: data.birthdate ? data.birthdate.toISOString() : null,
          city: data.city,
          state: data.state,
          avatar_url: data.avatar_url || null,
          theme: data.theme,
        })
        .eq('id', editingProfile.id)
        .eq('user_id', user.id)
        .select()
        .single();
      if (error) throw error;
      return updatedProfile;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Perfil atualizado com sucesso!');
    },
  });

  const deleteProfileMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { error, count } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) {
        throw error;
      }
      if (count === 0) {
        throw new Error("Perfil não encontrado ou você não tem permissão para excluí-lo.");
      }
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Perfil excluído com sucesso!');
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    if (editingProfile) {
      updateProfileMutation.mutate(data);
    } else {
      createProfileMutation.mutate(data);
    }
  };

  const handleAddClick = () => {
    setEditingProfile(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (profile: Profile) => {
    setEditingProfile(profile);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este perfil?')) {
      deleteProfileMutation.mutate(id);
    }
  };

  const isMutating = createProfileMutation.isPending || updateProfileMutation.isPending || deleteProfileMutation.isPending;
  const isLoadingPage = isLoadingProfiles;

  if (isLoadingPage) {
    return <div className="text-center text-gray-600">Carregando perfis...</div>;
  }

  if (errorProfiles) {
    return <div className="text-center text-red-600">Erro ao carregar perfis: {errorProfiles.message}</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="text-foreground uppercase font-bold">Gerenciar Perfis do Usuário</CardTitle>
          <CardDescription className="text-muted-foreground">
            Gerencie os perfis associados à sua conta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <Label htmlFor="first-name" className="text-foreground">Primeiro Nome</Label>
              <Input
                id="first-name"
                placeholder="Ex: João"
                className="rounded-lg"
                {...form.register('first_name')}
              />
              <FormMessage />
            </div>
            <div>
              <Label htmlFor="last-name" className="text-foreground">Sobrenome</Label>
              <Input
                id="last-name"
                placeholder="Ex: Silva"
                className="rounded-lg"
                {...form.register('last_name')}
              />
              <FormMessage />
            </div>
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
                    <SelectItem value="system" disabled={true}>Baseado no Sistema</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="button" onClick={() => onSubmit(form.getValues())} disabled={isMutating} className="rounded-lg bg-sollux-red hover:bg-sollux-orange mt-4">
            Salvar Alterações
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagementPage;