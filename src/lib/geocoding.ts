const NOMINATIM = "https://nominatim.openstreetmap.org";
const OSRM = "https://router.project-osrm.org";
const HEADERS = { "Accept-Language": "pt-BR" };

export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(
      `${NOMINATIM}/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
      { headers: HEADERS }
    );
    const data = await res.json();
    const raw = data.display_name as string | undefined;
    if (!raw) return null;
    return raw.split(", ").filter((p) => !p.match(/^Região /i)).join(", ");
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
