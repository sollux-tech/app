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
import { Company, CompanyFormData } from '@/types/company';
import { showSuccess, showError } from '@/utils/toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from './SessionContextProvider';

interface CompanyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company?: Company | null; // If provided, it's for editing
}

const formSchema = z.object({
  name: z.string().min(1, { message: 'O nome da empresa é obrigatório.' }),
});

const CompanyFormDialog: React.FC<CompanyFormDialogProps> = ({ open, onOpenChange, company }) => {
  const queryClient = useQueryClient();
  const { user } = useSession();

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: company?.name || '',
    },
  });

  useEffect(() => {
    if (company) {
      form.reset({ name: company.name });
    } else {
      form.reset({ name: '' });
    }
  }, [company, form, open]);

  const createCompanyMutation = useMutation({
    mutationFn: async (data: CompanyFormData) => {
      if (!user?.id) throw new Error("User not authenticated.");
      const { data: newCompany, error } = await supabase
        .from('companies')
        .insert({ name: data.name, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return newCompany;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      showSuccess('Empresa criada com sucesso!');
      onOpenChange(false);
    },
    onError: (error) => {
      showError(`Erro ao criar empresa: ${error.message}`);
    },
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async (data: CompanyFormData) => {
      if (!company?.id) throw new Error("Company ID is missing.");
      const { data: updatedCompany, error } = await supabase
        .from('companies')
        .update({ name: data.name })
        .eq('id', company.id)
        .select()
        .single();
      if (error) throw error;
      return updatedCompany;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      showSuccess('Empresa atualizada com sucesso!');
      onOpenChange(false);
    },
    onError: (error) => {
      showError(`Erro ao atualizar empresa: ${error.message}`);
    },
  });

  const isLoading = createCompanyMutation.isPending || updateCompanyMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{company ? 'Editar Empresa' : 'Criar Nova Empresa'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Empresa</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome da empresa" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {company ? 'Salvar Alterações' : 'Criar Empresa'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CompanyFormDialog;