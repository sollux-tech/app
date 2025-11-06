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
import React, { useEffect } from 'react';
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
import { ThemeProvider, useTheme } from './components/ThemeProvider'; // Importar useTheme
import DocumentManagementPage from './pages/DocumentManagementPage';
import AllDocumentsPage from './pages/AllDocumentsPage';
import TagManagementPage from './pages/TagManagementPage';
import DiagnosticStatusManagementPage from './pages/DiagnosticStatusManagementPage';
import DiagnosticManagementPage from './pages/DiagnosticManagementPage';
import InsightPage from './pages/InsightPage';
import DiagnosticQuestionnairePage from './pages/DiagnosticQuestionnairePage';
import AnswerDiagnosticQuestionnairePage from './pages/AnswerDiagnosticQuestionnairePage'; 
import ClassificationScaleManagementPage from './pages/ClassificationScaleManagementPage';
import DiagnosticEvaluationPage from './pages/DiagnosticEvaluationPage';
import FlowPage from './pages/FlowPage';
import PublicDiagnosticResultsPage from './pages/PublicDiagnosticResultsPage'; // Importar a nova página
import ShopPage from './pages/ShopPage'; // Importar a nova página ShopPage
import KpiSmartTypeManagementPage from './pages/KpiSmartTypeManagementPage'; // Importar a nova página
import KpiSmartUnitManagementPage from './pages/KpiSmartUnitManagementPage'; // Importar a nova página
import KpiSmartFrequencyManagementPage from './pages/KpiSmartFrequencyManagementPage'; // Importar a nova página
import KpiSmartStatusManagementPage from './pages/KpiSmartStatusManagementPage'; // Importar a nova página
import KpiSmartFocusManagementPage from './pages/KpiSmartFocusManagementPage'; // Importar a nova página
import KpiSmartActionVerbManagementPage from './pages/KpiSmartActionVerbManagementPage'; // Importar a nova página
import KpiSmartManagementPage from './pages/KpiSmartManagementPage'; // Importar a nova página
import ShiftPage from './pages/ShiftPage'; // Importar a nova página ShiftPage
import KpiApontamentosPage from './pages/KpiApontamentosPage';
import KpiSmartLiberatedManagementPage from './pages/KpiSmartLiberatedManagementPage'; // Importar a nova página
import KpiSmartLiberatedFormPage from './pages/KpiSmartLiberatedFormPage'; // Importar a nova página de formulário
import KpiSmartAcquiredManagementPage from './pages/KpiSmartAcquiredManagementPage'; // Importar a nova página

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

