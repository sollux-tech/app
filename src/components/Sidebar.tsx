import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  HeartPulse, 
  Fingerprint, 
  Link as LinkIcon, 
  Settings, 
  Box,
  ChevronRight,
  User,
  X 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SheetClose } from '@/components/ui/sheet';

interface NavItem {
  icon: React.ElementType;
  label: string;
  to: string;
}

const navItems: NavItem[] = [
  // { icon: Home, label: 'Dashboard', to: '/' }, // Removido o link do Dashboard
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
    <div className="h-full py-6 flex flex-col bg-sollux-dark-gray text-white relative">
      {isMobileSheet && (
        <SheetClose asChild>
          <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-gray-300 hover:bg-gray-700 rounded-lg">
            <X className="h-5 w-5" />
          </Button>
        </SheetClose>
      )}

      {/* Navegação */}
      <nav className="space-y-1 px-3 flex-1 mt-8">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;
          
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onLinkClick}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200",
                "text-gray-300 hover:text-white hover:bg-gray-700",
                isActive && "bg-sollux-red text-white font-semibold"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-sm font-medium">{item.label}</span>
              {isActive && (
                <ChevronRight className="h-4 w-4 ml-auto text-white" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Seção de usuário */}
      <div className="px-6 mt-auto">
        <div className="border-t border-gray-700 pt-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-gray-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">Usuário</p>
              <p className="text-xs text-gray-400 truncate">admin@sollux.com</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;