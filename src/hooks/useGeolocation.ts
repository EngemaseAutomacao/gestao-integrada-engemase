import { useState } from "react";

export interface Coords {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export function useGeolocation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentPosition = (opts?: PositionOptions): Promise<Coords> => {
    setLoading(true);
    setError(null);
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const msg = "Geolocalização não suportada";
        setError(msg);
        setLoading(false);
        reject(new Error(msg));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLoading(false);
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        },
        (err) => {
          setLoading(false);
          const msg = err.message || "Não foi possível obter a localização";
          setError(msg);
          reject(err);
        },
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 0, ...opts }
      );
    });
  };

  return { getCurrentPosition, loading, error };
}