// Novo componente para encapsular o conteúdo principal do App
const AppContent: React.FC = () => {
  const { profile, isLoading: isLoadingProfile } = useSession();
  const { setTheme } = useTheme(); // Obter a função setTheme do ThemeProvider

  useEffect(() => {
    if (!isLoadingProfile && profile?.theme) {
      console.log("AppContent: Setting theme from profile:", profile.theme); // Log para depuração
      setTheme(profile.theme); // Definir o tema do perfil assim que ele for carregado
      
      // Forçar a atualização do atributo data-theme e color-scheme no elemento <html>
      const htmlElement = document.documentElement;
      if (htmlElement) { // Adicionar verificação para htmlElement
        if (profile.theme === 'dark') {
          htmlElement.classList.add('dark');
          htmlElement.setAttribute('data-theme', 'dark');
          htmlElement.style.colorScheme = 'dark';
        } else {
          htmlElement.classList.remove('dark');
          htmlElement.setAttribute('data-theme', 'light');
          htmlElement.style.colorScheme = 'light';
        }
      }
    } else if (!isLoadingProfile && !profile?.theme) {
      console.log("AppContent: Profile loaded, but no theme found. Defaulting to system.");
      setTheme("system"); // Garante que um tema seja definido mesmo se o perfil não tiver um
      // Aplicar tema 'system' ao <html> se não houver tema no perfil
      const htmlElement = document.documentElement;
      if (htmlElement) { // Adicionar verificação para htmlElement
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          htmlElement.classList.add('dark');
          htmlElement.setAttribute('data-theme', 'dark');
          htmlElement.style.colorScheme = 'dark';
        } else {
          htmlElement.classList.remove('dark');
          htmlElement.setAttribute('data-theme', 'light');
          htmlElement.style.colorScheme = 'light';
        }
      }
    }
  }, [profile?.theme, isLoadingProfile, setTheme]);

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-sollux-light-gray">
        <p className="text-gray-600">Carregando perfil do usuário...</p>
      </div>
    );
  }

  return (
    <ThemeProvider defaultTheme={profile?.theme || "system"} storageKey="vite-ui-theme">
      <Routes>
        <Route path="/login" element={<Login />} />
        {/* A rota /jobs/:id e /form/:id permanecem fora do ProtectedRoute para acesso público */}
        <Route path="/jobs/:id" element={<PublicJobPage />} />
        <Route path="/form/:id" element={<PublicFormPage />} />
        <Route path="/informative/:id" element={<PublicInformativePage />} /> {/* Rota pública */}
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
                  <Route path="/ops/insight" element={<InsightPage />} />
                  <Route path="/ops/diagnostics" element={<DiagnosticManagementPage />} />
                  <Route path="/ops/insight/questionnaires" element={<DiagnosticQuestionnairePage />} />
                  <Route path="/ops/insight/answer-questionnaire" element={<AnswerDiagnosticQuestionnairePage />} /> 
                  <Route path="/ops/insight/evaluation" element={<DiagnosticEvaluationPage />} />
                  <Route path="/ops/flow" element={<FlowPage />} />
                  <Route path="/ops/flow/diagnostic-results/:id" element={<PublicDiagnosticResultsPage />} /> {/* Nova rota */}
                  <Route path="/ops/shift" element={<ShiftPage />} /> {/* Nova rota */}
                  <Route path="/ops/shift/kpi-apontamentos" element={<KpiApontamentosPage />} />
                  <Route path="/ops/shift/kpi-apontamentos/:id" element={<KpiApontamentosPage />} />
                  <Route path="/ops/shift/kpi-smarts-liberated" element={<KpiSmartLiberatedManagementPage />} /> {/* Nova rota */}
                  <Route path="/ops/shift/kpi-smarts-liberated/new" element={<KpiSmartLiberatedFormPage />} /> {/* Nova rota */}
                  <Route path="/ops/shift/kpi-smarts-liberated/:id" element={<KpiSmartLiberatedFormPage />} /> {/* Nova rota */}
                  <Route path="/ops/shift/kpi-smarts-acquired" element={<KpiSmartAcquiredManagementPage />} /> {/* Nova rota */}
                  <Route path="/core" element={<CorePage />} /> 
                  <Route path="/core/user-types" element={<UserTypeManagementPage />} /> 
                  <Route path="/core/pulse-informatives" element={<PulseInformativeManagementPage />} />
                  <Route path="/core/pulse-informatives/new" element={<PulseInformativeFormPage />} /> 
                  <Route path="/core/pulse-informatives/:id" element={<PulseInformativeFormPage />} /> 
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
                  <Route path="/core/global-settings/ops/classification-scale" element={<ClassificationScaleManagementPage />} />
                  <Route path="/core/global-settings/ops/kpi-smart-types" element={<KpiSmartTypeManagementPage />} />
                  <Route path="/core/global-settings/ops/kpi-smart-units" element={<KpiSmartUnitManagementPage />} />
                  <Route path="/core/global-settings/ops/kpi-smart-frequencies" element={<KpiSmartFrequencyManagementPage />} />
                  <Route path="/core/global-settings/ops/kpi-smart-statuses" element={<KpiSmartStatusManagementPage />} />
                  <Route path="/core/global-settings/ops/kpi-smart-focuses" element={<KpiSmartFocusManagementPage />} />
                  <Route path="/core/global-settings/ops/kpi-smart-action-verbs" element={<KpiSmartActionVerbManagementPage />} />
                  <Route path="/core/global-settings/ops/kpi-smarts" element={<KpiSmartManagementPage />} /> {/* Nova rota */}
                  <Route path="/core/sidebar-settings" element={<SidebarSettingsPage />} />
                  <Route path="/core/notifications" element={<NotificationManagementPage />} />
                  <Route path="/core/all-companies" element={<AllCompaniesManagementPage />} />
                  <Route path="/core/data-doctor" element={<DataDoctorPage />} />
                  <Route path="/core/markets" element={<MarketManagementPage />} /> 
                  <Route path="/core/documents" element={<DocumentManagementPage />} />
                  <Route path="/shop" element={<ShopPage />} /> {/* Nova rota para ShopPage */}
                  
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
  );
};

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}> 
          <SessionContextProvider>
            <CompanyProvider>
              <Toaster />
              <AppContent /> {/* Renderiza o novo componente aqui */}
            </CompanyProvider>
          </SessionContextProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </Router>
  );
}

export default App;