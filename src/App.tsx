import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import { SessionContextProvider } from "./components/SessionContextProvider";
import { CompanyProvider } from "./components/CompanyContext";
import Layout from "./components/Layout";
import IdPage from "./pages/IdPage";
import CompanyManagementPage from "./pages/CompanyManagementPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SessionContextProvider>
          <CompanyProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/*" element={
                <Layout>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/pulse" element={<div className="p-6 bg-white rounded-lg shadow-sm"><h2>PULSE App Content</h2><p>This is a placeholder for the PULSE application.</p></div>} />
                    <Route path="/id" element={<IdPage />} />
                    <Route path="/id/companies" element={<CompanyManagementPage />} />
                    <Route path="/connect" element={<div className="p-6 bg-white rounded-lg shadow-sm"><h2>CONNECT App Content</h2><p>This is a placeholder for the CONNECT application.</p></div>} />
                    <Route path="/ops" element={<div className="p-6 bg-white rounded-lg shadow-sm"><h2>OPS App Content</h2><p>This is a placeholder for the OPS application.</p></div>} />
                    <Route path="/core" element={<div className="p-6 bg-white rounded-lg shadow-sm"><h2>CORE App Content</h2><p>This is a placeholder for the CORE application.</p></div>} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Layout>
              } />
            </Routes>
          </CompanyProvider>
        </SessionContextProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;