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
import FormCreatePage from './pages/FormCreatePage';
import JobSettingsPage from './pages/JobSettingsPage';
import SolluxCalcPage from './pages/SolluxCalcPage';
import OpsSettingsPage from './pages/OpsSettingsPage';
import PillarTypeManagementPage from './pages/PillarTypeManagementPage';
import PillarManagementPage from './pages/PillarManagementPage';
import PillarBlockManagementPage from './pages/PillarBlockManagementPage';
import ScoringScaleManagementPage from './pages/ScoringScaleManagementPage';
import KpiManagementPage from './pages/KpiManagementPage';
import CompanyFormPage from './pages/CompanyFormPage';
import MarketManagementPage from './pages/MarketManagementPage';
import AllInformativesPage from './pages/AllInformativesPage';
import { ThemeProvider } from './components/ThemeProvider';
import DocumentManagementPage from './pages/DocumentManagementPage';
import AllDocumentsPage from './pages/AllDocumentsPage';
import TagManagementPage from './pages/TagManagementPage';
import DiagnosticStatusManagementPage from './pages/DiagnosticStatusManagementPage';
import DiagnosticManagementPage from './pages/DiagnosticManagementPage';
import InsightPage from './pages/InsightPage'; // Importar a nova página InsightPage

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
              <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
                <Routes>
                  <Route path="/login" element={<Login />} />
                  {/* A rota /jobs/:id e /form/:id permanecem fora do ProtectedRoute para acesso público */}
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
                            <Route path="/pulse/informatives" element={<AllInformativesPage />} />
                            <Route path="/id" element={<IdPage />} />
                            <Route path="/id/companies" element={<CompanyManagementPage />} />
                            <Route path="/id/companies/new" element={<CompanyFormPage />} />
                            <Route path="/id/companies/:id" element={<CompanyFormPage />} />
                            <Route path="/id/users" element={<UserManagementPage />} />
                            <Route path="/id/sharing" element={<CompanySharingPage />} />
                            <Route path="/id/documents" element={<AllDocumentsPage />} />
                            <Route path="/connect" element={<ConnectPage />} />
                            <Route path="/connect/jobs" element={<JobsPage />} />
                            <Route path="/connect/jobs/new" element={<JobFormPage />} />
                            <Route path="/connect/jobs/:id" element={<JobFormPage />} />
                            <Route path="/connect/calc" element={<SolluxCalcPage />} />
                            <Route path="/ops" element={<OpsPage />} />
                            <Route path="/ops/insight" element={<InsightPage />} /> {/* Nova rota para InsightPage */}
                            <Route path="/ops/diagnostics" element={<DiagnosticManagementPage />} />
                            <Route path="/core" element={<CorePage />} /> 
                            <Route path="/core/user-types" element={<UserTypeManagementPage />} /> 
                            <Route path="/core/pulse-informatives" element={<PulseInformativeManagementPage />} />
                            <Route path="/core/pulse-informatives/new" element={<PulseInformativeFormPage />} /> 
                            <Route path="/core/pulse-informatives/:id" element={<PulseInformativeFormPage />} /> 
                            {/* A rota /informative/:id agora está dentro do ProtectedRoute e Layout */}
                            <Route path="/informative/:id" element={<PublicInformativePage />} /> 
                            <Route path="/core/global-settings" element={<GlobalSettingsPage />} />
                            <Route path="/core/global-settings/jobs" element={<JobSettingsPage />} />
                            <Route path="/core/global-settings/job-sectors" element={<JobSectorsPage />} /> 
                            <Route path="/core/global-settings/contract-types" element={<ContractTypesPage />} />
                            <Route path="/core/global-settings/work-models" element={<WorkModelsPage />} />
                            <Route path="/core/global-settings/ops" element={<OpsSettingsPage />} />
                            <Route path="/core/global-settings/ops/pillar-types" element={<PillarTypeManagementPage />} />
                            <Route path="/core/global-settings/ops/pillars" element={<PillarManagementPage />} />
                            <Route path="/core/global-settings/ops/pillar-blocks" element={<PillarBlockManagementPage />} />
                            <Route path="/core/global-settings/ops/scoring-scale" element={<ScoringScaleManagementPage />} />
                            <Route path="/core/global-settings/ops/kpis" element={<KpiManagementPage />} />
                            <Route path="/core/global-settings/ops/tags" element={<TagManagementPage />} />
                            <Route path="/core/global-settings/ops/diagnostic-statuses" element={<DiagnosticStatusManagementPage />} />
                            <Route path="/core/sidebar-settings" element={<SidebarSettingsPage />} />
                            <Route path="/core/notifications" element={<NotificationManagementPage />} />
                            <Route path="/core/all-companies" element={<AllCompaniesManagementPage />} />
                            <Route path="/core/data-doctor" element={<DataDoctorPage />} />
                            <Route path="/core/markets" element={<MarketManagementPage />} /> 
                            <Route path="/core/documents" element={<DocumentManagementPage />} />
                            
                            {/* Rotas SOLLUX FORM™ */}
                            <Route path="/connect/forms" element={<FormsPage />} />
                            <Route path="/connect/forms/new" element={<FormCreatePage />} /> 
                            <Route path="/connect/forms/:id/edit" element={<FormEditPage />} />
                            <Route path="/connect/forms/:id/responses" element={<FormResponsesPage />} />
                          </Routes>
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </ThemeProvider>
            </CompanyProvider>
          </SessionContextProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </Router>
  );
}

export default App;