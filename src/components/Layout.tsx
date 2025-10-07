import React from 'react';
import Topbar from './Topbar';
import Sidebar from './Sidebar';
import Footer from './Footer';
import { useIsMobile } from '@/hooks/use-mobile';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Topbar */}
      <Topbar />
      
      <div className="flex flex-1 pt-16"> {/* pt-16 para compensar a topbar fixa */}
        {/* Sidebar - apenas em desktop */}
        {!isMobile && (
          <aside className="w-64 bg-white border-r border-gray-200 shadow-sm">
            <Sidebar />
          </aside>
        )}
        
        {/* Conteúdo principal */}
        <main className="flex-1 p-6">
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