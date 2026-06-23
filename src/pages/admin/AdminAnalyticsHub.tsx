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
      <div className="hidden sm:block">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Analytics</h2>
        <p className="text-muted-foreground">Estatísticas de ferramentas</p>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <AdminAnalytics />
      </Suspense>
    </div>
  );
}
