import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useHomePendingCount(userId: string | undefined) {
  return useQuery({
    queryKey: ["home-pending-count", userId],
    queryFn: async () => {
      if (!userId) return { total: 0, overdue: 0 };
      const { data, error } = await supabase
        .from("tool_checkouts")
        .select("id, estimated_return_date")
        .eq("user_id", userId)
        .eq("status", "checked_out");
      if (error) throw error;
      const now = Date.now();
      const total = data?.length || 0;
      const overdue =
        data?.filter(
          (r) => r.estimated_return_date && new Date(r.estimated_return_date).getTime() < now
        ).length || 0;
      return { total, overdue };
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}
