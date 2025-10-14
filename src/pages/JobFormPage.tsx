import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Job, JobFormData } from '@/types/job';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { useCompany } from '@/components/CompanyContext';
import { useNavigate, useParams } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { JobSector } from '@/types/jobSector';
import { ContractType } from '@/types/contractType';
import { WorkModel } from '@/types/workModel';

const formSchema = z.object({
  title: z.string().min(1, { message: 'O título da vaga é obrigatório.' }),
  job_sector_id: z.string().min(1, { message: 'A área/setor é obrigatória.' }),
  contract_type_id: z.string().min(1, { message: 'O tipo de contrato é obrigatório.' }),
  work_model_id: z.string().min(1, { message: 'O modelo de trabalho é obrigatório.' }),
  city: z.string().optional(),
  state: z.string().optional(),
  publication_deadline_days: z.coerce.number().int().positive().optional(),
  status: z.boolean().default(true),
  short_summary: z.string().optional(),
  detailed_description: z.string().min(1, { message: 'A descrição detalhada é obrigatória.' }),
  mandatory_requirements: z.string().optional(),
  differential_requirements: z.string().optional(),
  benefits: z.string().optional(),
  salary_min: z.coerce.number().positive().optional(),
  salary_max: z.coerce.number().positive().optional(),
  hashtags: z.string().optional(),
}).refine(data => {
  if (data.salary_min !== undefined && data.salary_max !== undefined) {
    return data.salary_max >= data.salary_min;
  }
  return true;
}, {
  message: "O salário máximo deve ser maior ou igual ao mínimo.",
  path: ["salary_max"],
});

const JobFormPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const { id: jobId } = useParams<{ id: string }>();
  const isEditing = !!jobId;

  const { data: jobSectors, isLoading: isLoadingSectors } = useQuery<JobSector[]>({ queryKey: ['jobSectors'], queryFn: async () => { const { data, error } = await supabase.from('job_sectors').select('*'); if (error) throw error; return data; } });
  const { data: contractTypes, isLoading: isLoadingContracts } = useQuery<ContractType[]>({ queryKey: ['contractTypes'], queryFn: async () => { const { data, error } = await supabase.from('contract_types').select('*'); if (error) throw error; return data; } });
  const { data: workModels, isLoading: isLoadingModels } = useQuery<WorkModel[]>({ queryKey: ['workModels'], queryFn: async () => { const { data, error } = await supabase.from('work_models').select('*'); if (error) throw error; return data; } });

  const { data: editingJob, isLoading: isLoadingJob } = useQuery<Job, Error>({
    queryKey: ['job', jobId],
    queryFn: async () => {
      const { data, error } = await supabase.from('jobs').select('*').eq('id', jobId).single();
      if (error) throw error;
      return data;
    },
    enabled: isEditing,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { status: true },
  });

  useEffect(() => {
    if (isEditing && editingJob) {
      form.reset({
        ...editingJob,
        status: editingJob.status === 'active',
        publication_deadline_days: editingJob.publication_deadline_days || undefined,
        salary_min: editingJob.salary_min || undefined,
        salary_max: editingJob.salary_max || undefined,
        mandatory_requirements: editingJob.mandatory_requirements?.join('\n') || '',
        differential_requirements: editingJob.differential_requirements?.join('\n') || '',
        benefits: editingJob.benefits?.join('\n') || '',
        hashtags: editingJob.hashtags?.join(', ') || '',
      });
    }
  }, [isEditing, editingJob, form]);

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      if (isEditing) {
        const { error } = await supabase.from('jobs').update(payload).eq('id', jobId);
        if (error) throw error;
      } else {
        if (!user?.id || !selectedCompany?.id) throw new Error("Usuário ou empresa não selecionada.");
        const { error } = await supabase.from('jobs').insert({ ...payload, user_id: user.id, company_id: selectedCompany.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs', selectedCompany?.id] });
      showSuccess(`Vaga ${isEditing ? 'atualizada' : 'criada'} com sucesso!`);
      navigate('/connect/jobs');
    },
    onError: (error: Error) => showError(`Erro: ${error.message}`),
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    const processMultiLine = (text?: string) => text?.split('\n').filter(line => line.trim() !== '') || null;
    const processHashtags = (text?: string) => text?.split(',').map(tag => tag.trim()).filter(tag => tag !== '') || null;

    const payload = {
      ...data,
      status: data.status ? 'active' : 'inactive',
      mandatory_requirements: processMultiLine(data.mandatory_requirements),
      differential_requirements: processMultiLine(data.differential_requirements),
      benefits: processMultiLine(data.benefits),
      hashtags: processHashtags(data.hashtags),
    };
    mutation.mutate(payload);
  };

  const isLoading = isLoadingSectors || isLoadingContracts || isLoadingModels || (isEditing && isLoadingJob) || mutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Dados Básicos</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="title" render={({ field }) => <FormItem><FormLabel>Título da vaga</FormLabel><FormControl><Input placeholder="Ex: Engenheiro de Software" {...field} /></FormControl><FormMessage /></FormItem>} />
              <FormField control={form.control} name="job_sector_id" render={({ field }) => <FormItem><FormLabel>Área / Setor</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent>{jobSectors?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
              <FormField control={form.control} name="contract_type_id" render={({ field }) => <FormItem><FormLabel>Tipo de Contrato</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent>{contractTypes?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
              <FormField control={form.control} name="work_model_id" render={({ field }) => <FormItem><FormLabel>Modelo de Trabalho</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent>{workModels?.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
              <FormField control={form.control} name="city" render={({ field }) => <FormItem><FormLabel>Localidade (Cidade)</FormLabel><FormControl><Input placeholder="Ex: São Paulo" {...field} /></FormControl><FormMessage /></FormItem>} />
              <FormField control={form.control} name="state" render={({ field }) => <FormItem><FormLabel>Estado</FormLabel><FormControl><Input placeholder="Ex: SP" {...field} /></FormControl><FormMessage /></FormItem>} />
              <FormField control={form.control} name="publication_deadline_days" render={({ field }) => <FormItem><FormLabel>Prazo de publicação (dias)</FormLabel><FormControl><Input type="number" placeholder="Ex: 30" {...field} /></FormControl><FormMessage /></FormItem>} />
              <FormField control={form.control} name="status" render={({ field }) => <FormItem className="flex flex-col"><FormLabel>Status da Vaga</FormLabel><div className="flex items-center gap-2 pt-2"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>{field.value ? 'Ativa' : 'Inativa'}</FormLabel></div><FormMessage /></FormItem>} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Descrição da Vaga</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="short_summary" render={({ field }) => <FormItem><FormLabel>Resumo Curto da Vaga</FormLabel><FormControl><Textarea placeholder="Um resumo breve e atrativo da vaga." {...field} /></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="detailed_description" render={({ field }) => <FormItem><FormLabel>Descrição Detalhada</FormLabel><FormControl><ReactQuill theme="snow" value={field.value} onChange={field.onChange} className="bg-white" /></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="mandatory_requirements" render={({ field }) => <FormItem><FormLabel>Requisitos Obrigatórios</FormLabel><FormControl><Textarea placeholder="Liste os requisitos essenciais para a vaga." {...field} rows={5} /></FormControl><FormDescription>Insira um requisito por linha.</FormDescription><FormMessage /></FormItem>} />
            <FormField control={form.control} name="differential_requirements" render={({ field }) => <FormItem><FormLabel>Diferenciais da vaga</FormLabel><FormControl><Textarea placeholder="Liste os diferenciais que somarão pontos." {...field} rows={5} /></FormControl><FormDescription>Insira um diferencial por linha.</FormDescription><FormMessage /></FormItem>} />
            <FormField control={form.control} name="benefits" render={({ field }) => <FormItem><FormLabel>Benefícios da vaga</FormLabel><FormControl><Textarea placeholder="Liste os benefícios oferecidos." {...field} rows={5} /></FormControl><FormDescription>Insira um benefício por linha.</FormDescription><FormMessage /></FormItem>} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Configurações e Visibilidade</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="salary_min" render={({ field }) => <FormItem><FormLabel>Faixa Salarial (Mínimo)</FormLabel><FormControl><Input type="number" placeholder="Ex: 5500" {...field} /></FormControl><FormMessage /></FormItem>} />
              <FormField control={form.control} name="salary_max" render={({ field }) => <FormItem><FormLabel>Faixa Salarial (Máximo)</FormLabel><FormControl><Input type="number" placeholder="Ex: 7000" {...field} /></FormControl><FormMessage /></FormItem>} />
            </div>
            <FormField control={form.control} name="hashtags" render={({ field }) => <FormItem><FormLabel>Hashtags</FormLabel><FormControl><Input placeholder="react, typescript, nodejs" {...field} /></FormControl><FormDescription>Separe as hashtags por vírgula.</FormDescription><FormMessage /></FormItem>} />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={() => navigate('/connect/jobs')} disabled={isLoading}>Cancelar</Button>
          <Button type="submit" disabled={isLoading} className="bg-sollux-red hover:bg-sollux-orange">{isLoading ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Criar Vaga')}</Button>
        </div>
      </form>
    </Form>
  );
};

export default JobFormPage;