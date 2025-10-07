import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  HeartPulse, 
  Fingerprint, 
  Link as LinkIcon, 
  Settings, 
  Box,
  Info, 
  X,
  Building2, // Importado para o seletor de empresa
  ChevronDown // Importado para o seletor de empresa
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SheetClose } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Importado para o seletor de empresa
import { useCompany } from '@/components/CompanyContext'; // Importado para o seletor de empresa

interface NavItem {
  icon: React.ElementType;
  label: string;
  to: string;
}

const navItems: NavItem[] = [
  { icon: HeartPulse, label: 'PULSE', to: '/pulse' },
  { icon: Fingerprint, label: 'ID', to: '/id' },
  { icon: LinkIcon, label: 'CONNECT', to: '/connect' },
  { icon: Settings, label: 'OPS', to: '/ops' },
  { icon: Box, label: 'CORE', to: '/core' },
];

interface SidebarProps {
  isMobileSheet?: boolean;
  onLinkClick?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isMobileSheet = false, onLinkClick }) => {
  const location = useLocation();
  const { companies, selectedCompany, setSelectedCompany, isLoadingCompanies } = useCompany();

  const handleCompanyChange = (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    if (company) {
      setSelectedCompany(company);
    }
    if (onLinkClick) {
      onLinkClick(); // Fechar o sheet mobile se estiver aberto
    }
  };

  return (
    <TooltipProvider>
      <div className="h-full py-6 flex flex-col bg-sollux-dark-gray text-white relative w-20">
        {isMobileSheet && (
          <SheetClose asChild>
            <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-gray-300 hover:bg-gray-700 rounded-lg">
              <X className="h-5 w-5" />
            </Button>
          </SheetClose>
        )}

        {/* Logo no topo da sidebar */}
        <div className="flex items-center justify-center h-16 mb-6">
          <div className="w-10 h-10 bg-sollux-red rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">S</span>
          </div>
        </div>

        {/* Navegação */}
        <nav className="space-y-2 flex-1 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.to) && item.to !== '/';
            
            return (
              <Tooltip key={item.to}>
                <TooltipTrigger asChild>
                  <Link
                    to={item.to}
                    onClick={onLinkClick}
                    className={cn(
                      "flex items-center justify-center w-full h-12 rounded-lg transition-all duration-200",
                      "text-gray-300 hover:text-white hover:bg-gray-700",
                      isActive && "bg-sollux-red text-white font-semibold"
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-gray-800 text-white text-sm rounded-md px-3 py-1">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* Seletor de Empresa - Movido para a parte inferior */}
        <div className="px-2 mt-auto pt-4 border-t border-gray-700"> {/* Adicionado mt-auto para empurrar para baixo */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Select
                value={selectedCompany?.id || ''}
                onValueChange={handleCompanyChange}
                disabled={isLoadingCompanies || companies.length === 0}
              >
                <SelectTrigger className="w-full h-12 flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg border-none focus:ring-0 focus:ring-offset-0">
                  <Building2 className="h-6 w-6" />
                  <ChevronDown className="h-4 w-4 opacity-50 ml-1" />
                </SelectTrigger>
                <SelectContent className="bg-sollux-card-bg backdrop-blur-md rounded-lg shadow-lg border border-sollux-card-border">
                  {isLoadingCompanies ? (
                    <SelectItem value="loading" disabled>Carregando empresas...</SelectItem>
                  ) : companies.length === 0 ? (
                    <SelectItem value="no-companies" disabled>Nenhuma empresa</SelectItem>
                  ) : (
                    companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-gray-800 text-white text-sm rounded-md px-3 py-1">
              {selectedCompany ? `Empresa: ${selectedCompany.name}` : 'Selecionar Empresa'}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Seção de informação na parte inferior */}
        <div className="px-2 pt-2"> {/* Ajustado o padding superior */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="w-full h-12 text-gray-300 hover:bg-gray-700 rounded-lg">
                <Info className="h-6 w-6" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-gray-800 text-white text-sm rounded-md px-3 py-1">
              Informações
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default Sidebar;