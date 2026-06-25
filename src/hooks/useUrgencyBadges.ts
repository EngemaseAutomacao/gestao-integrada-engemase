import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface UrgencyData {
  toolOverdue: number;
  toolPending: number;
  vehicleOverdue: number;
  vehiclePending: number;
}

export function useUrgencyBadges() {
  const { profile } = useAuth();

  const { data } = useQuery({
    queryKey: ["urgency-badges", profile?.id],
    queryFn: async (): Promise<UrgencyData> => {
      if (!profile?.id) {
        return { toolOverdue: 0, toolPending: 0, vehicleOverdue: 0, vehiclePending: 0 };
      }

      const now = new Date().toISOString();

      const [toolOverdueRes, toolPendingRes, vehiclePendingRes] = await Promise.all([
        supabase
          .from("tool_checkouts")
          .select("id", { count: "exact", head: true })
          .eq("status", "checked_out")
          .eq("user_id", profile.id)
          .lt("estimated_return_date", now),
        supabase
          .from("tool_checkouts")
          .select("id", { count: "exact", head: true })
          .eq("status", "checked_out")
          .eq("user_id", profile.id),
        supabase
          .from("vehicle_checkouts")
          .select("id", { count: "exact", head: true })
          .eq("status", "checked_out")
          .eq("user_id", profile.id),
      ]);

      return {
        toolOverdue: toolOverdueRes.count || 0,
        toolPending: toolPendingRes.count || 0,
        vehicleOverdue: 0,
        vehiclePending: vehiclePendingRes.count || 0,
      };
    },
    enabled: !!profile?.id,
    refetchInterval: 60000,
  });

  return {
    toolBadgeCount: data?.toolOverdue || 0,
    vehicleBadgeCount: data?.vehicleOverdue || 0,
    toolPending: data?.toolPending || 0,
    toolOverdue: data?.toolOverdue || 0,
    vehiclePending: data?.vehiclePending || 0,
    vehicleOverdue: data?.vehicleOverdue || 0,
  };
}
