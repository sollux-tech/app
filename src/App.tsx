import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Index from './pages/Index';
import Login from './pages/Login';
import { SessionContextProvider } from './components/SessionContextProvider';
import { Toaster } from 'sonner';
import IdPage from './pages/IdPage';
import CompanyManagementPage from './pages/CompanyManagementPage';
import UserManagementPage from './pages/UserManagementPage'; // Importar a nova página
import { CompanyProvider } from './components/CompanyContext';
import PulsePage from './pages/PulsePage'; 
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; 
import React from 'react'; // Importar React

const queryClient = new QueryClient(); 

// Componente para proteger rotas
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, isLoading } = useSession();
  const navigate = useNavigate();

  React.useEffect(() => { // Usar React.useEffect
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
                  <ProtectedRoute> {/* Proteger todas as rotas dentro do Layout */}
                    <Layout>
                      <Routes>
                        <Route path="/" element={<Navigate to="/pulse" replace />} /> 
                        <Route path="/pulse" element={<PulsePage />} /> 
                        <Route path="/id" element={<IdPage />} />
                        <Route path="/id/companies" element={<CompanyManagementPage />} />
                        <Route path="/id/users" element={<UserManagementPage />} /> {/* Nova rota */}
                        <Route path="/ops" element={<Index />} /> 
                        <Route path="/connect" element={<Index />} />
                        <Route path="/core" element={<Index />} />
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