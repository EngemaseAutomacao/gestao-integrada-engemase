import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TransferInfo {
  id: string;
  status: string;
  to_user: string | null;
}

export function useTransferStatus(checkoutIds: string[], assetType: "tool" | "vehicle") {
  const [transfers, setTransfers] = useState<Record<string, TransferInfo>>({});

  const load = useCallback(async () => {
    if (checkoutIds.length === 0) return;

    const column = assetType === "tool" ? "tool_checkout_id" : "vehicle_checkout_id";

    const { data, error } = await supabase
      .from("asset_transfers")
      .select(`
        id,
        status,
        ${column},
        to_user:profiles!asset_transfers_to_user_id_fkey(full_name)
      `)
      .in(column, checkoutIds)
      .in("status", ["pending", "accepted", "approved"]);

    if (error) {
      console.error("Erro ao carregar transferências:", error);
      return;
    }

    const map: Record<string, TransferInfo> = {};
    for (const t of data || []) {
      const checkoutId = (t as any)[column];
      if (checkoutId) {
        map[checkoutId] = {
          id: t.id,
          status: t.status,
          to_user: (t.to_user as any)?.full_name || null,
        };
      }
    }
    setTransfers(map);
  }, [checkoutIds.join(","), assetType]);

  useEffect(() => {
    load();
  }, [load]);

  return { transfers, reload: load };
}
