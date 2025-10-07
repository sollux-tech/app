import React from 'react';
import Topbar from './Topbar';
import Sidebar from './Sidebar';
import Footer from './Footer';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-sollux-light-gray flex flex-col">
      {/* Topbar */}
      <Topbar className={cn(!isMobile && "left-20")} /> {/* Ajusta a posição da topbar */}
      
      <div className="flex flex-1 pt-16"> {/* pt-16 para compensar a topbar fixa */}
        {/* Sidebar - apenas em desktop */}
        {!isMobile && (
          <aside className="w-20 bg-sollux-dark-gray border-r border-gray-200 shadow-sm fixed left-0 top-0 h-full z-60"> {/* z-60 para sobrepor a topbar, removido pt-16 */}
            <Sidebar />
          </aside>
        )}
        
        {/* Conteúdo principal */}
        <main className={cn("flex-1 p-6", !isMobile && "ml-20")}> {/* ml-20 para compensar a sidebar fixa */}
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Layout;