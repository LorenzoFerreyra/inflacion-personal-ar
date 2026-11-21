/**
 * recommend.ts — Algoritmo de recomendación de supermercados.
 *
 * Recibe el pedido como keywords con sus EANs candidatos (variantes casi
 * iguales de un mismo producto genérico). Por cada cadena elige la variante
 * más barata disponible de cada keyword — nunca suma variantes duplicadas —
 * y rankea por un score compuesto de precio total y distancia a la sucursal
 * más cercana. Menor score = mejor.
 *
 * Cobertura: con ubicación, solo compiten las cadenas que tienen una
 * sucursal relevada (tabla sucursales, la misma del mapa de /cobertura)
 * dentro del radio. Si no hay ninguna, se devuelve la sucursal relevada más
 * cercana para que el asistente le diga al usuario que su zona no está
 * cubierta.
 */

import {
  getBranches,
  getLatestChainPricesByEan,
  getLatestDate,
  getProducts,
} from "@/lib/database";
import type { Branch } from "@/lib/types";
import type {
  ChainRecommendation,
  CoverageInfo,
  NearestBranch,
  Priority,
  ProductRequest,
  Recommendation,
} from "./types";

const EARTH_RADIUS_KM = 6371;
const TOP_N = 3;
/** Además de la más cercana, cuántas sucursales relevadas por cadena se informan. */
const MAX_OTHER_BRANCHES = 5;
/** Radio de cobertura por defecto cuando el usuario no fijó uno. */
export const DEFAULT_COVERAGE_KM = 20;

/**
 * Clave de cadena tolerante a diferencias de carga entre tablas
 * ("super_top" en sucursales vs "supertop" en precios).
 */
export function chainKey(cadena: string): string {
  return cadena.toLowerCase().replace(/[\s_-]+/g, "");
}

const WEIGHTS: Record<Priority, { price: number; dist: number }> = {
  price: { price: 0.9, dist: 0.1 },
  distance: { price: 0.1, dist: 0.9 },
  balanced: { price: 0.5, dist: 0.5 },
};

/** Distancia en km entre dos puntos (fórmula haversine). */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

type RankedBranch = NearestBranch & { cadena: string; provincia: string };

/**
 * Sucursales de cada cadena (clave normalizada, solo con coordenadas
 * válidas) ordenadas por distancia al usuario, sin límite de distancia.
 */
function branchesByChain(
  branches: Branch[],
  userLat: number,
  userLng: number,
): Map<string, RankedBranch[]> {
  const byChain = new Map<string, RankedBranch[]>();
  for (const b of branches) {
    if (b.latitud == null || b.longitud == null) continue;
    const distancia_km = haversineKm(userLat, userLng, b.latitud, b.longitud);
    const key = chainKey(b.cadena);
    let list = byChain.get(key);
    if (!list) byChain.set(key, (list = []));
    list.push({
      cadena: b.cadena,
      provincia: b.provincia,
      direccion: b.direccion,
      localidad: b.localidad,
      distancia_km: Math.round(distancia_km * 10) / 10,
    });
  }
  for (const list of byChain.values()) list.sort((a, b) => a.distancia_km - b.distancia_km);
  return byChain;
}

const toNearest = (b: RankedBranch): NearestBranch => ({
  direccion: b.direccion,
  localidad: b.localidad,
  distancia_km: b.distancia_km,
});

function minMaxNorm(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return (value - min) / (max - min);
}

