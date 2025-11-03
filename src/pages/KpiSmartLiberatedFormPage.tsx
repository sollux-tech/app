import DatePicker from '@/components/DatePicker';
import { format } from 'date-fns'; // <-- Corrected import
import { ptBR } from 'date-fns/locale';
```
</dyad-file>

<dyad-write path="src/pages/KpiSmartAcquiredManagementPage.tsx" description="Fixing TypeScript errors related to form schema and default values.">
```typescript
// Correcting defaultValues and form reset for pillar_id
const formSchema = z.object({
  pillar_id: z.string().min(1, { message: 'O Pilar é obrigatório.' }), // Novo campo para o formulário
  kpi_smart_id: z.string().min(1, { message: 'O KPI Smart é obrigatório.' }),
  status: z.boolean().default(true),
});

// ...

  useEffect(() => {
    if (editingKpiSmartAcquired) {
      form.reset({
        pillar_id: editingKpiSmartAcquired.pillar_id || '', // Added pillar_id to reset
        kpi_smart_id: editingKpiSmartAcquired.kpi_smart_id,
        status: editingKpiSmartAcquired.status === 'active',
      });
    } else {
      form.reset({
        pillar_id: '', // Added pillar_id to reset
        kpi_smart_id: '',
        status: true,
      });
    }
  }, [editingKpiSmartAcquired, form, isDialogOpen]);

// ...

  const onSubmit = (data: KpiSmartAcquiredFormData) => {
    if (editingKpiSmartAcquired) {
      updateKpiSmartAcquiredMutation.mutate(data);
    } else {
      createKpiSmartAcquiredMutation.mutate(data);
    }
  };

// ...

  const createKpiSmartAcquiredMutation = useMutation({
    mutationFn: async (data: KpiSmartAcquiredFormData) => {
      if (!user?.id || !selectedCompany?.id) throw new Error("Usuário ou empresa não selecionada.");
      const { data: newKpiSmartAcquired, error } = await supabase
        .from('kpi_smarts_acquired')
        .insert({
          pillar_id: data.pillar_id, // Added pillar_id
          kpi_smart_id: data.kpi_smart_id,
          status: data.status ? 'active' : 'inactive',
          user_id: user.id,
          company_id: selectedCompany.id,
        })
        .select()
        .single();
      if (error) throw error;
      return newKpiSmartAcquired;
    },
    // ...mutationOptions, // Removed duplicate mutationOptions
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpiSmartsAcquired', user?.id, selectedCompany?.id] });
      showSuccess('KPI Smart Adquirido com sucesso!');
      setIsDialogOpen(false);
      setEditingKpiSmartAcquired(null);
    },
    onError: (error: Error) => {
      showError(`Erro: ${error.message}`);
    },
  });

  const updateKpiSmartAcquiredMutation = useMutation({
    mutationFn: async (data: KpiSmartAcquiredFormData) => {
      if (!editingKpiSmartAcquired?.id) throw new Error("ID do KPI Smart Adquirido está faltando.");
      if (!user?.id || !selectedCompany?.id) throw new Error("Usuário ou empresa não selecionada.");
      const { data: updatedKpiSmartAcquired, error } = await supabase
        .from('kpi_smarts_acquired')
        .update({
          pillar_id: data.pillar_id, // Added pillar_id
          kpi_smart_id: data.kpi_smart_id,
          status: data.status ? 'active' : 'inactive',
        })
        .eq('id', editingKpiSmartAcquired.id)
        .eq('user_id', user.id)
        .eq('company_id', selectedCompany.id)
        .select()
        .single();
      if (error) throw error;
      return updatedKpiSmartAcquired;
    },
    // ...mutationOptions, // Removed duplicate mutationOptions
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpiSmartsAcquired', user?.id, selectedCompany?.id] });
      showSuccess('KPI Smart Adquirido atualizado com sucesso!');
      setIsDialogOpen(false);
      setEditingKpiSmartAcquired(null);
    },
    onError: (error: Error) => {
      showError(`Erro: ${error.message}`);
    },
  });

