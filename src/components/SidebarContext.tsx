import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SidebarContextType {
  isExpanded: boolean;
  toggleSidebar: () => void;
  sidebarWidthClass: string;
  sidebarOffsetClass: string;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isExpanded, setIsExpanded] = useState(false); // Começa recolhida
  const toggleSidebar = () => setIsExpanded((prev) => !prev);

  const sidebarWidthClass = isExpanded ? 'w-64' : 'w-20';
  const sidebarOffsetClass = isExpanded ? 'ml-64' : 'ml-20'; // Offset para o conteúdo principal

  return (
    <SidebarContext.Provider value={{ isExpanded, toggleSidebar, sidebarWidthClass, sidebarOffsetClass }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};