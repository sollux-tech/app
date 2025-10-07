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

const Topbar: React.FC = () => {
  const isMobile = useIsMobile();
  const { companies, selectedCompany, setSelectedCompany } = useCompany();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 shadow-sm z-50">
      <div className="h-full px-4 flex items-center justify-between">
        {/* Logo e menu mobile */}
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
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-sollux-red rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            {!isMobile && (
              <span className="text-xl font-semibold text-sollux-black">SOLLUX</span>
            )}
          </div>
        </div>

        {/* Seleção de Empresa e Search bar */}
        <div className={cn("flex-1 flex items-center gap-4", isMobile ? "justify-end" : "max-w-2xl mx-8")}>
          {!isMobile && (
            <div className="flex items-center gap-2 min-w-[200px]">
              <Building2 className="h-5 w-5 text-gray-500" />
              <Select
                value={selectedCompany?.id || ''}
                onValueChange={(companyId) => {
                  const company = companies.find(c => c.id === companyId);
                  setSelectedCompany(company || null);
                }}
                disabled={companies.length === 0}
              >
                <SelectTrigger className="w-full border-gray-200 bg-gray-50 hover:bg-gray-100 focus:ring-sollux-red rounded-lg">
                  <SelectValue placeholder="Selecionar Empresa" />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  {companies.length === 0 ? (
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
          )}

          {!isMobile && (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar..."
                className="pl-10 bg-gray-100 border-none focus:bg-white focus:ring-2 focus:ring-sollux-red rounded-lg"
              />
            </div>
          )}
        </div>

        {/* Ações do usuário */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-gray-600 hover:bg-gray-100 rounded-lg">
            <Bell className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-600 hover:bg-gray-100 rounded-lg">
            <User className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Topbar;