import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { setAppBadge, registerPeriodicSync } from "@/lib/pwa";

/**
 * Mantém o badge do ícone do app sincronizado com o número
 * de notificações não lidas. Também registra Periodic Background Sync (best-effort).
 */
export function useAppBadge() {
  const { user } = useAuth();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notifications-unread-count", user?.id],
    enabled: !!user?.id,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("read", false);
      if (error) return 0;
      return count ?? 0;
    },
  });

  useEffect(() => {
    setAppBadge(unreadCount);
  }, [unreadCount]);

  useEffect(() => {
    if (!user?.id) return;
    // Realtime: atualiza badge ao receber/marcar como lida
    const channel = supabase
      .channel(`badge-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => {
          // o refetch é tratado pelo refetchInterval; aqui força um set imediato leve
          supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("read", false)
            .then(({ count }) => setAppBadge(count ?? 0));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Registra periodic sync uma vez (best-effort, silencioso)
  useEffect(() => {
    if (!user?.id) return;
    registerPeriodicSync().catch(() => {});
  }, [user?.id]);
}
