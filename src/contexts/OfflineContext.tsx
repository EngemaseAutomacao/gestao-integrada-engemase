import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";
import { toast } from "sonner";
import { getPhotosByOperation, deletePhotosByOperation, clearAllOfflinePhotos, getOfflinePhotosCount } from "@/hooks/useOfflinePhotos";
import { uploadFileImage } from "@/lib/storageUtils";

interface PendingOperation {
  id: string;
  type: "checkout" | "checkin" | "issue" | "ponto_in" | "ponto_out" | "vehicle_checkout" | "vehicle_checkin";
  data: any;
  timestamp: number;
  retryCount: number;
  lastError: string | null;
  permanent_failure: boolean;
}

interface OfflineContextType {
  isOnline: boolean;
  pendingOperations: PendingOperation[];
  failedOperations: PendingOperation[];
  addPendingOperation: (type: PendingOperation["type"], data: any) => string;
  clearPendingOperations: () => void;
  syncPendingOperations: () => Promise<void>;
  dismissFailedOperation: (id: string) => void;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

const STORAGE_KEY = "engemase_pending_operations";
const FAILED_KEY = "engemase_failed_operations";
const ID_MAP_KEY = "engemase_local_to_server_ids";
const MAX_RETRIES = 5;

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch { return fallback; }
}

function saveToStorage(key: string, value: any) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {
    console.error("localStorage.setItem failed:", e);
  }
}

function isRecoverableError(error: any): boolean {
  if (!error) return true;
  const msg = typeof error === "string" ? error : error?.message || "";
  const code = error?.code || error?.status || 0;
  // Network errors
  if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("network")) return true;
  // HTTP recoverable
  if ([408, 429, 500, 502, 503, 504].includes(code)) return true;
  // Permanent errors: conflict, bad request, not found
  if ([400, 404, 409, 422].includes(code)) return false;
  // Default to recoverable
  return true;
}

function getBackoffMs(retryCount: number): number {
  return Math.min(2000 * Math.pow(2, retryCount), 30000);
}

