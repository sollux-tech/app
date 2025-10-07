import React from 'react';
import Sidebar from './Sidebar';
import { useIsMobile } from '@/hooks/use-mobile';

interface LayoutShellProps {
  children: React.ReactNode;
}

const LayoutShell: React.FC<LayoutShellProps> = ({ children }) => {
  const isMobile = useIsMobile();

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <main className={`flex-1 p-4 transition-all duration-300 ${isMobile ? 'ml-0' : 'ml-20'}`}>
        {children}
      </main>
    </div>
  );
};

export default LayoutShell;