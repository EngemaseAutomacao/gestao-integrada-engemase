import { useSearchParams, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { Wrench, Car } from "lucide-react";
import { DashboardSkeleton } from "@/components/PageSkeleton";

const AdminHistory = lazy(() => import("./AdminHistory"));
const AdminVehicleHistory = lazy(() => import("./AdminVehicleHistory"));

export default function AdminHistorico() {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "ferramentas";

  if (!profile || profile.role !== "admin") {
    return <Navigate to="/" />;
  }

  return (
    <div className="space-y-6">
      <div className="hidden sm:block">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Histórico Geral</h2>
        <p className="text-muted-foreground">Movimentações de ferramentas e veículos</p>
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
            <AdminHistory />
          </Suspense>
        </TabsContent>

        <TabsContent value="veiculos" className="mt-4">
          <Suspense fallback={<DashboardSkeleton />}>
            <AdminVehicleHistory />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
