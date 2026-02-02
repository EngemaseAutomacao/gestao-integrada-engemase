import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { OfflineProvider } from "@/contexts/OfflineContext";
import Layout from "@/components/Layout";
import Auth from "./pages/Auth";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Tools from "./pages/Tools";
import ToolDetail from "./pages/ToolDetail";
import Checkout from "./pages/Checkout";
import Checkin from "./pages/Checkin";
import UserHistory from "./pages/UserHistory";
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
import ReportIssue from "./pages/ReportIssue";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <OfflineProvider>
          <AuthProvider>
            <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<Layout><Dashboard /></Layout>} />
            <Route path="/tools" element={<Layout><Tools /></Layout>} />
            <Route path="/tools/:id" element={<Layout><ToolDetail /></Layout>} />
            <Route path="/checkout" element={<Layout><Checkout /></Layout>} />
            <Route path="/checkin" element={<Layout><Checkin /></Layout>} />
            <Route path="/history" element={<Layout><UserHistory /></Layout>} />
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </OfflineProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
