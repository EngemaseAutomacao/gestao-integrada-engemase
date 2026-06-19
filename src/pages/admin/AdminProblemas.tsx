import { useSearchParams, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { Wrench, Car } from "lucide-react";
import { DashboardSkeleton } from "@/components/PageSkeleton";

const AdminIssues = lazy(() => import("./AdminIssues"));
const AdminVehicleIssues = lazy(() => import("./AdminVehicleIssues"));

export default function AdminProblemas() {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "ferramentas";

  if (!profile || profile.role !== "admin") {
    return <Navigate to="/" />;
  }

  return (
    <div className="space-y-6">
      <div className="hidden sm:block">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Problemas Reportados</h2>
        <p className="text-muted-foreground">Gerencie problemas reportados de ferramentas e veículos</p>
      </div>

      <Tabs value={activeTab} onValueChange={(val) => setSearchParams({ tab: val })} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="ferramentas" className="gap-2">
            <Wrench className="w-4 h-4" />
            Ferramentas
          </TabsTrigger>
          <TabsTrigger value="veiculos" className="gap-2">
            <Car className="w-4 h-4" />
            Veículos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ferramentas" className="mt-4">
          <Suspense fallback={<DashboardSkeleton />}>
            <AdminIssues />
          </Suspense>
        </TabsContent>

        <TabsContent value="veiculos" className="mt-4">
          <Suspense fallback={<DashboardSkeleton />}>
            <AdminVehicleIssues />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
