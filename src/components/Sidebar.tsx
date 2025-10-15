import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SheetClose } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCompany } from '@/components/CompanyContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from './SessionContextProvider';
import { SidebarConfig } from '@/types/sidebar';
import { getIcon } from '@/lib/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { getOrCreateSidebarConfig } from '@/data/sidebar';

interface SidebarProps {
  isMobileSheet?: boolean;
  onLinkClick?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isMobileSheet = false, onLinkClick }) => {
  const location = useLocation();
  const { companies, selectedCompany, setSelectedCompany, isLoadingCompanies } = useCompany();
  const { user } = useSession();

  const { data: sidebarConfig, isLoading: isLoadingConfig } = useQuery<SidebarConfig, Error>({
    queryKey: ['sidebarConfig', user?.id],
    queryFn: () => {
      if (!user?.id) throw new Error('Usuário não autenticado.');
      return getOrCreateSidebarConfig(user.id);
    },
    enabled: !!user?.id,
  });

  const navItems = useMemo(() => {
    return sidebarConfig?.nav_items.sort((a, b) => a.order - b.order) || [];
  }, [sidebarConfig]);

  const handleCompanyChange = (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    if (company) {
      setSelectedCompany(company);
    }
    if (onLinkClick) {
      onLinkClick();
    }
  };

  return (
    <TooltipProvider>
      <div className="h-full py-6 flex flex-col bg-sollux-dark-gray text-sollux-white relative w-20">
        {isMobileSheet && (
          <SheetClose asChild>
            <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg">
              <X className="h-5 w-5" />
            </Button>
          </SheetClose>
        )}

        <div className="flex items-center justify-center h-6 mb-4">
          {sidebarConfig?.logo_url ? (
            <img src={sidebarConfig.logo_url} alt="Logo" className="w-10 h-10 object-contain" />
          ) : (
            <div className="w-10 h-10 bg-sollux-red rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">S</span>
            </div>
          )}
        </div>

        <nav className="space-y-2 flex-1 px-2">
          {isLoadingConfig ? (
            Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="w-full h-12 rounded-lg bg-gray-700" />
            ))
          ) : (
            navItems.map((item) => {
              const Icon = getIcon(item.icon);
              const isActive = location.pathname.startsWith(item.to) && item.to !== '/';
              
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <Link
                      to={item.to}
                      onClick={onLinkClick}
                      className={cn(
                        "flex items-center justify-center w-full h-12 rounded-lg transition-all duration-200",
                        "text-muted-foreground hover:text-foreground hover:bg-accent",
                        isActive && "bg-sollux-red text-white font-semibold"
                      )}
                    >
                      <Icon className="h-6 w-6" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-popover text-popover-foreground text-sm rounded-md px-3 py-1">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            })
          )}
        </nav>

        <div className="px-2 mt-auto pt-4 border-t border-border"> {/* Alterado border-gray-700 para border-border */}
          <Select
            value={selectedCompany?.id || ''}
            onValueChange={handleCompanyChange}
            disabled={isLoadingCompanies || companies.length === 0}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <SelectTrigger className="w-full h-12 flex items-center justify-center bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg border-none focus:ring-0 focus:ring-offset-0">
                  <Building2 className="h-6 w-6" />
                </SelectTrigger>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-popover text-popover-foreground text-sm rounded-md px-3 py-1">
                {selectedCompany ? `Empresa: ${selectedCompany.name}` : 'Selecionar Empresa'}
              </TooltipContent>
            </Tooltip>
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
        </div>
      </div>
    </TooltipProvider>
  );
};

export default Sidebar;