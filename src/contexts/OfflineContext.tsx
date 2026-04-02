import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { toast } from "sonner";
import { getPhotosByOperation, deletePhotosByOperation, clearAllOfflinePhotos, getOfflinePhotosCount } from "@/hooks/useOfflinePhotos";

interface PendingOperation {
  id: string;
  type: "checkout" | "checkin" | "issue" | "ponto_in" | "ponto_out" | "vehicle_checkout" | "vehicle_checkin";
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

  const uploadOfflinePhoto = async (supabase: any, file: Blob, fileName: string, folder: string, prefix: string) => {
    const fileExt = fileName.split(".").pop() || "jpg";
    const seq = String(Date.now()).slice(-6);
    const dateFolder = new Date().toISOString().slice(0, 10);
    const filePath = `veiculos/${folder}/${dateFolder}/${prefix}_${seq}.${fileExt}`;
    const { error } = await supabase.storage.from("imagens").upload(filePath, file);
    if (error) throw error;
    return filePath;
  };

  const syncPhotosForOperation = async (supabase: any, op: PendingOperation) => {
    const photos = await getPhotosByOperation(op.id);
    if (photos.length === 0) return {};

    const photoUrls: Record<string, string> = {};
    const folder = op.type === "vehicle_checkout" ? "saidas" : "entradas";
    const suffix = op.type === "vehicle_checkout" ? "out" : "in";

    for (const photo of photos) {
      const prefix = `${photo.angleKey}_${suffix}`;
      const url = await uploadOfflinePhoto(supabase, photo.blob, photo.fileName, folder, prefix);
      
      const fieldMap: Record<string, string> = {
        front: op.type === "vehicle_checkout" ? "photo_front_checkout" : "photo_front_checkin",
        back: op.type === "vehicle_checkout" ? "photo_back_checkout" : "photo_back_checkin",
        left: op.type === "vehicle_checkout" ? "photo_left_checkout" : "photo_left_checkin",
        right: op.type === "vehicle_checkout" ? "photo_right_checkout" : "photo_right_checkin",
        dashboard: op.type === "vehicle_checkout" ? "photo_dashboard_checkout" : "photo_dashboard_checkin",
      };
      
      if (fieldMap[photo.angleKey]) {
        photoUrls[fieldMap[photo.angleKey]] = url;
      }
    }

    await deletePhotosByOperation(op.id);
    return photoUrls;
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
        } else if (op.type === "vehicle_checkout") {
          // Upload offline photos from IndexedDB
          const photoUrls = await syncPhotosForOperation(supabase, op);
          const insertData = { ...op.data, ...photoUrls };
          const { error } = await supabase
            .from("vehicle_checkouts")
            .insert(insertData);
          if (error) throw error;
        } else if (op.type === "vehicle_checkin") {
          // Upload offline photos from IndexedDB
          const photoUrls = await syncPhotosForOperation(supabase, op);
          const updateData = { ...op.data.updates, ...photoUrls };
          const { error } = await supabase
            .from("vehicle_checkouts")
            .update(updateData)
            .eq("id", op.data.checkoutId);
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
      // Clean up IndexedDB when no pending operations remain
      try {
        const remainingPhotos = await getOfflinePhotosCount();
        if (remainingPhotos > 0) {
          await clearAllOfflinePhotos();
          console.log("IndexedDB photos cleaned up after full sync");
        }
      } catch (e) {
        console.error("Error cleaning IndexedDB:", e);
      }
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
