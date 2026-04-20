
import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { OfflineProvider } from "@/contexts/OfflineContext";
import Layout from "@/components/Layout";
import ErrorBoundary from "@/components/ErrorBoundary";
import { DashboardSkeleton as PageSkeleton } from "@/components/PageSkeleton";
import UpdatePrompt from "./components/UpdatePrompt";
import { ChangelogModal } from "./components/ChangelogModal";
import { OnboardingTutorial } from "./components/OnboardingTutorial";

// Lazy-loaded pages
const Auth = lazy(() => import("./pages/Auth"));
const Register = lazy(() => import("./pages/Register"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));
const Home = lazy(() => import("./pages/Home"));
const FerramentasMenu = lazy(() => import("./pages/FerramentasMenu"));
const VeiculosMenu = lazy(() => import("./pages/VeiculosMenu"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Tools = lazy(() => import("./pages/Tools"));
const ToolDetail = lazy(() => import("./pages/ToolDetail"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Checkin = lazy(() => import("./pages/Checkin"));
const UserHistory = lazy(() => import("./pages/UserHistory"));
const VehicleDashboard = lazy(() => import("./pages/vehicles/VehicleDashboard"));
const VehicleCheckout = lazy(() => import("./pages/vehicles/VehicleCheckout"));
const VehicleHistory = lazy(() => import("./pages/vehicles/VehicleHistory"));
const VehicleCheckin = lazy(() => import("./pages/vehicles/VehicleCheckin"));
const VehicleList = lazy(() => import("./pages/vehicles/VehicleList"));
const VehicleDetail = lazy(() => import("./pages/vehicles/VehicleDetail"));
const VehicleAnalytics = lazy(() => import("./pages/vehicles/VehicleAnalytics"));
const FuelRecords = lazy(() => import("./pages/vehicles/FuelRecords"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
// AdminTools removed - integrated into AdminConstructionSites
const AdminHistory = lazy(() => import("./pages/admin/AdminHistory"));
const AdminLogs = lazy(() => import("./pages/admin/AdminLogs"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminNotifications = lazy(() => import("./pages/admin/AdminNotifications"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));

const AdminIssues = lazy(() => import("./pages/admin/AdminIssues"));
const AdminConstructionSites = lazy(() => import("./pages/admin/AdminConstructionSites"));
const AdminGallery = lazy(() => import("./pages/admin/AdminGallery"));
const AdminDataRetention = lazy(() => import("./pages/admin/AdminDataRetention"));
const AdminAudit = lazy(() => import("./pages/admin/AdminAudit"));
const AdminVehicleHistory = lazy(() => import("./pages/admin/AdminVehicleHistory"));
const ReportIssue = lazy(() => import("./pages/ReportIssue"));
const ReportVehicleIssue = lazy(() => import("./pages/vehicles/ReportVehicleIssue"));
const AdminVehicleIssues = lazy(() => import("./pages/admin/AdminVehicleIssues"));
const AdminProblemas = lazy(() => import("./pages/admin/AdminProblemas"));
const AdminAuditoria = lazy(() => import("./pages/admin/AdminAuditoria"));
const AdminHistorico = lazy(() => import("./pages/admin/AdminHistorico"));
const AdminAnalyticsHub = lazy(() => import("./pages/admin/AdminAnalyticsHub"));
// AdminSiteTools removed

const PontoDashboard = lazy(() => import("./pages/ponto/PontoDashboard"));
const PontoRegister = lazy(() => import("./pages/ponto/PontoRegister"));
const PontoHistory = lazy(() => import("./pages/ponto/PontoHistory"));
const PontoAdmin = lazy(() => import("./pages/ponto/PontoAdmin"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Help = lazy(() => import("./pages/Help"));
const Changelog = lazy(() => import("./pages/Changelog"));
const Transfers = lazy(() => import("./pages/Transfers"));
const MobileNavSettings = lazy(() => import("./pages/MobileNavSettings"));
const Historico = lazy(() => import("./pages/Historico"));

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      const msg = getFriendlyErrorMessage(error);
      if (typeof window !== "undefined") {
        import("sonner").then(({ toast }) => toast.error(msg));
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      const msg = getFriendlyErrorMessage(error);
      if (typeof window !== "undefined") {
        import("sonner").then(({ toast }) => toast.error(msg));
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <ErrorBoundary>
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
                <Suspense fallback={<PageSkeleton />}>
                  <Routes>
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/change-password" element={<ChangePassword />} />
                    <Route path="/" element={<Layout><Home /></Layout>} />
                    {/* Ferramentas Routes */}
                    <Route path="/ferramentas" element={<Navigate to="/ferramentas/dashboard" replace />} />
                    <Route path="/ferramentas/dashboard" element={<Layout><Dashboard /></Layout>} />
                    <Route path="/ferramentas/lista" element={<Navigate to="/ferramentas/dashboard" replace />} />
                    <Route path="/ferramentas/:id" element={<Layout><ToolDetail /></Layout>} />
                    <Route path="/ferramentas/retirada" element={<Layout><Checkout /></Layout>} />
                    <Route path="/ferramentas/devolucao" element={<Layout><Checkin /></Layout>} />
                    <Route path="/ferramentas/historico" element={<Navigate to="/historico?tipo=tool" replace />} />
                    {/* Old menu kept for direct access if needed */}
                    <Route path="/ferramentas/menu" element={<Layout><FerramentasMenu /></Layout>} />
                    {/* Veículos Routes */}
                    <Route path="/veiculos" element={<Navigate to="/veiculos/dashboard" replace />} />
                    <Route path="/veiculos/dashboard" element={<Layout><VehicleDashboard /></Layout>} />
                    <Route path="/veiculos/lista" element={<Navigate to="/veiculos/dashboard" replace />} />
                    <Route path="/veiculos/:id" element={<Layout><VehicleDetail /></Layout>} />
                    <Route path="/veiculos/saida" element={<Layout><VehicleCheckout /></Layout>} />
                    <Route path="/veiculos/chegada" element={<Layout><VehicleCheckin /></Layout>} />
                    <Route path="/veiculos/historico" element={<Navigate to="/historico?tipo=vehicle" replace />} />
                    <Route path="/veiculos/menu" element={<Layout><VeiculosMenu /></Layout>} />
                    <Route path="/veiculos/combustivel" element={<Layout><FuelRecords /></Layout>} />
                    <Route path="/veiculos/analytics" element={<Layout><VehicleAnalytics /></Layout>} />
                    <Route path="/admin/vehicle-history" element={<Navigate to="/admin/historico?tab=veiculos" replace />} />
                    <Route path="/admin/vehicle-issues" element={<Navigate to="/admin/problemas?tab=veiculos" replace />} />
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
                    <Route path="/admin/tools" element={<Navigate to="/admin/construction-sites?tab=ferramentas" replace />} />
                    <Route path="/admin/history" element={<Navigate to="/admin/historico?tab=ferramentas" replace />} />
                    <Route path="/admin/historico" element={<Layout><AdminHistorico /></Layout>} />
                    <Route path="/admin/logs" element={<Navigate to="/admin/auditoria?tab=logs" replace />} />
                    <Route path="/admin/analytics" element={<Navigate to="/admin/analytics-hub?tab=ferramentas" replace />} />
                    <Route path="/admin/analytics-hub" element={<Layout><AdminAnalyticsHub /></Layout>} />
                    <Route path="/admin/notifications" element={<Layout><AdminNotifications /></Layout>} />
                    <Route path="/admin/maintenance" element={<Navigate to="/admin" replace />} />
                    <Route path="/admin/reports" element={<Layout><AdminReports /></Layout>} />
                    <Route path="/admin/manual" element={<Layout><ManualEntry /></Layout>} />
                    <Route path="/admin/issues" element={<Navigate to="/admin/problemas?tab=ferramentas" replace />} />
                    <Route path="/admin/vehicle-issues" element={<Navigate to="/admin/problemas?tab=veiculos" replace />} />
                    <Route path="/admin/problemas" element={<Layout><AdminProblemas /></Layout>} />
                    <Route path="/admin/construction-sites" element={<Layout><AdminConstructionSites /></Layout>} />
                    <Route path="/admin/gallery" element={<Layout><AdminGallery /></Layout>} />
                    <Route path="/admin/data-retention" element={<Layout><AdminDataRetention /></Layout>} />
                    <Route path="/admin/audit" element={<Navigate to="/admin/auditoria?tab=auditoria" replace />} />
                    <Route path="/admin/auditoria" element={<Layout><AdminAuditoria /></Layout>} />
                    {/* AdminSiteTools route removed */}
                    
                    {/* Ponto Online Routes */}
                    <Route path="/ponto" element={<Navigate to="/ponto/registrar" replace />} />
                    <Route path="/ponto/registrar" element={<Layout><PontoRegister /></Layout>} />
                    <Route path="/ponto/historico" element={<Navigate to="/historico?tipo=ponto" replace />} />
                    <Route path="/ponto/admin" element={<Layout><PontoAdmin /></Layout>} />
                    {/* Materiais module removed */}
                    <Route path="/transferencias" element={<Layout><Transfers /></Layout>} />
                    <Route path="/meu-dia" element={<Navigate to="/historico" replace />} />
                    <Route path="/historico" element={<Layout><Historico /></Layout>} />
                    <Route path="/report-issue" element={<Layout><ReportIssue /></Layout>} />
                    <Route path="/changelog" element={<Layout><Changelog /></Layout>} />
                    <Route path="/mobile-settings" element={<Layout><MobileNavSettings /></Layout>} />
                    <Route path="/ajuda" element={<Layout><Help /></Layout>} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </AuthProvider>
            </OfflineProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
