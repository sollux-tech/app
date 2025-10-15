import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SidebarNavItem, SidebarNavItemFormData } from '@/types/sidebar';
import { iconNames, getIcon } from '@/lib/icons';

interface SidebarItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: SidebarNavItemFormData) => void;
  item?: SidebarNavItem | null;
  isLoading: boolean;
}

const formSchema = z.object({
  label: z.string().min(1, { message: 'O nome é obrigatório.' }),
  to: z.string().min(1, { message: 'O caminho é obrigatório (ex: /dashboard).' }),
  icon: z.string().min(1, { message: 'A seleção de um ícone é obrigatória.' }),
  order: z.coerce.number().min(0, { message: 'A ordem deve ser um número positivo.' }),
});

const SidebarItemFormDialog: React.FC<SidebarItemFormDialogProps> = ({ open, onOpenChange, onSubmit, item, isLoading }) => {
  const form = useForm<SidebarNavItemFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: '',
      to: '',
      icon: '',
      order: 0,
    },
  });

  useEffect(() => {
    if (item) {
      form.reset(item);
    } else {
      form.reset({ label: '', to: '', icon: '', order: 0 });
    }
  }, [item, form, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card backdrop-blur-md rounded-2xl shadow-lg border border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">{item ? 'Editar Item' : 'Adicionar Novo Item'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Dashboard" {...field} className="rounded-lg" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Caminho</FormLabel>
                  <FormControl>
                    <Input placeholder="/dashboard" {...field} className="rounded-lg" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Ícone</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-lg">
                        <SelectValue placeholder="Selecione um ícone" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {iconNames.map((name) => {
                        const Icon = getIcon(name);
                        return (
                          <SelectItem key={name} value={name}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <span>{name}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Ordem</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0" {...field} className="rounded-lg" />
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
                {item ? 'Salvar Alterações' : 'Adicionar Item'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default SidebarItemFormDialog;