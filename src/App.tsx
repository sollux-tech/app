import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import { SessionContextProvider } from "./components/SessionContextProvider";
import LayoutShell from "./components/LayoutShell";
import CompaniesPage from "./pages/CompaniesPage"; // Import the new CompaniesPage

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SessionContextProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<LayoutShell><Index /></LayoutShell>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="/pulse" element={<LayoutShell><div className="p-6 bg-white rounded-2xl shadow-lg"><h2>PULSE App Content</h2><p>This is a placeholder for the PULSE application.</p></div></LayoutShell>} />
            <Route path="/id" element={<LayoutShell><CompaniesPage /></LayoutShell>} /> {/* Use CompaniesPage for /id */}
            <Route path="/connect" element={<LayoutShell><div className="p-6 bg-white rounded-2xl shadow-lg"><h2>CONNECT App Content</h2><p>This is a placeholder for the CONNECT application.</p></div></LayoutShell>} />
            <Route path="/ops" element={<LayoutShell><div className="p-6 bg-white rounded-2xl shadow-lg"><h2>OPS App Content</h2><p>This is a placeholder for the OPS application.</p></div></LayoutShell>} />
            <Route path="/core" element={<LayoutShell><div className="p-6 bg-white rounded-2xl shadow-lg"><h2>CORE App Content</h2><p>This is a placeholder for the CORE application.</p></div></LayoutShell>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SessionContextProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;