import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  HeartPulse, 
  Fingerprint, 
  Link as LinkIcon, 
  Settings, 
  Box,
  Info, // Adicionado para o ícone de informação
  X 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SheetClose } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'; // Importando Tooltip

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

  return (
    <TooltipProvider>
      <div className="h-full py-6 flex flex-col bg-sollux-dark-gray text-white relative w-20"> {/* Largura fixa */}
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
            const isActive = location.pathname.startsWith(item.to) && item.to !== '/'; // Ajuste para rotas aninhadas
            
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
                    <Icon className="h-6 w-6" /> {/* Ícones maiores */}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-gray-800 text-white text-sm rounded-md px-3 py-1">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* Seção de informação na parte inferior */}
        <div className="px-2 mt-auto pt-4 border-t border-gray-700">
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