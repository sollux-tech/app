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
import { useIsMobile } from '@/hooks/use-mobile';
import { useSidebar } from './SidebarContext'; // Importar useSidebar

const Topbar: React.FC = () => {
  const { companies, selectedCompany, setSelectedCompany, isLoadingCompanies } = useCompany();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { sidebarOffsetClass } = useSidebar(); // Usar o contexto da sidebar

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
    <header className={cn(
      `fixed top-4 h-16 bg-sollux-card-bg backdrop-blur-md text-sollux-black flex items-center justify-between px-6 shadow-md border border-sollux-card-border z-30 rounded-xl transition-all duration-300 right-4`,
      isMobile ? 'left-4' : sidebarOffsetClass // Usar sidebarOffsetClass
    )}>
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-extrabold text-sollux-red tracking-wide">SOLLUX</h1>
        {isLoadingCompanies ? (
          <Skeleton className="w-48 h-10 bg-gray-200 rounded-md" /> /* Ajustado cor do skeleton */
        ) : (
          <Select onValueChange={handleCompanyChange} value={selectedCompany?.id || ''}>
            <SelectTrigger className="w-[200px] bg-white/50 border-gray-300 text-sollux-black hover:border-sollux-orange focus:ring-sollux-orange rounded-lg"> {/* Estilo do select */}
              <SelectValue placeholder="Selecionar Empresa" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200 text-sollux-black rounded-lg shadow-lg"> {/* Estilo do select content */}
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
        <Button variant="ghost" size="icon" className="text-sollux-black hover:bg-sollux-red/10 rounded-lg"> {/* Botões mais suaves */}
          <User className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-sollux-black hover:bg-sollux-red/10 rounded-lg" onClick={handleLogout}>
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
};

export default Topbar;