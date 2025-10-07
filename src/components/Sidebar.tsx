import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { HeartPulse, Fingerprint, Link as LinkIcon, Settings, Box, Menu } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';


interface NavItemProps {
  icon: React.ElementType;
  label: string;
  to: string;
  isActive: boolean;
  onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon: Icon, label, to, isActive, onClick }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Link
        to={to}
        onClick={onClick}
        className={cn(
          "flex items-center justify-center h-12 w-12 rounded-lg transition-all duration-300",
          "text-sollux-white opacity-70 hover:opacity-100 hover:bg-sollux-red/10",
          isActive && "bg-sollux-red/20 opacity-100 border-l-4 border-sollux-red" // Estado ativo mais pronunciado
        )}
      >
        <Icon className="h-6 w-6" />
      </Link>
    </TooltipTrigger>
    <TooltipContent side="right" className="bg-sollux-black/70 text-sollux-white text-xs rounded-md px-2 py-1">
      {label}
    </TooltipContent>
  </Tooltip>
);

const Sidebar: React.FC = () => {
  const isMobile = useIsMobile();
  const [activeApp, setActiveApp] = useState('ID'); // Default active app to ID for CompaniesPage
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const navItems = [
    { icon: HeartPulse, label: 'PULSE', to: '/pulse' },
    { icon: Fingerprint, label: 'ID', to: '/id' },
    { icon: LinkIcon, label: 'CONNECT', to: '/connect' },
    { icon: Settings, label: 'OPS', to: '/ops' },
    { icon: Box, label: 'CORE', to: '/core' },
  ];

  const handleNavItemClick = (label: string) => {
    setActiveApp(label);
    if (isMobile) {
      setIsSheetOpen(false);
    }
  };

  const sidebarContent = (
    <div className="flex flex-col items-center justify-between h-full py-4 bg-sollux-black">
      <div className="flex flex-col space-y-4">
        {navItems.map((item) => (
          <NavItem
            key={item.label}
            icon={item.icon}
            label={item.label}
            to={item.to}
            isActive={activeApp === item.label}
            onClick={() => handleNavItemClick(item.label)}
          />
        ))}
      </div>
      <div className="text-sollux-gray text-xs font-semibold tracking-widest uppercase pb-4"> {/* Estilo ajustado */}
        SOLLUX
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50 bg-sollux-black text-sollux-white">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-20 bg-sollux-black border-none">
          {sidebarContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-20 bg-sollux-black z-40">
      {sidebarContent}
    </aside>
  );
};

export default Sidebar;