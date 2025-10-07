import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HeartPulse, Fingerprint, Link as LinkIcon, Settings, Box, Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useSidebar } from './SidebarContext'; // Importar useSidebar

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  to: string;
  isActive: boolean;
  isExpanded: boolean; // Adicionado prop para controlar a expansão
  onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon: Icon, label, to, isActive, isExpanded, onClick }) => (
  <Tooltip delayDuration={0}> {/* Delay 0 para tooltips */}
    <TooltipTrigger asChild>
      <Link
        to={to}
        onClick={onClick}
        className={cn(
          "flex items-center h-12 rounded-xl transition-all duration-300",
          "text-sollux-white opacity-70 hover:opacity-100 hover:bg-white/10",
          isActive && "bg-white/15 opacity-100 shadow-md",
          isExpanded ? "justify-start px-4 w-full" : "justify-center w-12"
        )}
      >
        <Icon className="h-6 w-6" />
        {isExpanded && <span className="ml-3 text-sm font-medium">{label}</span>}
      </Link>
    </TooltipTrigger>
    {!isExpanded && ( // Mostrar tooltip apenas quando recolhido
      <TooltipContent side="right" className="bg-sollux-black/70 text-sollux-white text-xs rounded-md px-2 py-1">
        {label}
      </TooltipContent>
    )}
  </Tooltip>
);

const Sidebar: React.FC = () => {
  const isMobile = useIsMobile();
  const { isExpanded, toggleSidebar, sidebarWidthClass } = useSidebar(); // Usar o contexto da sidebar
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { icon: HeartPulse, label: 'PULSE', to: '/pulse' },
    { icon: Fingerprint, label: 'ID', to: '/id' },
    { icon: LinkIcon, label: 'CONNECT', to: '/connect' },
    { icon: Settings, label: 'OPS', to: '/ops' },
    { icon: Box, label: 'CORE', to: '/core' },
  ];

  const handleNavItemClick = () => {
    if (isMobile) {
      setIsSheetOpen(false);
    }
  };

  const sidebarContent = (
    <div className="flex flex-col items-center justify-between h-full py-6">
      {/* SOLLUX Logo */}
      <div className={cn("flex items-center mb-8", isExpanded ? "justify-start px-4 w-full" : "justify-center w-12")}>
        <Link to="/" className="flex items-center">
          <span className="text-3xl font-extrabold text-sollux-red tracking-wide">S</span>
          {isExpanded && <span className="ml-2 text-xl font-extrabold text-sollux-red tracking-wide">OLLUX</span>}
        </Link>
      </div>

      <div className="flex flex-col space-y-4 flex-1 w-full px-2"> {/* Adicionado px-2 para espaçamento interno */}
        {navItems.map((item) => (
          <NavItem
            key={item.label}
            icon={item.icon}
            label={item.label}
            to={item.to}
            isActive={location.pathname.startsWith(item.to)}
            isExpanded={isExpanded}
            onClick={handleNavItemClick}
          />
        ))}
      </div>

      {/* Botão de expandir/recolher */}
      <div className={cn("mt-auto w-full", isExpanded ? "px-4" : "flex justify-center")}>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className={cn(
            "text-sollux-white opacity-70 hover:opacity-100 hover:bg-white/10 rounded-xl",
            isExpanded ? "w-full justify-end" : "w-12"
          )}
        >
          {isExpanded ? <ChevronLeft className="h-6 w-6" /> : <ChevronRight className="h-6 w-6" />}
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50 bg-sollux-dark-gray text-sollux-white rounded-xl">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64 bg-sollux-dark-gray border-none rounded-r-3xl shadow-lg"> {/* Largura fixa para mobile */}
          {sidebarContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside className={cn(
      "fixed left-4 top-4 h-[calc(100vh-2rem)] bg-sollux-dark-gray z-40 rounded-3xl shadow-lg transition-all duration-300",
      sidebarWidthClass // Usar a classe de largura do contexto
    )}>
      {sidebarContent}
    </aside>
  );
};

export default Sidebar;