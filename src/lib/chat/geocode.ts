/**
 * geocode.ts — Geocodificación con Nominatim (OpenStreetMap).
 *
 * Gratis y sin API key, pero con rate limit de 1 req/segundo y
 * User-Agent descriptivo obligatorio. El cache in-memory evita
 * repetir calls por la misma dirección dentro de la vida del server.
 */

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT =
  "observatorio-inflacion-ar/0.1 (chat de compras; contacto: ferreyralorenzo2@gmail.com)";

const globalForGeocode = globalThis as unknown as {
  __geocodeCache: Map<string, { lat: number; lng: number } | null> | undefined;
};

const cache: Map<string, { lat: number; lng: number } | null> =
  globalForGeocode.__geocodeCache ??
  (globalForGeocode.__geocodeCache = new Map());

async function queryNominatim(
  q: string,
): Promise<{ lat: number; lng: number } | null> {
  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(q)}&format=json&limit=1`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;

  const results = (await res.json()) as { lat: string; lon: string }[];
  if (!Array.isArray(results) || results.length === 0) return null;

  const lat = parseFloat(results[0].lat);
  const lng = parseFloat(results[0].lon);
  if (isNaN(lat) || isNaN(lng)) return null;
  return { lat, lng };
}

/**
 * Convierte una dirección o barrio en coordenadas. Devuelve null si
 * Nominatim no encuentra nada o falla (el caller sigue sin geocoding).
 */
export async function geocode(
  address: string,
): Promise<{ lat: number; lng: number } | null> {
  const key = address.trim().toLowerCase();
  if (!key) return null;

  if (cache.has(key)) return cache.get(key) ?? null;

  try {
    const withCountry = /argentina/i.test(key) ? key : `${key}, Argentina`;
    let result = await queryNominatim(withCountry);

    // Un barrio suelto ("Flores") suele necesitar la ciudad para resolver.
    if (!result && !key.includes(",")) {
      result = await queryNominatim(`${key}, Buenos Aires, Argentina`);
    }

    cache.set(key, result);
    return result;
  } catch {
    // No cachear errores de red: puede ser transitorio.
    return null;
  }
}
