import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Index from './pages/Index';
import Login from './pages/Login';
import { SessionContextProvider, useSession } from './components/SessionContextProvider';
import { Toaster } from 'sonner';
import IdPage from './pages/IdPage';
import CompanyManagementPage from './pages/CompanyManagementPage';
import UserManagementPage from './pages/UserManagementPage';
import { CompanyProvider } from './components/CompanyContext';
import PulsePage from './pages/PulsePage'; 
import CorePage from './pages/CorePage'; 
import UserTypeManagementPage from './pages/UserTypeManagementPage'; 
import PulseInformativeManagementPage from './pages/PulseInformativeManagementPage'; 
import PulseInformativeFormPage from './pages/PulseInformativeFormPage'; 
import PublicInformativePage from './pages/PublicInformativePage'; 
import GlobalSettingsPage from './pages/GlobalSettingsPage';
import SidebarSettingsPage from './pages/SidebarSettingsPage';
import NotificationManagementPage from './pages/NotificationManagementPage';
import AllCompaniesManagementPage from './pages/AllCompaniesManagementPage';
import CompanySharingPage from './pages/CompanySharingPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; 
import React from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import DataDoctorPage from './pages/DataDoctorPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Desativa a busca de dados ao focar na janela para maior estabilidade
      retry: 1, // Tenta novamente apenas 1 vez em caso de erro
    },
  },
});

// Componente para proteger rotas, agora mais robusto
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, isLoading } = useSession();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-sollux-light-gray">
        <p className="text-gray-600">Carregando sessão...</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}> 
          <SessionContextProvider>
            <CompanyProvider>
              <Toaster />
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/informative/:id" element={<PublicInformativePage />} /> 
                <Route
                  path="*"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Routes>
                          <Route path="/" element={<Navigate to="/pulse" replace />} /> 
                          <Route path="/pulse" element={<PulsePage />} /> 
                          <Route path="/id" element={<IdPage />} />
                          <Route path="/id/companies" element={<CompanyManagementPage />} />
                          <Route path="/id/users" element={<UserManagementPage />} />
                          <Route path="/id/sharing" element={<CompanySharingPage />} />
                          <Route path="/connect" element={<Index />} />
                          <Route path="/ops" element={<Index />} /> 
                          <Route path="/core" element={<CorePage />} /> 
                          <Route path="/core/user-types" element={<UserTypeManagementPage />} /> 
                          <Route path="/core/pulse-informatives" element={<PulseInformativeManagementPage />} />
                          <Route path="/core/pulse-informatives/new" element={<PulseInformativeFormPage />} /> 
                          <Route path="/core/pulse-informatives/:id" element={<PulseInformativeFormPage />} /> 
                          <Route path="/core/global-settings" element={<GlobalSettingsPage />} />
                          <Route path="/core/sidebar-settings" element={<SidebarSettingsPage />} />
                          <Route path="/core/notifications" element={<NotificationManagementPage />} />
                          <Route path="/core/all-companies" element={<AllCompaniesManagementPage />} />
                          <Route path="/core/data-doctor" element={<DataDoctorPage />} />
                        </Routes>
                      </Layout>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </CompanyProvider>
          </SessionContextProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </Router>
  );
}

export default App;