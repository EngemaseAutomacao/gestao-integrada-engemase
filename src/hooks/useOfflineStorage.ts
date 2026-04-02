import { useState, useEffect } from "react";

const CACHE_PREFIX = "engemase_cache_";

export function useOfflineStorage<T>(key: string, initialData: T | null = null) {
  const [data, setData] = useState<T | null>(initialData);
  const [isLoading, setIsLoading] = useState(true);

  const cacheKey = `${CACHE_PREFIX}${key}`;

  useEffect(() => {
    loadFromCache();
  }, [key]);

  const loadFromCache = () => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Support both old format (with timestamp wrapper) and new format (raw data)
        const cachedData = parsed?.data !== undefined && parsed?.timestamp !== undefined
          ? parsed.data
          : parsed;
        setData(cachedData);
      }
    } catch (error) {
      console.error("Error loading from cache:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveToCache = (newData: T) => {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(newData));
      setData(newData);
    } catch (error) {
      console.error("Error saving to cache:", error);
    }
  };

  const clearCache = () => {
    localStorage.removeItem(cacheKey);
    setData(null);
  };

  return {
    data,
    isLoading,
    saveToCache,
    clearCache,
  };
}
