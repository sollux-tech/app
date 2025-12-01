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
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import DatePicker from '@/components/DatePicker';
import { Loader2 } from 'lucide-react';

// Schema de validação para o formulário de apontamento
const appointmentFormSchema = z.object({
  value: z.coerce.number({
    invalid_type_error: "O valor deve ser um número.",
    required_error: "O valor é obrigatório."
  }).positive({ message: "O valor deve ser positivo." }),
  note: z.string().optional().nullable(),
  appointment_date: z.date({ required_error: "A data do apontamento é obrigatória." }),
});

type AppointmentFormData = z.infer<typeof appointmentFormSchema>;

interface KpiApontamentosFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: AppointmentFormData) => void;
  initialData?: AppointmentFormData | null;
  isLoading: boolean;
  kpiLiberatedId: string;
}

const KpiApontamentosForm: React.FC<KpiApontamentosFormProps> = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isLoading,
  kpiLiberatedId,
}) => {
  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      value: undefined,
      note: '',
      appointment_date: new Date(),
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        value: initialData.value,
        note: initialData.note || '',
        appointment_date: initialData.appointment_date || new Date(),
      });
    } else {
      form.reset({
        value: undefined,
        note: '',
        appointment_date: new Date(),
      });
    }
  }, [initialData, form, open]);

  const handleSubmit = (data: AppointmentFormData) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card backdrop-blur-md rounded-2xl shadow-lg border border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">{initialData ? 'Editar Apontamento' : 'Novo Apontamento'}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Registre o valor e detalhes para o KPI Smart Liberado.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Valor</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Ex: 150.50"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                      className="rounded-lg"
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="appointment_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-foreground text-left">Data do Apontamento</FormLabel>
                  <FormControl>
                    <DatePicker
                      date={field.value || undefined}
                      setDate={field.onChange}
                      placeholder="Selecione a data"
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Nota (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Adicione um comentário opcional..."
                      {...field}
                      value={field.value || ''}
                      className="rounded-lg"
                      rows={3}
                      disabled={isLoading}
                    />
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
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {initialData ? 'Salvando...' : 'Registrando...'}
                  </>
                ) : (
                  initialData ? 'Salvar Alterações' : 'Registrar Apontamento'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default KpiApontamentosForm;