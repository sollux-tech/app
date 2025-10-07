import React, { useState } from 'react';
import { Menu, Bell, User, Search, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import Sidebar from './Sidebar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCompany } from './CompanyContext';
import { cn } from '@/lib/utils';
import { useLocation } from 'react-router-dom'; // Importar useLocation

interface TopbarProps {
  className?: string;
}

const Topbar: React.FC<TopbarProps> = ({ className }) => {
  const isMobile = useIsMobile();
  const { companies, selectedCompany, setSelectedCompany } = useCompany();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const location = useLocation();

  // Função para obter o título da página com base na rota
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/pulse':
        return 'PULSE';
      case '/id':
        return 'ID';
      case '/id/companies':
        return 'ID | EMPRESAS';
      case '/connect':
        return 'CONNECT';
      case '/ops':
        return 'OPS';
      case '/core':
        return 'CORE';
      default:
        return 'DASHBOARD';
    }
  };

  return (
    <header className={cn("fixed top-0 right-0 h-16 bg-white border-b border-gray-200 shadow-sm z-50", className)}> {/* Adicionado className aqui */}
      <div className="h-full px-4 flex items-center justify-between">
        {/* Logo e menu mobile (apenas para mobile) */}
        <div className="flex items-center gap-4">
          {isMobile && (
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-gray-600">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 bg-sollux-dark-gray border-r-0">
                <Sidebar isMobileSheet={true} onLinkClick={() => setIsSheetOpen(false)} />
              </SheetContent>
            </Sheet>
          )}
          
          {/* Título principal */}
          <div className="flex items-center gap-2">
            <span className="text-xl font-semibold text-sollux-black">SOLLUX FLOW</span>
            <span className="text-xl font-semibold text-sollux-red">| {getPageTitle()}</span>
          </div>
        </div>

        {/* Ações do usuário */}
        <div className="flex items-center gap-4">
          {/* Notificações com indicador vermelho */}
          <div className="relative">
            <div className="w-3 h-3 bg-sollux-red rounded-full absolute -top-1 -right-1 border-2 border-white"></div>
            <Button variant="ghost" size="icon" className="text-gray-600 hover:bg-gray-100 rounded-lg">
              <Bell className="h-5 w-5" />
            </Button>
          </div>

          {/* Perfil do usuário */}
          <div className="flex items-center gap-2 bg-gray-100 p-2 rounded-full pr-4">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-gray-600" />
            </div>
            <span className="text-sm font-medium text-sollux-black hidden md:block">Hello, Rodrigo</span>
            <span className="text-xs text-gray-500 hidden md:block">15 Maio</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;