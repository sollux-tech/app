import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/components/CompanyContext';
import { showSuccess, showError } from '@/utils/toast';
import CompanyCard from '@/components/CompanyCard'; // Importando o CompanyCard

interface Company {
  id: string;
  name: string;
  user_id: string;
}

const CompanyManagementPage: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [isAddCompanyDialogOpen, setIsAddCompanyDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const { setSelectedCompany } = useCompany();

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        showError('Erro ao carregar empresas.');
        console.error('Erro ao carregar empresas:', error);
      } else {
        setCompanies(data || []);
      }
    }
  };

  const handleAddCompany = async () => {
    if (!newCompanyName.trim()) {
      showError('O nome da empresa não pode ser vazio.');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showError('Usuário não autenticado.');
      return;
    }

    const { data, error } = await supabase
      .from('companies')
      .insert([{ name: newCompanyName, user_id: user.id }])
      .select();

    if (error) {
      showError('Erro ao adicionar empresa.');
      console.error('Erro ao adicionar empresa:', error);
    } else if (data && data.length > 0) {
      setCompanies([...companies, data[0]]);
      setNewCompanyName('');
      setIsAddCompanyDialogOpen(false);
      showSuccess('Empresa adicionada com sucesso!');
    }
  };

  const handleEditCompany = async () => {
    if (!currentCompany || !currentCompany.name.trim()) {
      showError('O nome da empresa não pode ser vazio.');
      return;
    }

    const { error } = await supabase
      .from('companies')
      .update({ name: currentCompany.name })
      .eq('id', currentCompany.id);

    if (error) {
      showError('Erro ao atualizar empresa.');
      console.error('Erro ao atualizar empresa:', error);
    } else {
      setCompanies(companies.map(comp => comp.id === currentCompany.id ? currentCompany : comp));
      setIsEditDialogOpen(false);
      setCurrentCompany(null);
      showSuccess('Empresa atualizada com sucesso!');
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta empresa?')) {
      return;
    }

    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', companyId);

    if (error) {
      showError('Erro ao excluir empresa.');
      console.error('Erro ao excluir empresa:', error);
    } else {
      setCompanies(companies.filter(comp => comp.id !== companyId));
      setSelectedCompany(null); // Limpa a empresa selecionada se ela for excluída
      showSuccess('Empresa excluída com sucesso!');
    }
  };

  const openEditDialog = (company: Company) => {
    setCurrentCompany(company);
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Main Content - Lista de Empresas */}
      <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sollux-black uppercase font-bold">Minhas Empresas</CardTitle>
          <Button onClick={() => setIsAddCompanyDialogOpen(true)} className="bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg">
            <Plus className="mr-2 h-4 w-4" /> Adicionar Empresa
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.length === 0 ? (
              <p className="text-gray-500 col-span-full text-center">Nenhuma empresa encontrada. Adicione uma nova empresa para começar.</p>
            ) : (
              companies.map((company) => (
                <CompanyCard
                  key={company.id}
                  company={company}
                  onEdit={openEditDialog}
                  onDelete={handleDeleteCompany}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog para adicionar empresa */}
      <Dialog open={isAddCompanyDialogOpen} onOpenChange={setIsAddCompanyDialogOpen}>
        <DialogContent className="sm:max-w-[425px]"> {/* Removidas as classes de estilo personalizadas */}
          <DialogHeader>
            <DialogTitle className="text-sollux-black">Adicionar Nova Empresa</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="companyName" className="text-right text-sollux-black">
                Nome
              </Label>
              <Input
                id="companyName"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                className="col-span-3 rounded-lg"
              />
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsAddCompanyDialogOpen(false)} className="rounded-lg">Cancelar</Button>
            <Button type="button" onClick={handleAddCompany} className="rounded-lg bg-sollux-red hover:bg-sollux-orange">Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para editar empresa */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]"> {/* Removidas as classes de estilo personalizadas */}
          <DialogHeader>
            <DialogTitle className="text-sollux-black">Editar Empresa</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="editCompanyName" className="text-right text-sollux-black">
                Nome
              </Label>
              <Input
                id="editCompanyName"
                value={currentCompany?.name || ''}
                onChange={(e) => setCurrentCompany(currentCompany ? { ...currentCompany, name: e.target.value } : null)}
                className="col-span-3 rounded-lg"
              />
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} className="rounded-lg">Cancelar</Button>
            <Button type="button" onClick={handleEditCompany} className="rounded-lg bg-sollux-red hover:bg-sollux-orange">Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompanyManagementPage;