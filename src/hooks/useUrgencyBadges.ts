import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface UrgencyData {
  toolOverdue: number;
  toolIssuesOpen: number;
  vehicleOverdue: number;
  vehicleIssuesOpen: number;
}

export function useUrgencyBadges() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  const { data } = useQuery({
    queryKey: ["urgency-badges", profile?.id, isAdmin],
    queryFn: async (): Promise<UrgencyData> => {
      if (!profile?.id) return { toolOverdue: 0, toolIssuesOpen: 0, vehicleOverdue: 0, vehicleIssuesOpen: 0 };

      const now = new Date().toISOString();

      // Always show only the current user's own pending items
      const toolCheckoutsQuery = supabase
        .from("tool_checkouts")
        .select("id", { count: "exact", head: true })
        .eq("status", "checked_out")
        .eq("user_id", profile.id)
        .lt("estimated_return_date", now);

      const vehicleCheckoutsQuery = supabase
        .from("vehicle_checkouts")
        .select("id", { count: "exact", head: true })
        .eq("status", "checked_out")
        .eq("user_id", profile.id)
        .lt("estimated_return_time", new Date().toTimeString().slice(0, 5));

      // Open issues reported by the current user only
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

      const [toolOverdueRes, toolIssuesRes, vehicleIssuesRes] = await Promise.all([
        toolCheckoutsQuery,
        toolIssuesQuery,
        vehicleIssuesQuery,
      ]);

      return {
        toolOverdue: toolOverdueRes.count || 0,
        toolIssuesOpen: toolIssuesRes.count || 0,
        vehicleOverdue: 0, // vehicle overdue is time-based, harder to query accurately
        vehicleIssuesOpen: vehicleIssuesRes.count || 0,
      };
    },
    enabled: !!profile?.id,
    refetchInterval: 60000, // Refresh every minute
  });

  const toolBadgeCount = (data?.toolOverdue || 0) + (data?.toolIssuesOpen || 0);
  const vehicleBadgeCount = (data?.vehicleOverdue || 0) + (data?.vehicleIssuesOpen || 0);

  return {
    toolBadgeCount,
    vehicleBadgeCount,
    toolOverdue: data?.toolOverdue || 0,
    toolIssuesOpen: data?.toolIssuesOpen || 0,
    vehicleOverdue: data?.vehicleOverdue || 0,
    vehicleIssuesOpen: data?.vehicleIssuesOpen || 0,
  };
}
