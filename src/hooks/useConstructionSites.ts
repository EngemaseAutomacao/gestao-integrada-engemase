import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useActiveConstructionSites() {
  return useQuery({
    queryKey: ["construction-sites-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("construction_sites")
        .select("id, name")
        .eq("active", true)
        .order("name", { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
