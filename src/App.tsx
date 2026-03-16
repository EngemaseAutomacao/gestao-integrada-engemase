import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { OfflineProvider } from "@/contexts/OfflineContext";
import Layout from "@/components/Layout";
import Auth from "./pages/Auth";
import Register from "./pages/Register";
import ChangePassword from "./pages/ChangePassword";
import Home from "./pages/Home";
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
import ReportIssue from "./pages/ReportIssue";
import NotFound from "./pages/NotFound";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <OfflineProvider>
            <AuthProvider>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/register" element={<Register />} />
                <Route path="/change-password" element={<ChangePassword />} />
                <Route path="/" element={<Layout><Home /></Layout>} />
                {/* Ferramentas Routes */}
                <Route path="/ferramentas" element={<Layout><Dashboard /></Layout>} />
                <Route path="/ferramentas/lista" element={<Layout><Tools /></Layout>} />
                <Route path="/ferramentas/:id" element={<Layout><ToolDetail /></Layout>} />
                <Route path="/ferramentas/retirada" element={<Layout><Checkout /></Layout>} />
                <Route path="/ferramentas/devolucao" element={<Layout><Checkin /></Layout>} />
                <Route path="/ferramentas/historico" element={<Layout><UserHistory /></Layout>} />
                {/* Veículos Routes */}
                <Route path="/veiculos" element={<Layout><VehicleDashboard /></Layout>} />
                <Route path="/veiculos/lista" element={<Layout><VehicleList /></Layout>} />
                <Route path="/veiculos/saida" element={<Layout><VehicleCheckout /></Layout>} />
                <Route path="/veiculos/chegada" element={<Layout><VehicleCheckin /></Layout>} />
                <Route path="/veiculos/historico" element={<Layout><VehicleHistory /></Layout>} />
                {/* Legacy routes */}
                <Route path="/tools" element={<Layout><Tools /></Layout>} />
                <Route path="/tools/:id" element={<Layout><ToolDetail /></Layout>} />
                <Route path="/checkout" element={<Layout><Checkout /></Layout>} />
                <Route path="/checkin" element={<Layout><Checkin /></Layout>} />
                <Route path="/history" element={<Layout><UserHistory /></Layout>} />
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
                <Route path="/report-issue" element={<Layout><ReportIssue /></Layout>} />
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

