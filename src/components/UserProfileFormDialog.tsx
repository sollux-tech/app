import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { UserProfile, UserProfileFormData } from '@/types/profile';
import { showSuccess, showError } from '@/utils/toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from './SessionContextProvider';
import { CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface UserProfileFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile?: UserProfile | null; // Se fornecido, é para edição
}

const formSchema = z.object({
  first_name: z.string().min(1, { message: 'O primeiro nome é obrigatório.' }),
  last_name: z.string().min(1, { message: 'O sobrenome é obrigatório.' }),
  birthdate: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  avatar_url: z.string().url({ message: 'URL de avatar inválida.' }).optional().or(z.literal('')),
});

const UserProfileFormDialog: React.FC<UserProfileFormDialogProps> = ({ open, onOpenChange, userProfile }) => {
  const queryClient = useQueryClient();
  const { user } = useSession();

  const form = useForm<UserProfileFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: userProfile?.first_name || '',
      last_name: userProfile?.last_name || '',
      birthdate: userProfile?.birthdate || '',
      city: userProfile?.city || '',
      state: userProfile?.state || '',
      avatar_url: userProfile?.avatar_url || '',
    },
  });

  useEffect(() => {
    if (userProfile) {
      form.reset({
        first_name: userProfile.first_name || '',
        last_name: userProfile.last_name || '',
        birthdate: userProfile.birthdate || '',
        city: userProfile.city || '',
        state: userProfile.state || '',
        avatar_url: userProfile.avatar_url || '',
      });
    } else {
      form.reset({
        first_name: '',
        last_name: '',
        birthdate: '',
        city: '',
        state: '',
        avatar_url: '',
      });
    }
  }, [userProfile, form, open]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UserProfileFormData) => {
      if (!user?.id) throw new Error("User not authenticated.");
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          birthdate: data.birthdate || null,
          city: data.city || null,
          state: data.state || null,
          avatar_url: data.avatar_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile', user?.id] });
      showSuccess('Perfil atualizado com sucesso!');
      onOpenChange(false);
    },
    onError: (error) => {
      showError(`Erro ao atualizar perfil: ${error.message}`);
    },
  });

  const onSubmit = (data: UserProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const isLoading = updateProfileMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg border border-sollux-card-border">
        <DialogHeader>
          <DialogTitle className="text-sollux-black">Editar Perfil</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
            <FormField
              control={form.control}
              name="birthdate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-sollux-black">Data de Nascimento</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal rounded-lg",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? format(new Date(field.value), "PPP") : <span>Selecione uma data</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg border border-sollux-card-border" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
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
            <DialogFooter className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading} className="rounded-lg">
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading} className="rounded-lg bg-sollux-red hover:bg-sollux-orange">
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default UserProfileFormDialog;