export async function recommend(
  items: ProductRequest[],
  userLat?: number,
  userLng?: number,
  priority: Priority = "balanced",
  radiusKm?: number,
): Promise<Recommendation> {
  const fecha_precios = await getLatestDate();
  const hasLocation = userLat != null && userLng != null;

  // Cobertura: qué cadenas tienen sucursales relevadas cerca del usuario.
  let cobertura: CoverageInfo | null = null;
  let byChainBranches = new Map<string, RankedBranch[]>();
  const coverageKm = radiusKm ?? DEFAULT_COVERAGE_KM;
  if (hasLocation) {
    byChainBranches = branchesByChain(await getBranches(), userLat, userLng);
    const all = [...byChainBranches.values()]
      .map((list) => list[0])
      .sort((a, b) => a.distancia_km - b.distancia_km);
    cobertura = {
      radio_km: coverageKm,
      cadenas_cerca: all.filter((b) => b.distancia_km <= coverageKm).map((b) => b.cadena),
      sucursal_relevada_mas_cercana: all[0] ?? null,
    };
  }

  const validItems = items.filter((i) => i.eans.length > 0);
  if (validItems.length === 0) return { cadenas: [], fecha_precios, cobertura };

  const allEans = [...new Set(validItems.flatMap((i) => i.eans))];

  // Descripciones para armar el detalle por producto.
  const { products } = await getProducts({
    eans: allEans,
    page: 1,
    pageSize: allEans.length,
  });
  const descByEan = new Map(products.map((p) => [p.ean, p.product_description]));

  // Matriz EAN × cadena → precio (última fecha disponible).
  const prices = await getLatestChainPricesByEan(allEans);
  const byChain = new Map<string, Map<string, number>>();
  for (const row of prices) {
    let chainPrices = byChain.get(row.cadena);
    if (!chainPrices) byChain.set(row.cadena, (chainPrices = new Map()));
    chainPrices.set(row.ean, row.precio);
  }
  if (byChain.size === 0) return { cadenas: [], fecha_precios, cobertura };

  interface Candidate extends Omit<ChainRecommendation, "score"> {
    score?: number;
  }

  const candidates: Candidate[] = [];
  for (const [cadena, chainPrices] of byChain) {
    // Con ubicación, solo compiten cadenas con una sucursal relevada dentro
    // del radio de cobertura (sin sucursales geolocalizadas → no sabemos si
    // está cerca, se descarta).
    let sucursal: NearestBranch | null = null;
    let otras: NearestBranch[] = [];
    if (hasLocation) {
      const near = (byChainBranches.get(chainKey(cadena)) ?? []).filter(
        (b) => b.distancia_km <= coverageKm,
      );
      if (near.length === 0) continue;
      sucursal = toNearest(near[0]);
      otras = near.slice(1, 1 + MAX_OTHER_BRANCHES).map(toNearest);
    }

    const productos: ChainRecommendation["productos"] = [];
    const faltantes: string[] = [];
    for (const item of validItems) {
      // La variante más barata de esta keyword que la cadena tiene.
      let best: { ean: string; precio: number } | null = null;
      for (const ean of item.eans) {
        const precio = chainPrices.get(ean);
        if (precio != null && (!best || precio < best.precio)) {
          best = { ean, precio };
        }
      }
      if (best) {
        productos.push({
          keyword: item.keyword,
          ean: best.ean,
          descripcion: descByEan.get(best.ean) ?? best.ean,
          precio: best.precio,
        });
      } else {
        faltantes.push(item.keyword);
      }
    }
    if (productos.length === 0) continue;

    candidates.push({
      cadena,
      total_precio: productos.reduce((sum, p) => sum + p.precio, 0),
      sucursal_cercana: sucursal,
      otras_sucursales_cerca: otras,
      productos,
      faltantes,
    });
  }

  if (candidates.length === 0) return { cadenas: [], fecha_precios, cobertura };

  // Normalización min-max de cada eje sobre el set de candidatas.
  const totals = candidates.map((c) => c.total_precio);
  const minTotal = Math.min(...totals);
  const maxTotal = Math.max(...totals);
  const dists = candidates
    .filter((c) => c.sucursal_cercana)
    .map((c) => c.sucursal_cercana!.distancia_km);
  const minDist = dists.length > 0 ? Math.min(...dists) : 0;
  const maxDist = dists.length > 0 ? Math.max(...dists) : 0;

  const { price: wPrice, dist: wDist } = WEIGHTS[priority];
  for (const c of candidates) {
    const normPrice = minMaxNorm(c.total_precio, minTotal, maxTotal);
    if (hasLocation && c.sucursal_cercana) {
      const normDist = minMaxNorm(
        c.sucursal_cercana.distancia_km,
        minDist,
        maxDist,
      );
      c.score = wPrice * normPrice + wDist * normDist;
    } else {
      // Sin ubicación (o cadena sin sucursales geolocalizadas): solo precio.
      c.score = normPrice;
    }
  }

  // Cadenas que cubren más keywords del pedido primero; a igual cobertura, por score.
  candidates.sort(
    (a, b) =>
      b.productos.length - a.productos.length || a.score! - b.score!,
  );

  const cadenas = candidates.slice(0, TOP_N).map((c) => ({
    ...c,
    score: Math.round(c.score! * 1000) / 1000,
  })) as ChainRecommendation[];

  return { cadenas, fecha_precios, cobertura };
}

