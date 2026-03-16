import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { toast } from "sonner";

interface PendingOperation {
  id: string;
  type: "checkout" | "checkin" | "issue" | "ponto_in" | "ponto_out";
  data: any;
  timestamp: number;
}

interface OfflineContextType {
  isOnline: boolean;
  pendingOperations: PendingOperation[];
  addPendingOperation: (type: PendingOperation["type"], data: any) => void;
  clearPendingOperations: () => void;
  syncPendingOperations: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

const STORAGE_KEY = "engemase_pending_operations";

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingOperations, setPendingOperations] = useState<PendingOperation[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Conexão restaurada! Sincronizando dados...");
      syncPendingOperations();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("Você está offline. As operações serão sincronizadas quando a conexão for restaurada.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingOperations));
  }, [pendingOperations]);

  const addPendingOperation = (type: PendingOperation["type"], data: any) => {
    const operation: PendingOperation = {
      id: crypto.randomUUID(),
      type,
      data,
      timestamp: Date.now(),
    };
    setPendingOperations((prev) => [...prev, operation]);
  };

  const clearPendingOperations = () => {
    setPendingOperations([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const syncPendingOperations = async () => {
    if (!isOnline || pendingOperations.length === 0) return;

    const { supabase } = await import("@/integrations/supabase/client");
    let successCount = 0;
    let failedOps: PendingOperation[] = [];

    for (const op of pendingOperations) {
      try {
        if (op.type === "checkout") {
          const { error } = await supabase
            .from("tool_checkouts")
            .insert(op.data);
          if (error) throw error;
        } else if (op.type === "checkin") {
          const { error } = await supabase
            .from("tool_checkouts")
            .update(op.data.updates)
            .eq("id", op.data.checkoutId);
          if (error) throw error;
        } else if (op.type === "issue") {
          const { error } = await supabase
            .from("tool_issues")
            .insert(op.data);
          if (error) throw error;
        } else if (op.type === "ponto_in") {
          const { error } = await supabase
            .from("time_entries")
            .insert(op.data);
          if (error) throw error;
        } else if (op.type === "ponto_out") {
          const { error } = await supabase
            .from("time_entries")
            .update(op.data.updates)
            .eq("id", op.data.entryId);
          if (error) throw error;
        }
        successCount++;
      } catch (error) {
        console.error("Erro ao sincronizar operação:", error);
        failedOps.push(op);
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} operação(ões) sincronizada(s) com sucesso!`);
    }

    if (failedOps.length > 0) {
      toast.error(`${failedOps.length} operação(ões) falharam ao sincronizar.`);
      setPendingOperations(failedOps);
    } else {
      clearPendingOperations();
    }
  };

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        pendingOperations,
        addPendingOperation,
        clearPendingOperations,
        syncPendingOperations,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error("useOffline must be used within OfflineProvider");
  }
  return context;
}
