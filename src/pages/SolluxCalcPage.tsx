import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Calculator, DollarSign, Percent, TrendingUp, Copy, Share2, Edit, Trash2, Eye, Plus, BarChart2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { Calculation, CalculationFormData, PriceComposition } from '@/types/calculation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

// Schema de validação para o formulário
const formSchema = z.object({
  product_name: z.string().min(1, { message: 'O nome do produto/serviço é obrigatório.' }),
  unit_cost: z.coerce.number().positive({ message: 'Custo total unitário deve ser um número positivo.' }),
  fixed_expenses_percentage: z.coerce.number().min(0, { message: 'Despesas fixas devem ser >= 0.' }).max(100, { message: 'Despesas fixas devem ser <= 100.' }),
  taxes_percentage: z.coerce.number().min(0, { message: 'Impostos devem ser >= 0.' }).max(100, { message: 'Impostos devem ser <= 100.' }),
  commission_percentage: z.coerce.number().min(0, { message: 'Comissão deve ser >= 0.' }).max(100, { message: 'Comissão deve ser <= 100.' }).optional().nullable(),
  desired_margin_percentage: z.coerce.number().min(0, { message: 'Margem de lucro deve ser >= 0.' }).max(100, { message: 'Margem de lucro deve ser <= 100.' }),
}).refine(data => {
  const totalPercentage = (data.fixed_expenses_percentage || 0) + (data.taxes_percentage || 0) + (data.commission_percentage || 0) + (data.desired_margin_percentage || 0);
  return totalPercentage < 100;
}, {
  message: "A soma das despesas, impostos, comissão e margem não pode ser 100% ou mais do preço de venda.",
  path: ["desired_margin_percentage"], // Pode ser qualquer campo que contribua para a soma
});

// Lógica do cálculo
const calculatePricing = (data: z.infer<typeof formSchema>) => {
  const unitCost = data.unit_cost;
  const fixedExpenses = data.fixed_expenses_percentage / 100;
  const taxes = data.taxes_percentage / 100;
  const commission = (data.commission_percentage || 0) / 100;
  const desiredMargin = data.desired_margin_percentage / 100;

  const divisor = 1 - (fixedExpenses + taxes + commission + desiredMargin);

  if (divisor <= 0) {
    return {
      sellingPrice: 0,
      netMargin: 0,
      netProfit: 0,
      composition: [],
      error: "A soma das despesas, impostos, comissão e margem é muito alta. Ajuste os valores."
    };
  }

  const sellingPrice = unitCost / divisor;
  const netProfit = sellingPrice * desiredMargin;
  const netMargin = (netProfit / sellingPrice) * 100;

  const fixedExpensesValue = sellingPrice * fixedExpenses;
  const taxesValue = sellingPrice * taxes;
  const commissionValue = sellingPrice * commission;

  const composition: PriceComposition[] = [
    { name: 'Custo Total Unitário', value: unitCost, percentage: (unitCost / sellingPrice) * 100, color: '#E53935' }, // Sollux Red
    { name: 'Despesas Fixas Rateadas', value: fixedExpensesValue, percentage: fixedExpenses * 100, color: '#FB8C00' }, // Sollux Orange
    { name: 'Impostos', value: taxesValue, percentage: taxes * 100, color: '#42A5F5' }, // Blue
    { name: 'Comissão', value: commissionValue, percentage: commission * 100, color: '#66BB6A' }, // Green
    { name: 'Lucro Líquido', value: netProfit, percentage: desiredMargin * 100, color: '#9C27B0' }, // Purple
  ].filter(item => item.value > 0); // Filtra itens com valor zero para não aparecer no gráfico

  return {
    sellingPrice,
    netMargin,
    netProfit,
    composition,
    error: null
  };
};

const SolluxCalcPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const [calculationResult, setCalculationResult] = useState<{
    sellingPrice: number;
    netMargin: number;
    netProfit: number;
    composition: PriceComposition[];
    error: string | null;
  } | null>(null);
  const [isResultPanelVisible, setIsResultPanelVisible] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [calculationToShare, setCalculationToShare] = useState<Calculation | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [calculationToView, setCalculationToView] = useState<Calculation | null>(null);
  const [isScenarioDialogOpen, setIsScenarioDialogOpen] = useState(false);
  const [scenarios, setScenarios] = useState<Array<z.infer<typeof formSchema> & { id: string; result: any }>>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      product_name: '',
      unit_cost: undefined,
      fixed_expenses_percentage: undefined,
      taxes_percentage: undefined,
      commission_percentage: undefined,
      desired_margin_percentage: undefined,
    },
  });

  const { data: savedCalculations, isLoading: isLoadingCalculations } = useQuery<Calculation[], Error>({
    queryKey: ['calculations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('calculations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const saveCalculationMutation = useMutation({
    mutationFn: async (data: CalculationFormData & { calculated_selling_price: number; calculated_net_margin: number; calculated_net_profit: number }) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { error } = await supabase
        .from('calculations')
        .insert({ ...data, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calculations', user?.id] });
      showSuccess('Cálculo salvo com sucesso!');
    },
    onError: (error) => {
      showError(`Erro ao salvar cálculo: ${error.message}`);
    },
  });

  const updateCalculationMutation = useMutation({
    mutationFn: async (data: Partial<Calculation> & { id: string }) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { error } = await supabase
        .from('calculations')
        .update(data)
        .eq('id', data.id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calculations', user?.id] });
      showSuccess('Cálculo atualizado com sucesso!');
    },
    onError: (error) => {
      showError(`Erro ao atualizar cálculo: ${error.message}`);
    },
  });

  const deleteCalculationMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { error, count } = await supabase
        .from('calculations')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) {
        throw error;
      }
      
      if (count === 0) {
        // Se nenhuma linha foi excluída, significa que o ID não existia ou o user_id não correspondia
        throw new Error("Cálculo não encontrado ou você não tem permissão para excluí-lo.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calculations', user?.id] });
      showSuccess('Cálculo excluído com sucesso!');
    },
    onError: (error) => {
      showError(`Erro ao excluir cálculo: ${error.message}`);
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    const result = calculatePricing(data);
    setCalculationResult(result);
    setIsResultPanelVisible(true);
    if (result.error) {
      showError(result.error);
    }
  };

  const handleSaveCalculation = async () => {
    if (!calculationResult || calculationResult.error) {
      showError("Não há um cálculo válido para salvar.");
      return;
    }
    const formData = form.getValues();
    await saveCalculationMutation.mutateAsync({
      product_name: formData.product_name,
      unit_cost: Number(formData.unit_cost),
      fixed_expenses_percentage: Number(formData.fixed_expenses_percentage),
      taxes_percentage: Number(formData.taxes_percentage),
      commission_percentage: formData.commission_percentage ? Number(formData.commission_percentage) : null,
      desired_margin_percentage: Number(formData.desired_margin_percentage),
      calculated_selling_price: calculationResult.sellingPrice,
      calculated_net_margin: calculationResult.netMargin,
      calculated_net_profit: calculationResult.netProfit,
    });
  };

  const handleViewCalculation = (calc: Calculation) => {
    setCalculationToView(calc);
    setIsViewDialogOpen(true);
  };

  const handleEditCalculation = (calc: Calculation) => {
    form.reset({
      product_name: calc.product_name,
      unit_cost: calc.unit_cost,
      fixed_expenses_percentage: calc.fixed_expenses_percentage,
      taxes_percentage: calc.taxes_percentage,
      commission_percentage: calc.commission_percentage || undefined, // Corrigido para undefined
      desired_margin_percentage: calc.desired_margin_percentage,
    });
    const result = calculatePricing({
      product_name: calc.product_name,
      unit_cost: calc.unit_cost,
      fixed_expenses_percentage: calc.fixed_expenses_percentage,
      taxes_percentage: calc.taxes_percentage,
      commission_percentage: calc.commission_percentage || undefined, // Corrigido para undefined
      desired_margin_percentage: calc.desired_margin_percentage,
    });
    setCalculationResult(result);
    setIsResultPanelVisible(true);
    // For simplicity, we're not directly updating the DB on form submit here,
    // but a dedicated "Update" button could be added to the form.
    showSuccess("Dados carregados no formulário para edição.");
  };

  const handleDuplicateCalculation = (calc: Calculation) => {
    form.reset({
      product_name: `${calc.product_name} (Cópia)`,
      unit_cost: calc.unit_cost,
      fixed_expenses_percentage: calc.fixed_expenses_percentage,
      taxes_percentage: calc.taxes_percentage,
      commission_percentage: calc.commission_percentage || undefined, // Corrigido para undefined
      desired_margin_percentage: calc.desired_margin_percentage,
    });
    const result = calculatePricing({
      product_name: `${calc.product_name} (Cópia)`,
      unit_cost: calc.unit_cost,
      fixed_expenses_percentage: calc.fixed_expenses_percentage,
      taxes_percentage: calc.taxes_percentage,
      commission_percentage: calc.commission_percentage || undefined, // Corrigido para undefined
      desired_margin_percentage: calc.desired_margin_percentage,
    });
    setCalculationResult(result);
    setIsResultPanelVisible(true);
    showSuccess("Cálculo duplicado no formulário. Clique em 'Calcular' e 'Salvar' para persistir.");
  };

  const handleDeleteCalculation = (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este cálculo?')) {
      return;
    }
    deleteCalculationMutation.mutate(id);
  };

  const handleShareCalculation = (calc: Calculation) => {
    setCalculationToShare(calc);
    setIsShareDialogOpen(true);
  };

  const handleCopyShareLink = async () => {
    if (!calculationToShare) return;
    const shareUrl = `${window.location.origin}/connect/calc/view/${calculationToShare.id}`; // Exemplo de URL de compartilhamento
    try {
      await navigator.clipboard.writeText(shareUrl);
      showSuccess('Link de compartilhamento copiado!');
      setIsShareDialogOpen(false);
    } catch (error) {
      showError('Erro ao copiar link.');
    }
  };

  const handleAddScenario = () => {
    const currentFormData = form.getValues();
    const result = calculatePricing(currentFormData);
    if (result.error) {
      showError(result.error);
      return;
    }
    setScenarios(prev => [...prev, { ...currentFormData, id: `scenario_${prev.length + 1}`, result }]);
    setIsScenarioDialogOpen(true);
  };

  const handleRemoveScenario = (id: string) => {
    setScenarios(prev => prev.filter(s => s.id !== id));
  };

  const isCalculating = form.formState.isSubmitting;
  const isSaving = saveCalculationMutation.isPending;
  const isUpdating = updateCalculationMutation.isPending;
  const isDeleting = deleteCalculationMutation.isPending;

  return (
    <div className="space-y-6">
      <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Calculator className="h-8 w-8 text-sollux-red" />
            <div>
              <CardTitle className="text-sollux-black uppercase font-bold">SOLLUX CALC™</CardTitle>
              <CardDescription className="text-gray-600">
                Calcule o preço ideal de venda e simule cenários de rentabilidade.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="product_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sollux-black">Nome do Produto/Serviço</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Kit Ferramentas 12 peças" {...field} className="rounded-lg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sollux-black">Custo Total Unitário (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="Ex: 120,00" {...field} className="rounded-lg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fixed_expenses_percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sollux-black">Despesas Fixas Rateadas (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="Ex: 12,00" {...field} className="rounded-lg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="taxes_percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sollux-black">Impostos (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="Ex: 8,00" {...field} className="rounded-lg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="commission_percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sollux-black">Comissão (%) (Opcional)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="Ex: 5,00" {...field} className="rounded-lg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="desired_margin_percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sollux-black">Margem de Lucro Desejada (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="Ex: 40,00" {...field} className="rounded-lg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={isCalculating} className="rounded-lg bg-sollux-red hover:bg-sollux-orange">
                  {isCalculating ? 'Calculando...' : 'Calcular'}
                </Button>
                <Button type="button" variant="outline" onClick={handleSaveCalculation} disabled={!calculationResult || !!calculationResult.error || isSaving} className="rounded-lg">
                  {isSaving ? 'Salvando...' : 'Salvar Cálculo'}
                </Button>
                <Button type="button" variant="outline" onClick={handleAddScenario} disabled={!calculationResult || !!calculationResult.error} className="rounded-lg">
                  <BarChart2 className="mr-2 h-4 w-4" /> Simular Cenário
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {isResultPanelVisible && calculationResult && !calculationResult.error && (
        <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl animate-in fade-in slide-in-from-top-4 duration-300">
          <CardHeader>
            <CardTitle className="text-sollux-black uppercase font-bold">Resultado do Cálculo</CardTitle>
            <CardDescription className="text-gray-600">
              Preço ideal de venda para "{form.getValues('product_name')}"
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sollux-black">
                <DollarSign className="h-6 w-6 text-sollux-red" />
                <span className="text-xl font-semibold">Preço de venda ideal:</span>
                <span className="text-2xl font-bold text-sollux-red">
                  R$ {calculationResult.sellingPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sollux-black">
                <Percent className="h-6 w-6 text-sollux-orange" />
                <span className="text-xl font-semibold">Margem líquida:</span>
                <span className="text-2xl font-bold text-sollux-orange">
                  {calculationResult.netMargin.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                </span>
              </div>
              <div className="flex items-center gap-2 text-sollux-black">
                <TrendingUp className="h-6 w-6 text-sollux-black" />
                <span className="text-xl font-semibold">Lucro líquido por unidade:</span>
                <span className="text-2xl font-bold text-sollux-black">
                  R$ {calculationResult.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={calculationResult.composition}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                  >
                    {calculationResult.composition.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value: number, name: string, props: any) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, `${name} (${props.payload.percentage.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%)`]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="text-sollux-black uppercase font-bold">Meus Cálculos Salvos</CardTitle>
          <CardDescription className="text-gray-600">
            Visualize, edite ou exclua seus cálculos de precificação.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingCalculations ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : savedCalculations && savedCalculations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-sollux-black">Produto/Serviço</TableHead>
                  <TableHead className="text-sollux-black">Preço Venda</TableHead>
                  <TableHead className="text-sollux-black">Margem Líquida</TableHead>
                  <TableHead className="text-sollux-black">Criado em</TableHead>
                  <TableHead className="text-right text-sollux-black">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {savedCalculations.map((calc) => (
                  <TableRow key={calc.id}>
                    <TableCell className="font-medium text-sollux-black">{calc.product_name}</TableCell>
                    <TableCell className="text-gray-700">
                      {calc.calculated_selling_price?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'N/A'}
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {calc.calculated_net_margin?.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) || 'N/A'}%
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {format(new Date(calc.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right flex justify-end items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleViewCalculation(calc)} disabled={isDeleting} title="Visualizar">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDuplicateCalculation(calc)} disabled={isDeleting} title="Duplicar">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleShareCalculation(calc)} disabled={isDeleting} title="Compartilhar">
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEditCalculation(calc)} disabled={isDeleting} title="Alterar">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteCalculation(calc.id)} disabled={isDeleting} title="Excluir">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-gray-500 py-4">Nenhum cálculo salvo ainda. Faça um cálculo e clique em "Salvar Cálculo".</p>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Compartilhamento */}
      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg border border-sollux-card-border">
          <DialogHeader>
            <DialogTitle className="text-sollux-black">Compartilhar Cálculo</DialogTitle>
            <DialogDescription className="text-gray-600">
              Compartilhe o cálculo "{calculationToShare?.product_name}".
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center space-x-2">
              <Input readOnly value={`${window.location.origin}/connect/calc/view/${calculationToShare?.id}`} className="flex-1 rounded-lg" />
              <Button onClick={handleCopyShareLink} className="rounded-lg bg-sollux-red hover:bg-sollux-orange">
                <Copy className="h-4 w-4 mr-2" /> Copiar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Visualização de Cálculo */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-2xl bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg border border-sollux-card-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sollux-black">Detalhes do Cálculo</DialogTitle>
            <DialogDescription className="text-gray-600">
              Informações detalhadas para "{calculationToView?.product_name}"
            </DialogDescription>
          </DialogHeader>
          {calculationToView && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Nome do Produto/Serviço:</p>
                  <p className="text-sollux-black font-semibold">{calculationToView.product_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Custo Total Unitário:</p>
                  <p className="text-sollux-black font-semibold">R$ {calculationToView.unit_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Despesas Fixas Rateadas:</p>
                  <p className="text-sollux-black font-semibold">{calculationToView.fixed_expenses_percentage}%</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Impostos:</p>
                  <p className="text-sollux-black font-semibold">{calculationToView.taxes_percentage}%</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Comissão:</p>
                  <p className="text-sollux-black font-semibold">{calculationToView.commission_percentage || 0}%</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Margem de Lucro Desejada:</p>
                  <p className="text-sollux-black font-semibold">{calculationToView.desired_margin_percentage}%</p>
                </div>
              </div>
              <div className="border-t border-gray-200 pt-4 mt-4 space-y-2">
                <h4 className="text-lg font-semibold text-sollux-black">Resultados:</h4>
                <p className="flex items-center gap-2 text-sollux-red">
                  <DollarSign className="h-5 w-5" />
                  <span className="font-semibold">Preço de venda ideal:</span> R$ {calculationToView.calculated_selling_price?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="flex items-center gap-2 text-sollux-orange">
                  <Percent className="h-5 w-5" />
                  <span className="font-semibold">Margem líquida:</span> {calculationToView.calculated_net_margin?.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                </p>
                <p className="flex items-center gap-2 text-sollux-black">
                  <TrendingUp className="h-5 w-5" />
                  <span className="font-semibold">Lucro líquido por unidade:</span> R$ {calculationToView.calculated_net_profit?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)} className="rounded-lg">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Simulação de Cenários */}
      <Dialog open={isScenarioDialogOpen} onOpenChange={setIsScenarioDialogOpen}>
        <DialogContent className="sm:max-w-4xl bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg border border-sollux-card-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sollux-black">Simulação de Cenários</DialogTitle>
            <DialogDescription className="text-gray-600">
              Compare diferentes configurações para o seu produto/serviço.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {scenarios.length === 0 ? (
              <p className="text-center text-gray-500">Adicione um cenário clicando em "Simular Cenário" no formulário principal.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {scenarios.map((scenario, index) => (
                  <Card key={scenario.id} className="bg-white/50 border border-gray-200 shadow-sm rounded-lg p-4">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-lg font-bold text-sollux-black">Cenário {index + 1}: {scenario.product_name}</CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveScenario(scenario.id)} className="text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-gray-700">Custo: R$ {Number(scenario.unit_cost).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      <p className="text-sm text-gray-700">Despesas Fixas: {Number(scenario.fixed_expenses_percentage)}%</p>
                      <p className="text-sm text-gray-700">Impostos: {Number(scenario.taxes_percentage)}%</p>
                      <p className="text-sm text-gray-700">Comissão: {Number(scenario.commission_percentage || 0)}%</p>
                      <p className="text-sm text-gray-700">Margem Desejada: {Number(scenario.desired_margin_percentage)}%</p>
                      
                      {scenario.result && !scenario.result.error ? (
                        <div className="mt-4 space-y-1">
                          <p className="text-sollux-red font-semibold">Preço de Venda: R$ {scenario.result.sellingPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          <p className="text-sollux-orange font-semibold">Margem Líquida: {scenario.result.netMargin.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</p>
                          <p className="text-sollux-black font-semibold">Lucro Líquido: R$ {scenario.result.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          <div className="h-48 w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={scenario.result.composition}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  outerRadius={60}
                                  fill="#8884d8"
                                  dataKey="value"
                                  nameKey="name"
                                >
                                  {scenario.result.composition.map((entry: PriceComposition, idx: number) => (
                                    <Cell key={`cell-${idx}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <RechartsTooltip formatter={(value: number, name: string, props: any) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, `${name} (${props.payload.percentage.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%)`]} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      ) : (
                        <p className="text-red-500 text-sm mt-2">Erro no cálculo do cenário.</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsScenarioDialogOpen(false)} className="rounded-lg">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SolluxCalcPage;