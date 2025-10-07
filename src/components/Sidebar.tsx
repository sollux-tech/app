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
  User // Adicionando importação do ícone User
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  icon: React.ElementType;
  label: string;
  to: string;
}

const navItems: NavItem[] = [
  { icon: Home, label: 'Dashboard', to: '/' },
  { icon: HeartPulse, label: 'PULSE', to: '/pulse' },
  { icon: Fingerprint, label: 'ID', to: '/id' },
  { icon: LinkIcon, label: 'CONNECT', to: '/connect' },
  { icon: Settings, label: 'OPS', to: '/ops' },
  { icon: Box, label: 'CORE', to: '/core' },
];

const Sidebar: React.FC = () => {
  const location = useLocation();

  return (
    <div className="h-full py-6">
      {/* Logo */}
      <div className="px-6 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">SOLLUX</h1>
            <p className="text-xs text-gray-500">Business Platform</p>
          </div>
        </div>
      </div>

      {/* Navegação */}
      <nav className="space-y-1 px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;
          
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200",
                "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
                isActive && "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-sm font-medium">{item.label}</span>
              {isActive && (
                <ChevronRight className="h-4 w-4 ml-auto text-blue-700" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Seção de usuário */}
      <div className="absolute bottom-6 left-0 right-0 px-6">
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">Usuário</p>
              <p className="text-xs text-gray-500 truncate">admin@sollux.com</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;