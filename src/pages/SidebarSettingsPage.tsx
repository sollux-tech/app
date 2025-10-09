import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import { showSuccess, showError } from '@/utils/toast';
import { SidebarConfig, SidebarNavItem, SidebarNavItemFormData } from '@/types/sidebar';
import { getIcon } from '@/lib/icons';
import SidebarItemFormDialog from '@/components/SidebarItemFormDialog';
import { v4 as uuidv4 } from 'uuid';

const SidebarSettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SidebarNavItem | null>(null);
  const [logoUrl, setLogoUrl] = useState('');

  const { data: sidebarConfig, isLoading, error } = useQuery<SidebarConfig, Error>({
    queryKey: ['sidebarConfig', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('Usuário não autenticado.');
      const { data, error } = await supabase
        .from('sidebar_configs')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    onSuccess: (data) => {
      setLogoUrl(data.logo_url || '');
    },
  });

  const sortedNavItems = useMemo(() => {
    return sidebarConfig?.nav_items.sort((a, b) => a.order - b.order) || [];
  }, [sidebarConfig]);

  const updateConfigMutation = useMutation({
    mutationFn: async (updatedConfig: Partial<SidebarConfig>) => {
      if (!sidebarConfig) throw new Error('Configuração não encontrada.');
      const { data, error } = await supabase
        .from('sidebar_configs')
        .update(updatedConfig)
        .eq('id', sidebarConfig.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sidebarConfig', user?.id] });
      showSuccess('Configuração salva com sucesso!');
      setIsDialogOpen(false);
      setEditingItem(null);
    },
    onError: (err: Error) => {
      showError(`Erro ao salvar: ${err.message}`);
    },
  });

  const handleSaveLogo = () => {
    updateConfigMutation.mutate({ logo_url: logoUrl });
  };

  const handleFormSubmit = (formData: SidebarNavItemFormData) => {
    if (!sidebarConfig) return;
    let updatedItems: SidebarNavItem[];

    if (editingItem) {
      // Edit existing item
      updatedItems = sidebarConfig.nav_items.map(item =>
        item.id === editingItem.id ? { ...item, ...formData } : item
      );
    } else {
      // Add new item
      const newItem: SidebarNavItem = { ...formData, id: uuidv4() };
      updatedItems = [...sidebarConfig.nav_items, newItem];
    }
    updateConfigMutation.mutate({ nav_items: updatedItems });
  };

  const handleDeleteItem = (itemId: string) => {
    if (!sidebarConfig) return;
    if (window.confirm('Tem certeza que deseja excluir este item?')) {
      const updatedItems = sidebarConfig.nav_items.filter(item => item.id !== itemId);
      updateConfigMutation.mutate({ nav_items: updatedItems });
    }
  };

  if (isLoading) return <div>Carregando configurações...</div>;
  if (error) return <div className="text-red-500">Erro: {error.message}</div>;

  return (
    <div className="space-y-6">
      <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="text-sollux-black uppercase font-bold">Configurações da Logo</CardTitle>
          <CardDescription>Insira a URL da imagem para a logo da barra lateral.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Input
            placeholder="https://exemplo.com/logo.png"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            className="rounded-lg"
          />
          <Button onClick={handleSaveLogo} disabled={updateConfigMutation.isPending} className="rounded-lg bg-sollux-red hover:bg-sollux-orange">
            <Save className="mr-2 h-4 w-4" /> Salvar Logo
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sollux-black uppercase font-bold">Itens de Navegação</CardTitle>
          <Button onClick={() => { setEditingItem(null); setIsDialogOpen(true); }} className="bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg">
            <Plus className="mr-2 h-4 w-4" /> Adicionar Item
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-sollux-black">Ordem</TableHead>
                <TableHead className="text-sollux-black">Ícone</TableHead>
                <TableHead className="text-sollux-black">Nome</TableHead>
                <TableHead className="text-sollux-black">Caminho</TableHead>
                <TableHead className="text-right text-sollux-black">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedNavItems.map((item) => {
                const Icon = getIcon(item.icon);
                return (
                  <TableRow key={item.id}>
                    <TableCell>{item.order}</TableCell>
                    <TableCell><Icon className="h-5 w-5" /></TableCell>
                    <TableCell className="font-medium">{item.label}</TableCell>
                    <TableCell>{item.to}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => { setEditingItem(item); setIsDialogOpen(true); }} className="mr-2 rounded-lg">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteItem(item.id)} className="rounded-lg">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <SidebarItemFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleFormSubmit}
        item={editingItem}
        isLoading={updateConfigMutation.isPending}
      />
    </div>
  );
};

export default SidebarSettingsPage;