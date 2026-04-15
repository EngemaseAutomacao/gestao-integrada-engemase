const NOMINATIM = "https://nominatim.openstreetmap.org";
const OSRM = "https://router.project-osrm.org";
const HEADERS: Record<string, string> = {
  "Accept-Language": "pt-BR",
  "User-Agent": "EngemaseApp/1.0 (contato@engemase.com.br)",
};

// Simple LRU cache for reverse geocode results (last 10)
const geocodeCache = new Map<string, string | null>();
const CACHE_MAX = 10;
const COORD_PRECISION = 4; // ~11m precision

function roundedKey(lat: number, lon: number): string {
  return `${lat.toFixed(COORD_PRECISION)},${lon.toFixed(COORD_PRECISION)}`;
}

export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  const key = roundedKey(lat, lon);
  if (geocodeCache.has(key)) return geocodeCache.get(key)!;

  try {
    const res = await fetch(
      `${NOMINATIM}/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
      { headers: HEADERS }
    );
    const data = await res.json();
    const raw = data.display_name as string | undefined;
    const result = raw ? raw.split(", ").filter((p) => !p.match(/^Região /i)).join(", ") : null;

    if (geocodeCache.size >= CACHE_MAX) {
      const firstKey = geocodeCache.keys().next().value;
      if (firstKey !== undefined) geocodeCache.delete(firstKey);
    }
    geocodeCache.set(key, result);
    return result;
  } catch {
    return null;
  }
}

export async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const res = await fetch(
      `${NOMINATIM}/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=br`,
      { headers: HEADERS }
    );
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

export interface RouteEstimate {
  distance_km: number;
  duration_minutes: number;
}

export async function calculateRoute(
  origin: { lat: number; lon: number },
  destination: { lat: number; lon: number }
): Promise<RouteEstimate | null> {
  try {
    const res = await fetch(
      `${OSRM}/route/v1/driving/${origin.lon},${origin.lat};${destination.lon},${destination.lat}?overview=false`
    );
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.length) return null;
    const route = data.routes[0];
    return {
      distance_km: Math.round((route.distance / 1000) * 10) / 10,
      duration_minutes: Math.round(route.duration / 60),
    };
  } catch {
    return null;
  }
}
