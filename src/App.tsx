import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Index from './pages/Index';
import Login from './pages/Login';
import { SessionContextProvider } from './components/SessionContextProvider';
import { Toaster } from 'sonner'; // Corrigido para importar Toaster de 'sonner'
import IdPage from './pages/IdPage';
import CompanyManagementPage from './pages/CompanyManagementPage';
import { CompanyProvider } from './components/CompanyContext';
import PulsePage from './pages/PulsePage'; 

function App() {
  return (
    <SessionContextProvider>
      <CompanyProvider>
        <Router>
          <Toaster />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="*"
              element={
                <Layout>
                  <Routes>
                    <Route path="/" element={<Navigate to="/pulse" replace />} /> 
                    <Route path="/pulse" element={<PulsePage />} /> 
                    <Route path="/id" element={<IdPage />} />
                    <Route path="/id/companies" element={<CompanyManagementPage />} />
                    {/* Adicione outras rotas aqui */}
                    <Route path="/ops" element={<Index />} /> 
                    <Route path="/connect" element={<Index />} />
                    <Route path="/core" element={<Index />} />
                  </Routes>
                </Layout>
              }
            />
          </Routes>
        </Router>
      </CompanyProvider>
    </SessionContextProvider>
  );
}

export default App;