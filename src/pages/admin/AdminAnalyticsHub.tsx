import { AdminPageHero } from "@/components/admin/AdminPageHero";
import { BarChart3 } from "lucide-react";
import { Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardSkeleton } from "@/components/PageSkeleton";

const AdminAnalytics = lazy(() => import("./AdminAnalytics"));

export default function AdminAnalyticsHub() {
  const { profile } = useAuth();

  if (!profile || profile.role !== "admin") {
    return <Navigate to="/" />;
  }

  return (
    <div className="space-y-6">
      <AdminPageHero icon={BarChart3} title="Analytics" subtitle="Estatísticas de ferramentas" />

      <Suspense fallback={<DashboardSkeleton />}>
        <AdminAnalytics />
      </Suspense>
    </div>
  );
}
