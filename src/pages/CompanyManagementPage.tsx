import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/components/CompanyContext';
import { showSuccess, showError } from '@/utils/toast'; // Importando as funções de toast corretas

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
        showError('Erro ao carregar empresas.'); // Usando showError
        console.error('Erro ao carregar empresas:', error);
      } else {
        setCompanies(data || []);
      }
    }
  };

  const handleAddCompany = async () => {
    if (!newCompanyName.trim()) {
      showError('O nome da empresa não pode ser vazio.'); // Usando showError
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showError('Usuário não autenticado.'); // Usando showError
      return;
    }

    const { data, error } = await supabase
      .from('companies')
      .insert([{ name: newCompanyName, user_id: user.id }])
      .select();

    if (error) {
      showError('Erro ao adicionar empresa.'); // Usando showError
      console.error('Erro ao adicionar empresa:', error);
    } else if (data && data.length > 0) {
      setCompanies([...companies, data[0]]);
      setNewCompanyName('');
      setIsAddCompanyDialogOpen(false);
      showSuccess('Empresa adicionada com sucesso!'); // Usando showSuccess
    }
  };

  const handleEditCompany = async () => {
    if (!currentCompany || !currentCompany.name.trim()) {
      showError('O nome da empresa não pode ser vazio.'); // Usando showError
      return;
    }

    const { error } = await supabase
      .from('companies')
      .update({ name: currentCompany.name })
      .eq('id', currentCompany.id);

    if (error) {
      showError('Erro ao atualizar empresa.'); // Usando showError
      console.error('Erro ao atualizar empresa:', error);
    } else {
      setCompanies(companies.map(comp => comp.id === currentCompany.id ? currentCompany : comp));
      setIsEditDialogOpen(false);
      setCurrentCompany(null);
      showSuccess('Empresa atualizada com sucesso!'); // Usando showSuccess
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
      showError('Erro ao excluir empresa.'); // Usando showError
      console.error('Erro ao excluir empresa:', error);
    } else {
      setCompanies(companies.filter(comp => comp.id !== companyId));
      setSelectedCompany(null); // Limpa a empresa selecionada se ela for excluída
      showSuccess('Empresa excluída com sucesso!'); // Usando showSuccess
    }
  };

  const openEditDialog = (company: Company) => {
    setCurrentCompany(company);
    setIsEditDialogOpen(true);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-sollux-gray p-4">
      <Card className="w-full max-w-4xl bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg p-6 text-center border border-sollux-card-border">
        <CardHeader>
          <CardTitle className="text-4xl font-bold mb-4 text-sollux-black">Gerenciar Empresas</CardTitle>
          <p className="text-xl text-gray-600">
            Crie, edite e exclua as empresas associadas à sua conta.
          </p>
        </CardHeader>
        <CardContent className="mt-8">
          <div className="flex justify-end mb-6">
            <Button onClick={() => setIsAddCompanyDialogOpen(true)} className="bg-sollux-red hover:bg-sollux-red/90 text-white">
              <Plus className="mr-2 h-4 w-4" /> Adicionar Empresa
            </Button>
          </div>

          {/* Campo de busca - REMOVIDO */}
          {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl p-4 flex items-center">
              <Search className="h-5 w-5 text-gray-400 mr-3" />
              <Input placeholder="Buscar empresa..." className="flex-1 border-none bg-transparent focus-visible:ring-0 text-sollux-black" />
            </Card>
          </div> */}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.length === 0 ? (
              <p className="text-gray-500 col-span-full">Nenhuma empresa encontrada. Adicione uma nova empresa para começar.</p>
            ) : (
              companies.map((company) => (
                <Card key={company.id} className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl p-4 flex flex-col justify-between">
                  <CardTitle className="text-xl font-semibold text-sollux-black mb-2">{company.name}</CardTitle>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" size="icon" onClick={() => openEditDialog(company)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => handleDeleteCompany(company.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog para adicionar empresa */}
      <Dialog open={isAddCompanyDialogOpen} onOpenChange={setIsAddCompanyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Nova Empresa</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="companyName" className="text-right">
                Nome
              </Label>
              <Input
                id="companyName"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddCompanyDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddCompany}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para editar empresa */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Empresa</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="editCompanyName" className="text-right">
                Nome
              </Label>
              <Input
                id="editCompanyName"
                value={currentCompany?.name || ''}
                onChange={(e) => setCurrentCompany(currentCompany ? { ...currentCompany, name: e.target.value } : null)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleEditCompany}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CompanyManagementPage;