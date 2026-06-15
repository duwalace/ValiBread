import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./contexts/AuthContext";

// Public Pages
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import Cadastro from "./pages/Cadastro.tsx";
import NotFound from "./pages/NotFound.tsx";

// Admin Pages & Layout
import { AdminLayout } from "./components/layout/AdminLayout";
import { DashboardPage } from "./pages/admin/DashboardPage";
import { InventoryPage } from "./pages/admin/InventoryPage";
import { UsersPage } from "./pages/admin/UsersPage";
import { DocumentosPage } from "./pages/admin/DocumentosPage";
import { SettingsPage } from "./pages/admin/SettingsPage";
import { CadastroEtiquetaPage } from "./pages/admin/CadastroEtiquetaPage";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Cadastro />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute requiredRole="Admin"><AdminLayout /></ProtectedRoute>}>
              <Route index element={<DashboardPage />} />
              <Route path="estoque" element={<InventoryPage />} />
              <Route path="cadastro-rfid" element={<CadastroEtiquetaPage />} />
              <Route path="usuarios" element={<UsersPage />} />
              <Route path="documentos" element={<DocumentosPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
