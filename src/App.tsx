import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
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
import PulseInformativeFormPage from './pages/PulseInformativeFormPage'; // Importar a nova página de formulário
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; 
import React from 'react';

const queryClient = new QueryClient(); 

// Componente para proteger rotas
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, isLoading } = useSession();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!isLoading && !session) {
      navigate('/login');
    }
  }, [session, isLoading, navigate]);

  if (isLoading) {
    return null; 
  }

  if (!session) {
    return null; 
  }

  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <QueryClientProvider client={queryClient}> 
        <SessionContextProvider>
          <CompanyProvider>
            <Toaster />
            <Routes>
              <Route path="/login" element={<Login />} />
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
                        <Route path="/connect" element={<Index />} />
                        <Route path="/ops" element={<Index />} /> 
                        <Route path="/core" element={<CorePage />} /> 
                        <Route path="/core/user-types" element={<UserTypeManagementPage />} /> 
                        <Route path="/core/pulse-informatives" element={<PulseInformativeManagementPage />} />
                        <Route path="/core/pulse-informatives/new" element={<PulseInformativeFormPage />} /> {/* Rota para novo */}
                        <Route path="/core/pulse-informatives/:id" element={<PulseInformativeFormPage />} /> {/* Rota para editar */}
                      </Routes>
                    </Layout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </CompanyProvider>
        </SessionContextProvider>
      </QueryClientProvider>
    </Router>
  );
}

export default App;