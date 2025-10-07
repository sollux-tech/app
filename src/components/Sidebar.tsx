import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { HeartPulse, Fingerprint, Link as LinkIcon, Settings, Cube } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

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
          "text-white opacity-70 hover:opacity-100 hover:bg-[#E53935]/10",
          isActive && "border-l-4 border-[#E53935] opacity-100"
        )}
      >
        <Icon className="h-6 w-6" />
      </Link>
    </TooltipTrigger>
    <TooltipContent side="right" className="bg-black/70 text-white text-xs rounded-md px-2 py-1">
      {label}
    </TooltipContent>
  </Tooltip>
);

const Sidebar: React.FC = () => {
  const isMobile = useIsMobile();
  const [activeApp, setActiveApp] = useState('PULSE'); // Default active app
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const navItems = [
    { icon: HeartPulse, label: 'PULSE', to: '/pulse' },
    { icon: Fingerprint, label: 'ID', to: '/id' },
    { icon: LinkIcon, label: 'CONNECT', to: '/connect' },
    { icon: Settings, label: 'OPS', to: '/ops' },
    { icon: Cube, label: 'CORE', to: '/core' },
  ];

  const handleNavItemClick = (label: string) => {
    setActiveApp(label);
    if (isMobile) {
      setIsSheetOpen(false);
    }
  };

  const sidebarContent = (
    <div className="flex flex-col items-center justify-between h-full py-4 bg-[#212121]">
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
      <div className="text-[#9E9E9E] text-xs font-light tracking-widest uppercase">
        SOLLUX
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50 bg-gray-800 text-white">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-20 bg-[#212121] border-none">
          {sidebarContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-20 bg-[#212121] z-40">
      {sidebarContent}
    </aside>
  );
};

export default Sidebar;