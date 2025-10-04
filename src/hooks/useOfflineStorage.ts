import { useState, useEffect } from "react";

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

const CACHE_PREFIX = "engemase_cache_";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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
        const cacheItem: CacheItem<T> = JSON.parse(cached);
        const now = Date.now();
        
        // Check if cache is still valid
        if (now - cacheItem.timestamp < CACHE_DURATION) {
          setData(cacheItem.data);
        } else {
          localStorage.removeItem(cacheKey);
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
      const cacheItem: CacheItem<T> = {
        data: newData,
        timestamp: Date.now(),
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
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
