import React from 'react';
import { Menu, Bell, User, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile';

const Topbar: React.FC = () => {
  const isMobile = useIsMobile();

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 shadow-sm z-50">
      <div className="h-full px-4 flex items-center justify-between">
        {/* Logo e menu mobile */}
        <div className="flex items-center gap-4">
          {isMobile && (
            <Button variant="ghost" size="icon" className="text-gray-600">
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            {!isMobile && (
              <span className="text-xl font-semibold text-gray-900">SOLLUX</span>
            )}
          </div>
        </div>

        {/* Search bar - apenas em desktop */}
        {!isMobile && (
          <div className="flex-1 max-w-md mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar..."
                className="pl-10 bg-gray-100 border-none focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Ações do usuário */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-gray-600">
            <Bell className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-600">
            <User className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Topbar;