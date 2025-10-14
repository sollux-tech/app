import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from './SessionContextProvider';
import { Company } from '@/types/company';
import { showSuccess, showError } from '@/utils/toast';

interface CompanyContextType {
  companies: Company[];
  selectedCompany: Company | null;
  setSelectedCompany: (company: Company | null) => void;
  isLoadingCompanies: boolean;
  errorCompanies: Error | null;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isLoading: isSessionLoading } = useSession();
  const [selectedCompany, setSelectedCompanyState] = useState<Company | null>(null);

  const { data: companies, isLoading: isCompaniesLoading, error: errorCompanies } = useQuery<Company[], Error>({
    queryKey: ['companies', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      // Usando a nova VIEW segura que combina empresas próprias e compartilhadas.
      const { data, error } = await supabase
        .from('user_accessible_companies')
        .select('*');
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !isSessionLoading,
  });

  useEffect(() => {
    if (companies && companies.length > 0 && !selectedCompany) {
      // Try to load from local storage, otherwise default to the first company
      const storedCompanyId = localStorage.getItem('selectedCompanyId');
      const initialCompany = storedCompanyId
        ? companies.find(c => c.id === storedCompanyId)
        : companies[0];
      setSelectedCompanyState(initialCompany || companies[0]);
    } else if (companies && companies.length === 0 && selectedCompany) {
      // If no companies exist, clear selected company
      setSelectedCompanyState(null);
      localStorage.removeItem('selectedCompanyId');
    }
  }, [companies, selectedCompany]);

  const setSelectedCompany = (company: Company | null) => {
    setSelectedCompanyState(company);
    if (company) {
      localStorage.setItem('selectedCompanyId', company.id);
      showSuccess(`Empresa selecionada: ${company.name}`);
    } else {
      localStorage.removeItem('selectedCompanyId');
    }
  };

  return (
    <CompanyContext.Provider
      value={{
        companies: companies || [],
        selectedCompany,
        setSelectedCompany,
        isLoadingCompanies: isCompaniesLoading,
        errorCompanies,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};