// ... rest of the file
```
</dyad-file>

<dyad-write path="src/pages/KpiSmartAcquiredManagementPage.tsx" description="Fixing TypeScript errors related to form schema and default values.">
```typescript
// Correcting form schema and default values for pillar_id
const formSchema = z.object({
  pillar_id: z.string().min(1, { message: 'O Pilar é obrigatório.' }), // Novo campo para o formulário
  kpi_smart_id: z.string().min(1, { message: 'O KPI Smart é obrigatório.' }),
  status: z.boolean().default(true),
});

// ...

  useEffect(() => {
    if (editingKpiSmartAcquired) {
      // Ao editar, precisamos buscar o pilar do KPI Smart original
      const fetchKpiSmartPillar = async () => {
        const { data: kpiSmartData, error } = await supabase
          .from('kpi_smarts')
          .select('pillar_id')
          .eq('id', editingKpiSmartAcquired.kpi_smart_id)
          .single();
        if (error) {
          console.error("Erro ao buscar pilar do KPI Smart:", error);
          return;
        }
        form.reset({
          pillar_id: kpiSmartData?.pillar_id || '', // Use pillar_id from fetched kpiSmartData
          kpi_smart_id: editingKpiSmartAcquired.kpi_smart_id,
          status: editingKpiSmartAcquired.status === 'active',
        });
      };
      fetchKpiSmartPillar();
    } else {
      form.reset({
        pillar_id: '', // Valor padrão para o novo campo
        kpi_smart_id: '',
        status: true,
      });
    }
  }, [editingKpiSmartAcquired, form, isDialogOpen]);

// ...

  const onSubmit = (data: KpiSmartAcquiredFormData) => {
    if (editingKpiSmartAcquired) {
      updateKpiSmartAcquiredMutation.mutate(data);
    } else {
      createKpiSmartAcquiredMutation.mutate(data);
    }
  };

// ...

  const createKpiSmartAcquiredMutation = useMutation({
    mutationFn: async (data: KpiSmartAcquiredFormData) => {
      if (!user?.id || !selectedCompany?.id) throw new Error("Usuário ou empresa não selecionada.");
      const { data: newKpiSmartAcquired, error } = await supabase
        .from('kpi_smarts_acquired')
        .insert({
          pillar_id: data.pillar_id, // Adicionado pillar_id
          kpi_smart_id: data.kpi_smart_id,
          status: data.status ? 'active' : 'inactive',
          user_id: user.id,
          company_id: selectedCompany.id,
        })
        .select()
        .single();
      if (error) throw error;
      return newKpiSmartAcquired;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpiSmartsAcquired', user?.id, selectedCompany?.id] });
      showSuccess('KPI Smart Adquirido com sucesso!');
      setIsDialogOpen(false);
      setEditingKpiSmartAcquired(null);
    },
    onError: (error: Error) => {
      showError(`Erro: ${error.message}`);
    },
  });

  const updateKpiSmartAcquiredMutation = useMutation({
    mutationFn: async (data: KpiSmartAcquiredFormData) => {
      if (!editingKpiSmartAcquired?.id) throw new Error("ID do KPI Smart Adquirido está faltando.");
      if (!user?.id || !selectedCompany?.id) throw new Error("Usuário ou empresa não selecionada.");
      const { data: updatedKpiSmartAcquired, error } = await supabase
        .from('kpi_smarts_acquired')
        .update({
          pillar_id: data.pillar_id, // Adicionado pillar_id
          kpi_smart_id: data.kpi_smart_id,
          status: data.status ? 'active' : 'inactive',
        })
        .eq('id', editingKpiSmartAcquired.id)
        .eq('user_id', user.id)
        .eq('company_id', selectedCompany.id)
        .select()
        .single();
      if (error) throw error;
      return updatedKpiSmartAcquired;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpiSmartsAcquired', user?.id, selectedCompany?.id] });
      showSuccess('KPI Smart Adquirido atualizado com sucesso!');
      setIsDialogOpen(false);
      setEditingKpiSmartAcquired(null);
    },
    onError: (error: Error) => {
      showError(`Erro: ${error.message}`);
    },
  });

// ... rest of the file