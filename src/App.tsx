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
import ConnectPage from './pages/ConnectPage';
import JobsPage from './pages/JobsPage';
import JobFormPage from './pages/JobFormPage';
import JobSectorsPage from './pages/JobSectorsPage';
import ContractTypesPage from './pages/ContractTypesPage';
import WorkModelsPage from './pages/WorkModelsPage';
import PublicJobPage from './pages/PublicJobPage';
import OpsPage from './pages/OpsPage';
import FormsPage from './pages/FormsPage';
import FormEditPage from './pages/FormEditPage';
import PublicFormPage from './pages/PublicFormPage';
import FormResponsesPage from './pages/FormResponsesPage';
import FormCreatePage from './pages/FormCreatePage'; // Importar a nova página

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
                <Route path="/jobs/:id" element={<PublicJobPage />} />
                <Route path="/form/:id" element={<PublicFormPage />} />
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
                          <Route path="/connect" element={<ConnectPage />} />
                          <Route path="/connect/jobs" element={<JobsPage />} />
                          <Route path="/connect/jobs/new" element={<JobFormPage />} />
                          <Route path="/connect/jobs/:id" element={<JobFormPage />} />
                          <Route path="/ops" element={<OpsPage />} />
                          <Route path="/core" element={<CorePage />} /> 
                          <Route path="/core/user-types" element={<UserTypeManagementPage />} /> 
                          <Route path="/core/pulse-informatives" element={<PulseInformativeManagementPage />} />
                          <Route path="/core/pulse-informatives/new" element={<PulseInformativeFormPage />} /> 
                          <Route path="/core/pulse-informatives/:id" element={<PulseInformativeFormPage />} /> 
                          <Route path="/core/global-settings" element={<GlobalSettingsPage />} />
                          <Route path="/core/global-settings/job-sectors" element={<JobSectorsPage />} />
                          <Route path="/core/global-settings/contract-types" element={<ContractTypesPage />} />
                          <Route path="/core/global-settings/work-models" element={<WorkModelsPage />} />
                          <Route path="/core/sidebar-settings" element={<SidebarSettingsPage />} />
                          <Route path="/core/notifications" element={<NotificationManagementPage />} />
                          <Route path="/core/all-companies" element={<AllCompaniesManagementPage />} />
                          <Route path="/core/data-doctor" element={<DataDoctorPage />} />
                          
                          {/* Rotas SOLLUX FORM™ */}
                          <Route path="/connect/forms" element={<FormsPage />} />
                          <Route path="/connect/forms/new" element={<FormCreatePage />} /> {/* Nova rota */}
                          <Route path="/connect/forms/:id/edit" element={<FormEditPage />} />
                          <Route path="/connect/forms/:id/responses" element={<FormResponsesPage />} />
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