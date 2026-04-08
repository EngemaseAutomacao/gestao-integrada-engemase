
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { OfflineProvider } from "@/contexts/OfflineContext";
import Layout from "@/components/Layout";
import Auth from "./pages/Auth";
import Register from "./pages/Register";
import ChangePassword from "./pages/ChangePassword";
import Home from "./pages/Home";
import FerramentasMenu from "./pages/FerramentasMenu";
import VeiculosMenu from "./pages/VeiculosMenu";
import Dashboard from "./pages/Dashboard";
import Tools from "./pages/Tools";
import ToolDetail from "./pages/ToolDetail";
import Checkout from "./pages/Checkout";
import Checkin from "./pages/Checkin";
import UserHistory from "./pages/UserHistory";
import VehicleDashboard from "./pages/vehicles/VehicleDashboard";
import VehicleCheckout from "./pages/vehicles/VehicleCheckout";
import VehicleHistory from "./pages/vehicles/VehicleHistory";
import VehicleCheckin from "./pages/vehicles/VehicleCheckin";
import VehicleList from "./pages/vehicles/VehicleList";
import VehicleDetail from "./pages/vehicles/VehicleDetail";
import VehicleAnalytics from "./pages/vehicles/VehicleAnalytics";
import FuelRecords from "./pages/vehicles/FuelRecords";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminTools from "./pages/admin/AdminTools";
import AdminHistory from "./pages/admin/AdminHistory";
import AdminLogs from "./pages/admin/AdminLogs";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminMaintenance from "./pages/admin/AdminMaintenance";
import AdminReports from "./pages/admin/AdminReports";
import ManualEntry from "./pages/admin/ManualEntry";
import AdminIssues from "./pages/admin/AdminIssues";
import AdminConstructionSites from "./pages/admin/AdminConstructionSites";
import AdminGallery from "./pages/admin/AdminGallery";
import AdminDataRetention from "./pages/admin/AdminDataRetention";
import AdminVehicleHistory from "./pages/admin/AdminVehicleHistory";
import ReportIssue from "./pages/ReportIssue";
import ReportVehicleIssue from "./pages/vehicles/ReportVehicleIssue";
import AdminVehicleIssues from "./pages/admin/AdminVehicleIssues";
import PontoDashboard from "./pages/ponto/PontoDashboard";
import PontoRegister from "./pages/ponto/PontoRegister";
import PontoHistory from "./pages/ponto/PontoHistory";
import PontoAdmin from "./pages/ponto/PontoAdmin";
import MateriaisDashboard from "./pages/materiais/MateriaisDashboard";
import MateriaisRequest from "./pages/materiais/MateriaisRequest";
import MateriaisHistory from "./pages/materiais/MateriaisHistory";
import MateriaisAdmin from "./pages/materiais/MateriaisAdmin";
import NotFound from "./pages/NotFound";
import Help from "./pages/Help";
import Changelog from "./pages/Changelog";
import Transfers from "./pages/Transfers";
import MobileNavSettings from "./pages/MobileNavSettings";
import UpdatePrompt from "./components/UpdatePrompt";
import { ChangelogModal } from "./components/ChangelogModal";
import { OnboardingTutorial } from "./components/OnboardingTutorial";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system">
      <TooltipProvider>
        
        <Sonner />
        <UpdatePrompt />
        <BrowserRouter>
          <OfflineProvider>
            <AuthProvider>
              <ChangelogModal />
              <OnboardingTutorial />
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/register" element={<Register />} />
                <Route path="/change-password" element={<ChangePassword />} />
                <Route path="/" element={<Layout><Home /></Layout>} />
                {/* Ferramentas Routes */}
                <Route path="/ferramentas" element={<Layout><FerramentasMenu /></Layout>} />
                <Route path="/ferramentas/dashboard" element={<Layout><Dashboard /></Layout>} />
                <Route path="/ferramentas/lista" element={<Layout><Tools /></Layout>} />
                <Route path="/ferramentas/:id" element={<Layout><ToolDetail /></Layout>} />
                <Route path="/ferramentas/retirada" element={<Layout><Checkout /></Layout>} />
                <Route path="/ferramentas/devolucao" element={<Layout><Checkin /></Layout>} />
                <Route path="/ferramentas/historico" element={<Layout><UserHistory /></Layout>} />
                {/* Veículos Routes */}
                <Route path="/veiculos" element={<Layout><VeiculosMenu /></Layout>} />
                <Route path="/veiculos/dashboard" element={<Layout><VehicleDashboard /></Layout>} />
                <Route path="/veiculos/lista" element={<Layout><VehicleList /></Layout>} />
                <Route path="/veiculos/:id" element={<Layout><VehicleDetail /></Layout>} />
                <Route path="/veiculos/saida" element={<Layout><VehicleCheckout /></Layout>} />
                <Route path="/veiculos/chegada" element={<Layout><VehicleCheckin /></Layout>} />
                <Route path="/veiculos/historico" element={<Layout><VehicleHistory /></Layout>} />
                <Route path="/veiculos/combustivel" element={<Layout><FuelRecords /></Layout>} />
                <Route path="/veiculos/analytics" element={<Layout><VehicleAnalytics /></Layout>} />
                <Route path="/admin/vehicle-history" element={<Layout><AdminVehicleHistory /></Layout>} />
                <Route path="/admin/vehicle-issues" element={<Layout><AdminVehicleIssues /></Layout>} />
                <Route path="/veiculos/report-issue" element={<Layout><ReportVehicleIssue /></Layout>} />
                {/* Legacy routes - redirect to new paths */}
                <Route path="/tools" element={<Navigate to="/ferramentas/lista" replace />} />
                <Route path="/tools/:id" element={<Layout><ToolDetail /></Layout>} />
                <Route path="/checkout" element={<Navigate to="/ferramentas/retirada" replace />} />
                <Route path="/checkin" element={<Navigate to="/ferramentas/devolucao" replace />} />
                <Route path="/history" element={<Navigate to="/ferramentas/historico" replace />} />
                {/* Admin Routes */}
                <Route path="/admin" element={<Layout><AdminDashboard /></Layout>} />
                <Route path="/admin/users" element={<Layout><AdminUsers /></Layout>} />
                <Route path="/admin/tools" element={<Layout><AdminTools /></Layout>} />
                <Route path="/admin/history" element={<Layout><AdminHistory /></Layout>} />
                <Route path="/admin/logs" element={<Layout><AdminLogs /></Layout>} />
                <Route path="/admin/analytics" element={<Layout><AdminAnalytics /></Layout>} />
                <Route path="/admin/notifications" element={<Layout><AdminNotifications /></Layout>} />
                <Route path="/admin/maintenance" element={<Layout><AdminMaintenance /></Layout>} />
                <Route path="/admin/reports" element={<Layout><AdminReports /></Layout>} />
                <Route path="/admin/manual" element={<Layout><ManualEntry /></Layout>} />
                <Route path="/admin/issues" element={<Layout><AdminIssues /></Layout>} />
                <Route path="/admin/construction-sites" element={<Layout><AdminConstructionSites /></Layout>} />
                <Route path="/admin/gallery" element={<Layout><AdminGallery /></Layout>} />
                <Route path="/admin/data-retention" element={<Layout><AdminDataRetention /></Layout>} />
                {/* Ponto Online Routes */}
                <Route path="/ponto" element={<Layout><PontoDashboard /></Layout>} />
                <Route path="/ponto/registrar" element={<Layout><PontoRegister /></Layout>} />
                <Route path="/ponto/historico" element={<Layout><PontoHistory /></Layout>} />
                <Route path="/ponto/admin" element={<Layout><PontoAdmin /></Layout>} />
                {/* Materiais Routes */}
                <Route path="/materiais" element={<Layout><MateriaisDashboard /></Layout>} />
                <Route path="/materiais/solicitar" element={<Layout><MateriaisRequest /></Layout>} />
                <Route path="/materiais/historico" element={<Layout><MateriaisHistory /></Layout>} />
                <Route path="/materiais/admin" element={<Layout><MateriaisAdmin /></Layout>} />
                <Route path="/transferencias" element={<Layout><Transfers /></Layout>} />
                <Route path="/report-issue" element={<Layout><ReportIssue /></Layout>} />
                <Route path="/changelog" element={<Layout><Changelog /></Layout>} />
                <Route path="/mobile-settings" element={<Layout><MobileNavSettings /></Layout>} />
                <Route path="/ajuda" element={<Layout><Help /></Layout>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </OfflineProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

