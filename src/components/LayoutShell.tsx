import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import Footer from './Footer'; // Import the new Footer component
import { useIsMobile } from '@/hooks/use-mobile';

interface LayoutShellProps {
  children: React.ReactNode;
}

const LayoutShell: React.FC<LayoutShellProps> = ({ children }) => {
  const isMobile = useIsMobile();

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Topbar />
        <main className={`flex-1 p-4 transition-all duration-300 mt-16 ${isMobile ? 'ml-0' : 'ml-20'}`}>
          {children}
        </main>
        <Footer /> {/* Add the Footer here */}
      </div>
    </div>
  );
};

export default LayoutShell;