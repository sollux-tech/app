import React, { useState, useEffect } from 'react';
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
import { KpiSmartLiberated, KpiSmartLiberatedFormData } from '@/types/kpiSmartLiberated';
import { KpiSmart } from '@/types/kpiSmart';
import { Pillar } from '@/types/pillar'; // Importar Pillar
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom'; // Importar useNavigate

const formSchema = z.object({
  kpi_smart_id: z.string().min(1, { message: 'O KPI Smart é obrigatório.' }),
});

const KpiSmartLiberatedManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const navigate = useNavigate(); // Inicializar useNavigate

  const { data: kpiSmartsLiberated, isLoading: isLoadingKpiSmartsLiberated, error: errorKpiSmartsLiberated } = useQuery<KpiSmartLiberated[], Error>({
    queryKey: ['kpiSmartsLiberated', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('kpi_smarts_liberated')
        .select(`
          *,
          kpi_smarts(description, kpi_smart_types(description), kpi_smart_focuses(description), kpi_smart_units(description)),
          kpi_smart_frequencies(description)
        `)
        .eq('user_id', user.id)
        .order('code', { ascending: true });
      if (error) throw error;
      return data.map(item => ({
        ...item,
        kpi_smarts: Array.isArray(item.kpi_smarts) ? item.kpi_smarts[0] : item.kpi_smarts,
        kpi_smart_frequencies: Array.isArray(item.kpi_smart_frequencies) ? item.kpi_smart_frequencies[0] : item.kpi_smart_frequencies,
      }));
    },
    enabled: !!user?.id,
  });

  const deleteKpiSmartLiberatedMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { error, count } = await supabase
        .from('kpi_smarts_liberated')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) {
        throw error;
      }
      if (count === 0) {
        throw new Error("KPI Smart liberado não encontrado ou você não tem permissão para excluí-lo.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpiSmartsLiberated', user?.id] });
      showSuccess('KPI Smart liberado excluído com sucesso!');
    },
    onError: (error: Error) => {
      showError(`Erro: ${error.message}`);
    },
  });

  const handleAddClick = () => {
    navigate('/ops/shift/kpi-smarts-liberated/new');
  };

  const handleEditClick = (kpiSmartLiberated: KpiSmartLiberated) => {
    navigate(`/ops/shift/kpi-smarts-liberated/${kpiSmartLiberated.id}`);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este KPI Smart liberado?')) {
      deleteKpiSmartLiberatedMutation.mutate(id);
    }
  };

  const isMutating = deleteKpiSmartLiberatedMutation.isPending;
  const isLoadingPage = isLoadingKpiSmartsLiberated;

  if (isLoadingPage) {
    return <div className="text-center text-muted-foreground">Carregando KPIs Smart liberados...</div>;
  }

  if (errorKpiSmartsLiberated) {
    return <div className="text-center text-destructive">Erro ao carregar KPIs Smart liberados: {errorKpiSmartsLiberated.message}</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground uppercase font-bold">Gerenciar KPIs Smart Liberados</CardTitle>
          <Button onClick={handleAddClick} className="bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg">
            <Plus className="mr-2 h-4 w-4" /> Liberar KPI Smart
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-foreground">Código</TableHead>
                <TableHead className="text-foreground">KPI Smart</TableHead>
                <TableHead className="text-foreground">Tipo</TableHead>
                <TableHead className="text-foreground">Foco</TableHead>
                <TableHead className="text-foreground">Unidade</TableHead>
                <TableHead className="text-foreground">Frequência</TableHead>
                <TableHead className="text-right text-foreground">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kpiSmartsLiberated?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Nenhum KPI Smart liberado encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                kpiSmartsLiberated?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-foreground">{item.code}</TableCell>
                    <TableCell className="text-muted-foreground">{item.kpi_smarts?.description || 'N/A'}</TableCell>
                    <TableCell className="text-muted-foreground">{item.kpi_smarts?.kpi_smart_types?.description || 'N/A'}</TableCell>
                    <TableCell className="text-muted-foreground">{item.kpi_smarts?.kpi_smart_focuses?.description || 'N/A'}</TableCell>
                    <TableCell className="text-muted-foreground">{item.kpi_smarts?.kpi_smart_units?.description || 'N/A'}</TableCell>
                    <TableCell className="text-muted-foreground">{item.kpi_smart_frequencies?.description || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(item)}
                        className="mr-2 text-foreground hover:bg-accent rounded-lg"
                        disabled={isMutating}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick(item.id)}
                        className="bg-sollux-red hover:bg-red-700 text-white rounded-lg"
                        disabled={isMutating}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default KpiSmartLiberatedManagementPage;