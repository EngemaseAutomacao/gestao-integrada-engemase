import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface UrgencyData {
  toolOverdue: number;
  toolPending: number;
  toolIssuesOpen: number;
  vehicleOverdue: number;
  vehiclePending: number;
  vehicleIssuesOpen: number;
}

export function useUrgencyBadges() {
  const { profile } = useAuth();

  const { data } = useQuery({
    queryKey: ["urgency-badges", profile?.id],
    queryFn: async (): Promise<UrgencyData> => {
      if (!profile?.id) return { 
        toolOverdue: 0, 
        toolPending: 0, 
        toolIssuesOpen: 0, 
        vehicleOverdue: 0, 
        vehiclePending: 0, 
        vehicleIssuesOpen: 0 
      };

      const now = new Date().toISOString();

      // Overdue tools
      const toolOverdueQuery = supabase
        .from("tool_checkouts")
        .select("id", { count: "exact", head: true })
        .eq("status", "checked_out")
        .eq("user_id", profile.id)
        .lt("estimated_return_date", now);

      // Pending tools (total in use)
      const toolPendingQuery = supabase
        .from("tool_checkouts")
        .select("id", { count: "exact", head: true })
        .eq("status", "checked_out")
        .eq("user_id", profile.id);

      // Pending vehicles
      const vehiclePendingQuery = supabase
        .from("vehicle_checkouts")
        .select("id", { count: "exact", head: true })
        .eq("status", "checked_out")
        .eq("user_id", profile.id);

      // Open issues reported by the current user
      const toolIssuesQuery = supabase
        .from("tool_issues")
        .select("id", { count: "exact", head: true })
        .in("status", ["open", "in_progress"])
        .eq("reported_by", profile.id);

      const vehicleIssuesQuery = supabase
        .from("vehicle_issues")
        .select("id", { count: "exact", head: true })
        .in("status", ["open", "in_progress"])
        .eq("reported_by", profile.id);

      const [toolOverdueRes, toolPendingRes, vehiclePendingRes, toolIssuesRes, vehicleIssuesRes] = await Promise.all([
        toolOverdueQuery,
        toolPendingQuery,
        vehiclePendingQuery,
        toolIssuesQuery,
        vehicleIssuesQuery,
      ]);

      return {
        toolOverdue: toolOverdueRes.count || 0,
        toolPending: toolPendingRes.count || 0,
        toolIssuesOpen: toolIssuesRes.count || 0,
        vehicleOverdue: 0, // Placeholder
        vehiclePending: vehiclePendingRes.count || 0,
        vehicleIssuesOpen: vehicleIssuesRes.count || 0,
      };
    },
    enabled: !!profile?.id,
    refetchInterval: 60000,
  });

  const toolBadgeCount = (data?.toolOverdue || 0) + (data?.toolIssuesOpen || 0);
  const vehicleBadgeCount = (data?.vehicleOverdue || 0) + (data?.vehicleIssuesOpen || 0);

  return {
    toolBadgeCount,
    vehicleBadgeCount,
    toolPending: data?.toolPending || 0,
    toolOverdue: data?.toolOverdue || 0,
    toolIssuesOpen: data?.toolIssuesOpen || 0,
    vehiclePending: data?.vehiclePending || 0,
    vehicleOverdue: data?.vehicleOverdue || 0,
    vehicleIssuesOpen: data?.vehicleIssuesOpen || 0,
  };
}
