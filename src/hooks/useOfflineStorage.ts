import { useState, useEffect } from "react";

const CACHE_PREFIX = "engemase_cache_";
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheWrapper<T> {
  data: T;
  timestamp: number;
}

export function useOfflineStorage<T>(key: string, initialData: T | null = null, ttlMs: number = DEFAULT_TTL_MS) {
  const [data, setData] = useState<T | null>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [isStale, setIsStale] = useState(false);

  const cacheKey = `${CACHE_PREFIX}${key}`;

  useEffect(() => {
    loadFromCache();
  }, [key]);

  const loadFromCache = () => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Support old format (raw data without timestamp) and new format (with wrapper)
        if (parsed?.data !== undefined && parsed?.timestamp !== undefined) {
          const age = Date.now() - parsed.timestamp;
          setIsStale(age > ttlMs);
          setData(parsed.data);
        } else {
          // Legacy format without timestamp — treat as stale
          setIsStale(true);
          setData(parsed);
        }
      }
    } catch (error) {
      console.error("Error loading from cache:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveToCache = (newData: T) => {
    try {
      const wrapper: CacheWrapper<T> = { data: newData, timestamp: Date.now() };
      localStorage.setItem(cacheKey, JSON.stringify(wrapper));
      setData(newData);
      setIsStale(false);
    } catch (error) {
      console.error("Error saving to cache:", error);
    }
  };

  const clearCache = () => {
    localStorage.removeItem(cacheKey);
    setData(null);
    setIsStale(false);
  };

  return {
    data,
    isLoading,
    isStale,
    saveToCache,
    clearCache,
  };
}
