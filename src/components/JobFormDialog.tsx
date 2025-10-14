import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Job, JobFormData } from '@/types/job';

interface JobFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: JobFormData) => void;
  job?: Job | null;
  isLoading: boolean;
}

const formSchema = z.object({
  title: z.string().min(1, { message: 'O título da vaga é obrigatório.' }),
  description: z.string().min(1, { message: 'A descrição da vaga é obrigatória.' }),
});

const JobFormDialog: React.FC<JobFormDialogProps> = ({ open, onOpenChange, onSubmit, job, isLoading }) => {
  const form = useForm<JobFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
    },
  });

  useEffect(() => {
    if (job) {
      form.reset(job);
    } else {
      form.reset({ title: '', description: '' });
    }
  }, [job, form, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px] bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg border border-sollux-card-border">
        <DialogHeader>
          <DialogTitle className="text-sollux-black">{job ? 'Editar Vaga' : 'Adicionar Nova Vaga'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sollux-black">Título da Vaga</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Desenvolvedor React Sênior" {...field} className="rounded-lg" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sollux-black">Descrição</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descreva as responsabilidades, requisitos, etc." {...field} className="rounded-lg min-h-[150px]" />
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
                {job ? 'Salvar Alterações' : 'Adicionar Vaga'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default JobFormDialog;