// ID mapping for local-to-server resolution
function getIdMap(): Record<string, string> {
  return loadFromStorage(ID_MAP_KEY, {});
}
function setIdMap(map: Record<string, string>) {
  saveToStorage(ID_MAP_KEY, map);
}
function clearIdMap() {
  localStorage.removeItem(ID_MAP_KEY);
}

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingOperations, setPendingOperations] = useState<PendingOperation[]>(() =>
    loadFromStorage(STORAGE_KEY, [])
  );
  const [failedOperations, setFailedOperations] = useState<PendingOperation[]>(() =>
    loadFromStorage(FAILED_KEY, [])
  );

  const pendingOpsRef = useRef(pendingOperations);
  pendingOpsRef.current = pendingOperations;

  const isOnlineRef = useRef(isOnline);
  isOnlineRef.current = isOnline;

  const isSyncing = useRef(false);

  useEffect(() => {
    saveToStorage(STORAGE_KEY, pendingOperations);
  }, [pendingOperations]);

  useEffect(() => {
    saveToStorage(FAILED_KEY, failedOperations);
  }, [failedOperations]);

  const addPendingOperation = useCallback((type: PendingOperation["type"], data: any): string => {
    const id = crypto.randomUUID();
    const operation: PendingOperation = {
      id,
      type,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      lastError: null,
      permanent_failure: false,
    };
    setPendingOperations((prev) => [...prev, operation]);

    // Register Background Sync if available
    if ("serviceWorker" in navigator && "SyncManager" in window) {
      navigator.serviceWorker.ready.then(sw => {
        (sw as any).sync?.register?.("sync-pending").catch(() => {});
      }).catch(() => {});
    }

    return id;
  }, []);

  const clearPendingOperations = useCallback(() => {
    setPendingOperations([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const dismissFailedOperation = useCallback((id: string) => {
    setFailedOperations(prev => prev.filter(op => op.id !== id));
  }, []);

  const syncPhotosForOperation = useCallback(async (supabaseClient: any, op: PendingOperation) => {
    const photos = await getPhotosByOperation(op.id);
    if (photos.length === 0) return {};

    const photoUrls: Record<string, string> = {};
    const folder = op.type === "vehicle_checkout" ? "saidas" : "entradas";
    const suffix = op.type === "vehicle_checkout" ? "out" : "in";

    for (const photo of photos) {
      const prefix = `${photo.angleKey}_${suffix}`;
      const blob = new File([photo.blob], photo.fileName, { type: photo.blob.type || "image/jpeg" });
      const url = await uploadFileImage(blob, prefix, "veiculos", folder);

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
  }, []);

  // Sync photos stored in IndexedDB for ponto/tool operations
  const syncGenericPhotos = useCallback(async (op: PendingOperation) => {
    const photos = await getPhotosByOperation(op.id);
    if (photos.length === 0) return null;

    // Upload first photo found
    const photo = photos[0];
    const blob = new File([photo.blob], photo.fileName, { type: photo.blob.type || "image/jpeg" });
    const { uploadFileImage: uploadFn } = await import("@/lib/storageUtils");
    const folder = op.type === "ponto_out" ? "entradas" : "saidas";
    const url = await uploadFn(blob, "photo", "ferramentas", folder);
    await deletePhotosByOperation(op.id);
    return url;
  }, []);

  const syncPendingOperations = useCallback(async () => {
    const ops = pendingOpsRef.current;
    if (!isOnlineRef.current || ops.length === 0 || isSyncing.current) return;

    isSyncing.current = true;
    const { supabase } = await import("@/integrations/supabase/client");
    let successCount = 0;
    let retryOps: PendingOperation[] = [];
    let newFailed: PendingOperation[] = [];
    const idMap = getIdMap();

    for (const op of ops) {
      try {
        if (op.type === "checkout") {
          // Upload photo from IndexedDB if available
          const photoUrl = await syncGenericPhotos(op);
          if (photoUrl && !op.data.checkout_photo_url) {
            op.data.checkout_photo_url = photoUrl;
          }
          const { error } = await supabase.from("tool_checkouts").insert(op.data);
          if (error) throw error;

        } else if (op.type === "checkin") {
          // Resolve local ID if needed
          const realId = idMap[op.data.checkoutId] ?? op.data.checkoutId;
          // Upload photo from IndexedDB if available
          const photoUrl = await syncGenericPhotos(op);
          if (photoUrl && !op.data.updates.checkin_photo_url) {
            op.data.updates.checkin_photo_url = photoUrl;
          }
          const { error } = await supabase.from("tool_checkouts").update(op.data.updates).eq("id", realId);
          if (error) throw error;

        } else if (op.type === "issue") {
          const { error } = await supabase.from("tool_issues").insert(op.data);
          if (error) throw error;

        } else if (op.type === "ponto_in") {
          // Upload photo from IndexedDB if available
          const photoUrl = await syncGenericPhotos(op);
          if (photoUrl && !op.data.clock_in_photo_url) {
            op.data.clock_in_photo_url = photoUrl;
          }
          const { data, error } = await supabase.from("time_entries").insert(op.data).select("id").single();
          if (error) throw error;
          // Map local ID to server ID for dependent ponto_out
          if (data?.id && op.data._local_id) {
            idMap[op.data._local_id] = data.id;
            // Clean internal field
            delete op.data._local_id;
          }

        } else if (op.type === "ponto_out") {
          // Resolve local entry ID to server ID
          const realEntryId = idMap[op.data.entryId] ?? op.data.entryId;
          // Upload photo from IndexedDB if available
          const photoUrl = await syncGenericPhotos(op);
          if (photoUrl && !op.data.updates.clock_out_photo_url) {
            op.data.updates.clock_out_photo_url = photoUrl;
          }
          const { error } = await supabase.from("time_entries").update(op.data.updates).eq("id", realEntryId);
          if (error) throw error;

        } else if (op.type === "vehicle_checkout") {
          const photoUrls = await syncPhotosForOperation(supabase, op);
          const insertData = { ...op.data, ...photoUrls };
          const { data, error } = await supabase.from("vehicle_checkouts").insert(insertData).select("id").single();
          if (error) throw error;
          // Map local ID for vehicle_checkin
          if (data?.id && op.data._local_id) {
            idMap[op.data._local_id] = data.id;
            delete op.data._local_id;
          }

        } else if (op.type === "vehicle_checkin") {
          // Resolve local checkout ID
          const realCheckoutId = idMap[op.data.checkoutId] ?? op.data.checkoutId;
          const photoUrls = await syncPhotosForOperation(supabase, op);
          const updateData = { ...op.data.updates, ...photoUrls };
          const { error } = await supabase.from("vehicle_checkouts").update(updateData).eq("id", realCheckoutId);
          if (error) throw error;
        }

        successCount++;
      } catch (error: any) {
        console.error("Erro ao sincronizar operação:", error);
        const errMsg = error?.message || String(error);

        if (isRecoverableError(error) && op.retryCount < MAX_RETRIES) {
          retryOps.push({
            ...op,
            retryCount: op.retryCount + 1,
            lastError: errMsg,
          });
        } else {
          newFailed.push({
            ...op,
            lastError: errMsg,
            permanent_failure: true,
          });
        }
      }
    }

    // Save ID map
    setIdMap(idMap);

    if (successCount > 0) {
      toast.success(`${successCount} operação(ões) sincronizada(s) com sucesso!`);
    }

    if (newFailed.length > 0) {
      toast.error(`${newFailed.length} operação(ões) falharam permanentemente.`);
      setFailedOperations(prev => [...prev, ...newFailed]);
    }

    if (retryOps.length > 0) {
      toast.warning(`${retryOps.length} operação(ões) serão tentadas novamente.`);
      setPendingOperations(retryOps);
    } else {
      clearPendingOperations();
      // Clean up ID map if everything synced
      if (newFailed.length === 0) {
        clearIdMap();
      }
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

    isSyncing.current = false;

    // Schedule retry with backoff for recoverable ops
    if (retryOps.length > 0) {
      const maxRetry = Math.max(...retryOps.map(o => o.retryCount));
      const delay = getBackoffMs(maxRetry);
      setTimeout(() => {
        if (isOnlineRef.current) syncPendingOperations();
      }, delay);
    }
  }, [syncPhotosForOperation, syncGenericPhotos, clearPendingOperations]);

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
  }, [syncPendingOperations]);

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        pendingOperations,
        failedOperations,
        addPendingOperation,
        clearPendingOperations,
        syncPendingOperations,
        dismissFailedOperation,
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
