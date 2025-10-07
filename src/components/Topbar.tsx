import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCompany } from './CompanyContext';
import { Skeleton } from '@/components/ui/skeleton';
import { LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';

const Topbar: React.FC = () => {
  const { companies, selectedCompany, setSelectedCompany, isLoadingCompanies } = useCompany();
  const navigate = useNavigate();

  const handleCompanyChange = (companyId: string) => {
    const company = companies.find((c) => c.id === companyId);
    if (company) {
      setSelectedCompany(company);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      showSuccess('Você foi desconectado com sucesso!');
      navigate('/login');
    } catch (error: any) {
      showError(`Erro ao desconectar: ${error.message}`);
    }
  };

  return (
    <header className="fixed top-0 left-20 right-0 h-16 bg-sollux-black text-sollux-white flex items-center justify-between px-6 shadow-md border-b border-gray-800 z-30">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-extrabold text-sollux-red tracking-wide">SOLLUX</h1>
        {isLoadingCompanies ? (
          <Skeleton className="w-48 h-10 bg-gray-700 rounded-md" />
        ) : (
          <Select onValueChange={handleCompanyChange} value={selectedCompany?.id || ''}>
            <SelectTrigger className="w-[200px] bg-gray-800 border-gray-700 text-sollux-white hover:border-sollux-orange focus:ring-sollux-orange">
              <SelectValue placeholder="Selecionar Empresa" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 text-sollux-white border-gray-700">
              {companies.length === 0 ? (
                <SelectItem value="no-company" disabled>Nenhuma empresa encontrada</SelectItem>
              ) : (
                companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        )}
      </div>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="text-sollux-white hover:bg-sollux-red/20">
          <User className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-sollux-white hover:bg-sollux-red/20" onClick={handleLogout}>
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
};

export default Topbar;