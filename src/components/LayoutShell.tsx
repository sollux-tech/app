import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import Footer from './Footer';
import { useIsMobile } from '@/hooks/use-mobile';

interface LayoutShellProps {
  children: React.ReactNode;
}

const LayoutShell: React.FC<LayoutShellProps> = ({ children }) => {
  const isMobile = useIsMobile();

  return (
    <div className="flex flex-col min-h-screen bg-sollux-light-gray dark:bg-gray-900"> {/* Usando a nova cor de fundo */}
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Topbar />
        <main className={`flex-1 px-8 py-6 transition-all duration-300 mt-16 ${isMobile ? 'ml-0' : 'ml-20'}`}>
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default LayoutShell;