import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Company, CompanyFormData } from '@/types/company';
import { showSuccess, showError } from '@/utils/toast';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Market } from '@/types/market';

// Helper para converter string vazia para undefined para campos opcionais de número
const emptyStringToUndefined = z.preprocess(
  (val) => (val === "" ? undefined : val),
  z.any()
);

const formSchema = z.object({
  name: z.string().min(1, { message: 'O nome da empresa é obrigatório.' }),
  
  // Dados Básicos
  sector_market_id: z.string().min(1, { message: 'O setor/mercado é obrigatório.' }),
  annual_revenue_range: z.enum(['<R$1M', 'R$1-10M', 'R$10-50M', 'R$50M-R$200M', 'R$200M-R$500M', '>R$500M', ''], { message: 'Selecione uma faixa de faturamento.' }),
  num_employees_range: z.enum(['<10', '10-50', '50-200', '200-500', '500-1000', '>1000', ''], { message: 'Selecione uma faixa de funcionários.' }),
  time_in_market_years: emptyStringToUndefined.pipe(z.coerce.number().int().positive({ message: 'Tempo de mercado deve ser um número inteiro positivo.' }).optional()),

  // Análise Estratégica (campos de texto para arrays)
  strengths: z.string().optional(),
  weaknesses: z.string().optional(),
  opportunities: z.string().optional(),
  threats: z.string().optional(),

  // Desafios e Objetivos
  urgent_problem: z.string().optional(),
  main_goal: z.string().optional(),
  main_competitors: z.string().optional(),
  critical_success_factors: z.string().optional(),

  // Operações e Tomada de Decisão
  decision_making_process: z.string().optional(),
  tools_technologies: z.string().optional(),
  kpis_monitored: z.string().optional(),

  // Perspectivas Futuras
  business_model_changes: z.string().optional(),
  priority_investments: z.string().optional(),
});

const CompanyFormPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const navigate = useNavigate();
  const { id: companyId } = useParams<{ id: string }>();
  const isEditing = !!companyId;

  // Fetch markets for the select input
  const { data: markets, isLoading: isLoadingMarkets } = useQuery<Market[], Error>({
    queryKey: ['markets', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('markets')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: editingCompany, isLoading: isLoadingCompany } = useQuery<Company, Error>({
    queryKey: ['company', companyId],
    queryFn: async () => {
      if (!companyId) throw new Error("ID da empresa está faltando.");
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .eq('user_id', user?.id) // Garante que o usuário só edite suas próprias empresas
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isEditing && !!user?.id,
    retry: false, // Não tentar novamente em caso de erro, especialmente para 404/permissão
  });

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      sector_market_id: '',
      annual_revenue_range: '',
      num_employees_range: '',
      time_in_market_years: '',
      strengths: '',
      weaknesses: '',
      opportunities: '',
      threats: '',
      urgent_problem: '',
      main_goal: '',
      main_competitors: '',
      critical_success_factors: '',
      decision_making_process: '',
      tools_technologies: '',
      kpis_monitored: '',
      business_model_changes: '',
      priority_investments: '',
    },
  });

  // Helper para converter array de strings para texto multilinha
  const arrayToMultilineText = (arr: string[] | null | undefined) => arr?.join('\n') || '';
  // Helper para converter texto multilinha para array de strings
  const multilineTextToArray = (text: string | undefined) => text?.split('\n').map(s => s.trim()).filter(s => s !== '') || null;

  useEffect(() => {
    if (isEditing && editingCompany) {
      form.reset({
        name: editingCompany.name,
        sector_market_id: editingCompany.sector_market_id || '',
        annual_revenue_range: editingCompany.annual_revenue_range || '',
        num_employees_range: editingCompany.num_employees_range || '',
        time_in_market_years: editingCompany.time_in_market_years || '',
        strengths: arrayToMultilineText(editingCompany.strengths),
        weaknesses: arrayToMultilineText(editingCompany.weaknesses),
        opportunities: arrayToMultilineText(editingCompany.opportunities),
        threats: arrayToMultilineText(editingCompany.threats),
        urgent_problem: editingCompany.urgent_problem || '',
        main_goal: editingCompany.main_goal || '',
        main_competitors: arrayToMultilineText(editingCompany.main_competitors),
        critical_success_factors: arrayToMultilineText(editingCompany.critical_success_factors),
        decision_making_process: editingCompany.decision_making_process || '',
        tools_technologies: arrayToMultilineText(editingCompany.tools_technologies),
        kpis_monitored: arrayToMultilineText(editingCompany.kpis_monitored),
        business_model_changes: editingCompany.business_model_changes || '',
        priority_investments: arrayToMultilineText(editingCompany.priority_investments),
      });
    } else if (!isEditing) {
      form.reset({
        name: '',
        sector_market_id: '',
        annual_revenue_range: '',
        num_employees_range: '',
        time_in_market_years: '',
        strengths: '',
        weaknesses: '',
        opportunities: '',
        threats: '',
        urgent_problem: '',
        main_goal: '',
        main_competitors: '',
        critical_success_factors: '',
        decision_making_process: '',
        tools_technologies: '',
        kpis_monitored: '',
        business_model_changes: '',
        priority_investments: '',
      });
    }
  }, [isEditing, editingCompany, form]);

  const mutationOptions = {
    onSuccess: () => {
      // Invalida ambas as queries para atualizar a lista de gerenciamento e o seletor global
      queryClient.invalidateQueries({ queryKey: ['ownedCompanies', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['companies', user?.id] });
      navigate('/id/companies'); // Redireciona de volta para a lista de empresas
    },
    onError: (error: Error) => {
      showError(`Erro: ${error.message}`);
    },
  };

  const createCompanyMutation = useMutation({
    mutationFn: async (data: CompanyFormData) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const payload = {
        name: data.name,
        user_id: user.id,
        sector_market_id: data.sector_market_id || null,
        annual_revenue_range: data.annual_revenue_range || null,
        num_employees_range: data.num_employees_range || null,
        time_in_market_years: data.time_in_market_years ? Number(data.time_in_market_years) : null,
        strengths: multilineTextToArray(data.strengths),
        weaknesses: multilineTextToArray(data.weaknesses),
        opportunities: multilineTextToArray(data.opportunities),
        threats: multilineTextToArray(data.threats),
        urgent_problem: data.urgent_problem || null,
        main_goal: data.main_goal || null,
        main_competitors: multilineTextToArray(data.main_competitors),
        critical_success_factors: multilineTextToArray(data.critical_success_factors),
        decision_making_process: data.decision_making_process || null,
        tools_technologies: multilineTextToArray(data.tools_technologies),
        kpis_monitored: multilineTextToArray(data.kpis_monitored),
        business_model_changes: data.business_model_changes || null,
        priority_investments: multilineTextToArray(data.priority_investments),
      };
      const { data: newCompany, error } = await supabase
        .from('companies')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return newCompany;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Empresa criada com sucesso!');
    },
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async (data: CompanyFormData) => {
      if (!companyId) throw new Error("ID da empresa está faltando.");
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const payload = {
        name: data.name,
        sector_market_id: data.sector_market_id || null,
        annual_revenue_range: data.annual_revenue_range || null,
        num_employees_range: data.num_employees_range || null,
        time_in_market_years: data.time_in_market_years ? Number(data.time_in_market_years) : null,
        strengths: multilineTextToArray(data.strengths),
        weaknesses: multilineTextToArray(data.weaknesses),
        opportunities: multilineTextToArray(data.opportunities),
        threats: multilineTextToArray(data.threats),
        urgent_problem: data.urgent_problem || null,
        main_goal: data.main_goal || null,
        main_competitors: multilineTextToArray(data.main_competitors),
        critical_success_factors: multilineTextToArray(data.critical_success_factors),
        decision_making_process: data.decision_making_process || null,
        tools_technologies: multilineTextToArray(data.tools_technologies),
        kpis_monitored: multilineTextToArray(data.kpis_monitored),
        business_model_changes: data.business_model_changes || null,
        priority_investments: multilineTextToArray(data.priority_investments),
      };
      const { data: updatedCompany, error } = await supabase
        .from('companies')
        .update(payload)
        .eq('id', companyId)
        .eq('user_id', user.id) // Garante que o usuário só edite suas próprias empresas
        .select()
        .single();
      if (error) throw error;
      return updatedCompany;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Empresa atualizada com sucesso!');
    },
  });

  const onSubmit = (data: CompanyFormData) => {
    if (isEditing) {
      updateCompanyMutation.mutate(data);
    } else {
      createCompanyMutation.mutate(data);
    }
  };

  const isLoadingForm = createCompanyMutation.isPending || updateCompanyMutation.isPending || isLoadingCompany || isLoadingMarkets;

  if (isEditing && isLoadingCompany) {
    return <div className="text-center text-gray-600">Carregando empresa...</div>;
  }

  if (isEditing && !editingCompany && !isLoadingCompany) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Card className="w-full max-w-md bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg p-6 text-center border border-sollux-card-border">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-sollux-red">Empresa não encontrada</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">A empresa que você está tentando editar não existe ou você não tem permissão.</p>
            <Button onClick={() => navigate('/id/companies')} className="mt-4 rounded-lg bg-sollux-red hover:bg-sollux-orange">
              Voltar para Empresas
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <Card className="w-full max-w-4xl bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg p-6 text-center border border-sollux-card-border">
        <CardHeader>
          <CardTitle className="text-3xl font-bold mb-2 text-sollux-black">
            {isEditing ? 'Editar Empresa' : 'Criar Nova Empresa'}
          </CardTitle>
          <CardDescription className="text-lg text-gray-600">
            {isEditing ? 'Atualize os detalhes da sua empresa.' : 'Adicione uma nova empresa à sua conta com informações detalhadas.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Dados Básicos */}
              <Card className="bg-white/50 border border-gray-200 shadow-sm rounded-lg">
                <CardHeader><CardTitle className="text-xl text-sollux-black">Dados Básicos</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sollux-black">Nome da Empresa</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome da empresa" {...field} className="rounded-lg" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sector_market_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sollux-black">Setor/Mercado Principal de Atuação</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingMarkets}>
                          <FormControl>
                            <SelectTrigger className="rounded-lg">
                              <SelectValue placeholder="Selecione o setor/mercado" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoadingMarkets ? (
                              <SelectItem value="" disabled>Carregando mercados...</SelectItem>
                            ) : markets?.length === 0 ? (
                              <SelectItem value="" disabled>Nenhum mercado cadastrado</SelectItem>
                            ) : (
                              markets?.map((market) => (
                                <SelectItem key={market.id} value={market.id}>
                                  {market.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="annual_revenue_range"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sollux-black">Faturamento Anual Aproximado</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="rounded-lg">
                              <SelectValue placeholder="Selecione a faixa de faturamento" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="<R$1M">&lt; R$1M</SelectItem>
                            <SelectItem value="R$1-10M">R$1M - R$10M</SelectItem>
                            <SelectItem value="R$10-50M">R$10M - R$50M</SelectItem>
                            <SelectItem value="R$50M-R$200M">R$50M - R$200M</SelectItem>
                            <SelectItem value="R$200M-R$500M">R$200M - R$500M</SelectItem>
                            <SelectItem value=">R$500M">&gt; R$500M</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="num_employees_range"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sollux-black">Número de Funcionários</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="rounded-lg">
                              <SelectValue placeholder="Selecione a faixa de funcionários" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="<10">&lt; 10</SelectItem>
                            <SelectItem value="10-50">10 - 50</SelectItem>
                            <SelectItem value="50-200">50 - 200</SelectItem>
                            <SelectItem value="200-500">200 - 500</SelectItem>
                            <SelectItem value="500-1000">500 - 1000</SelectItem>
                            <SelectItem value=">1000">&gt; 1000</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="time_in_market_years"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sollux-black">Tempo de Mercado (anos de operação)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Ex: 5" {...field} className="rounded-lg" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Análise Estratégica */}
              <Card className="bg-white/50 border border-gray-200 shadow-sm rounded-lg">
                <CardHeader><CardTitle className="text-xl text-sollux-black">Análise Estratégica</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="strengths"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sollux-black">Principais Forças da Empresa</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Ex: Equipe qualificada, Tecnologia exclusiva (um por linha)" {...field} rows={4} className="rounded-lg" />
                        </FormControl>
                        <FormDescription>Liste um item por linha.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="weaknesses"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sollux-black">Maiores Fraquezas Atuais</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Ex: Falta de dados para decisões, Turnover alto (um por linha)" {...field} rows={4} className="rounded-lg" />
                        </FormControl>
                        <FormDescription>Liste um item por linha.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="opportunities"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sollux-black">Oportunidades Não Exploradas</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Ex: Mercado em crescimento, Parcerias potenciais (um por linha)" {...field} rows={4} className="rounded-lg" />
                        </FormControl>
                        <FormDescription>Liste um item por linha.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="threats"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sollux-black">Ameaças ou Riscos Externos</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Ex: Concorrência agressiva, Mudanças regulatórias (um por linha)" {...field} rows={4} className="rounded-lg" />
                        </FormControl>
                        <FormDescription>Liste um item por linha.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Desafios e Objetivos */}
              <Card className="bg-white/50 border border-gray-200 shadow-sm rounded-lg">
                <CardHeader><CardTitle className="text-xl text-sollux-black">Desafios e Objetivos</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="urgent_problem"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sollux-black">Problema/Dor Mais Urgente (próximo trimestre)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Descreva o problema mais crítico" {...field} rows={3} className="rounded-lg" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="main_goal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sollux-black">Meta Principal (próximos 12 meses)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Ex: Aumentar faturamento em 20%" {...field} rows={3} className="rounded-lg" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="main_competitors"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sollux-black">Principais Concorrentes (ou Referências do Setor)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Ex: Concorrente A, Concorrente B (um por linha)" {...field} rows={3} className="rounded-lg" />
                        </FormControl>
                        <FormDescription>Liste um item por linha.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="critical_success_factors"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sollux-black">Fatores Críticos de Sucesso no seu Mercado</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Ex: Atendimento rápido, Preço competitivo (um por linha)" {...field} rows={3} className="rounded-lg" />
                        </FormControl>
                        <FormDescription>Liste um item por linha.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Operações e Tomada de Decisão */}
              <Card className="bg-white/50 border border-gray-200 shadow-sm rounded-lg">
                <CardHeader><CardTitle className="text-xl text-sollux-black">Operações e Tomada de Decisão</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="decision_making_process"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sollux-black">Como as decisões estratégicas são tomadas hoje?</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Ex: Baseadas em dados, Intuição, Consultoria" {...field} rows={3} className="rounded-lg" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tools_technologies"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sollux-black">Ferramentas/Tecnologias Usadas Atualmente</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Ex: CRM, ERP, Planilhas (um por linha)" {...field} rows={4} className="rounded-lg" />
                        </FormControl>
                        <FormDescription>Liste um item por linha.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="kpis_monitored"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sollux-black">Indicadores-Chave Monitorados (KPIs)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Ex: Taxa de conversão, Custo de aquisição (um por linha)" {...field} rows={4} className="rounded-lg" />
                        </FormControl>
                        <FormDescription>Liste um item por linha.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Perspectivas Futuras */}
              <Card className="bg-white/50 border border-gray-200 shadow-sm rounded-lg">
                <CardHeader><CardTitle className="text-xl text-sollux-black">Perspectivas Futuras</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="business_model_changes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sollux-black">Mudanças Previstas no Modelo de Negócios (próximos 2 anos)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Descreva as mudanças esperadas" {...field} rows={3} className="rounded-lg" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="priority_investments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sollux-black">Investimentos Prioritários</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Ex: Marketing, Treinamento, Tecnologia (um por linha)" {...field} rows={4} className="rounded-lg" />
                        </FormControl>
                        <FormDescription>Liste um item por linha.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/id/companies')}
                  disabled={isLoadingForm}
                  className="rounded-lg"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isLoadingForm}
                  className="rounded-lg bg-sollux-red hover:bg-sollux-orange"
                >
                  {isLoadingForm ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isEditing ? 'Salvando...' : 'Criando...'}
                    </>
                  ) : (
                    isEditing ? 'Salvar Alterações' : 'Criar Empresa'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanyFormPage;