/**
 * database.ts — Capa de acceso a datos (SQLite)
 *
 * Todas las queries viven acá. El resto de la app nunca toca SQL directo.
 * La base de datos viene del scraper (no público) y tiene dos tablas principales:
 *   - price_series: registros diarios de precios por EAN y cadena
 *   - canonical_products: catálogo de productos con descripción, marca, categoría
 */

import Database from "better-sqlite3";
import path from "path";
import type {
  Product,
  PricePoint,
  ChainPrice,
  Category,
  Branch,
} from "./types";

// ─── Conexión ────────────────────────────────────────────────────────────────

import fs from "fs";

const DB_PATH = (() => {
  const p = path.resolve(
    process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "prices.db"),
  );
  if (!fs.existsSync(p)) {
    throw new Error(
      `Database file not found at ${p}. Set DATABASE_PATH env variable to the correct path.`,
    );
  }
  return p;
})();

/**
 * Singleton: una sola conexión reutilizada entre requests.
 * better-sqlite3 es sincrónico, ideal para Next.js API routes.
 */
const globalForDb = globalThis as unknown as {
  __db: Database.Database | undefined;
};

let db = globalForDb.__db;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH, { readonly: true });
    db.pragma("journal_mode = WAL");
    db.pragma("mmap_size = 268435456"); // 256MB
    globalForDb.__db = db;
    const normalizeFn = (str: unknown): string =>
      str != null ? stripDiacritics(String(str)) : "";
    db.function("normalize", normalizeFn);
  }
  return db;
}

interface CachedProduct extends Product {
  product_description_norm: string;
  marca_norm: string;
}

interface ProductsSnapshot {
  latestDate: string;
  baseDate: string | null;
  dias: number;
  products: CachedProduct[];
}

let productsSnapshot: ProductsSnapshot | null = null;

function getProductsSnapshot(dias: number): CachedProduct[] {
  const latestDate = (
    prepare("SELECT MAX(fecha) AS f FROM price_series").get() as { f: string | null }
  )?.f;
  if (!latestDate) return [];

  if (productsSnapshot && productsSnapshot.latestDate === latestDate && productsSnapshot.dias === dias) {
    return productsSnapshot.products;
  }

  const baseDateSql = "SELECT MIN(fecha) AS f FROM price_series WHERE fecha >= DATE('now', '-' || ? || ' days')";
  const baseDate = (prepare(baseDateSql).get(dias) as { f: string | null })?.f ?? null;

  const products = prepare(`
    WITH
    precio_actual AS (
      SELECT ean, AVG(precio_lista) AS precio_hoy, COUNT(DISTINCT cadena) AS cobertura_cadenas
      FROM price_series WHERE fecha = ? AND precio_lista > 0 GROUP BY ean
    ),
    precio_base AS (
      SELECT ean, AVG(precio_lista) AS precio_antes
      FROM price_series WHERE fecha = ? AND precio_lista > 0 GROUP BY ean
    )
    SELECT cp.ean, cp.product_description, cp.marca, cp.categoria, cp.image_url,
      ROUND(pa.precio_hoy, 0) AS precio_actual,
      CASE WHEN pb.precio_antes IS NOT NULL AND pb.precio_antes > 0
        THEN ROUND((pa.precio_hoy - pb.precio_antes) / pb.precio_antes * 100, 1)
        ELSE NULL END AS variacion_pct,
      pa.cobertura_cadenas
    FROM precio_actual pa
    LEFT JOIN precio_base pb USING (ean)
    JOIN canonical_products cp USING (ean)
    ORDER BY pa.cobertura_cadenas DESC, cp.product_description
  `).all(latestDate, baseDate) as Product[];

  const cached: CachedProduct[] = products.map((p) => ({
    ...p,
    product_description_norm: stripDiacritics(p.product_description ?? ""),
    marca_norm: stripDiacritics(p.marca ?? ""),
  }));

  productsSnapshot = { latestDate, baseDate, dias, products: cached };
  return cached;
}

/** Normaliza un string: elimina acentos y pasa a minúsculas. */
function stripDiacritics(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036F]/g, "")
    .toLowerCase();
}

/** Escapa los metacaracteres de LIKE (%, _, \) para evitar búsquedas maliciosas. */
function escapeLike(str: string): string {
  return str.replace(/[%_\\]/g, "\\$&");
}

function buildSearchConditions(
  search: string,
  conditions: string[],
  params: (string | number)[],
) {
  const tokens = search.trim().split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    if (/^\d+$/.test(token)) {
      const escaped = escapeLike(token);
      conditions.push(
        "(cp.ean LIKE ? ESCAPE '\\' OR normalize(cp.product_description) LIKE ? ESCAPE '\\' OR normalize(cp.marca) LIKE ? ESCAPE '\\')",
      );
      const pattern = `%${escaped}%`;
      params.push(pattern, pattern, pattern);
    } else {
      conditions.push(
        "(normalize(cp.product_description) LIKE ? ESCAPE '\\' OR normalize(cp.marca) LIKE ? ESCAPE '\\')",
      );
      const pattern = `%${escapeLike(stripDiacritics(token))}%`;
      params.push(pattern, pattern);
    }
  }
}

/**
 * Cache de prepared statements por forma de SQL.
 * better-sqlite3 compila cada SQL string una vez; reutilizarlo evita
 * re-compilación en cada request con los mismos filtros activos.
 */
const STMT_CACHE_MAX = 50;

const globalForStmtCache = globalThis as unknown as {
  __stmtCache: Map<string, Database.Statement> | undefined;
};

function getStmtCache(): Map<string, Database.Statement> {
  if (!globalForStmtCache.__stmtCache) {
    globalForStmtCache.__stmtCache = new Map();
  }
  return globalForStmtCache.__stmtCache;
}

export function prepare(sql: string): Database.Statement {
  const cache = getStmtCache();
  let stmt = cache.get(sql);
  if (stmt) {
    // LRU bump: move to end of insertion order
    cache.delete(sql);
    cache.set(sql, stmt);
    return stmt;
  }
  if (cache.size >= STMT_CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  stmt = getDb().prepare(sql);
  cache.set(sql, stmt);
  return stmt;
}

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Devuelve la fecha más reciente con datos de precios.
 */
export function getLatestDate(): string | null {
  const row = prepare("SELECT MAX(fecha) AS fecha FROM price_series").get() as
    | { fecha: string | null }
    | undefined;
  return row?.fecha ?? null;
}

/**
 * Lista de categorías con cantidad de productos en cada una.
 */
export function getCategories(): Category[] {
  return prepare(
    `SELECT categoria, COUNT(*) AS n
     FROM canonical_products
     WHERE categoria IS NOT NULL AND categoria != ''
     GROUP BY categoria
     ORDER BY n DESC`,
  ).all() as Category[];
}

/**
 * Lista de cadenas con datos de precios.
 */
export function getChainList(): string[] {
  const rows = prepare(
    `SELECT DISTINCT cadena FROM price_series WHERE cadena IS NOT NULL AND cadena != '' ORDER BY cadena`,
  ).all() as { cadena: string }[];
  return rows.map((r) => r.cadena);
}

interface ProductQueryOptions {
  search?: string;
  category?: string;
  dias?: number;
  eans?: string[];
  cadena?: string;
  page?: number;
  pageSize?: number;
}

function buildProductQueryParts(options: ProductQueryOptions) {
  const { search = "", category = "", eans } = options;

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (search.trim()) {
    buildSearchConditions(search, conditions, params);
  }
  if (category.trim()) {
    conditions.push("cp.categoria = ?");
    params.push(category);
  }
  if (eans && eans.length > 0) {
    const placeholders = eans.map(() => "?").join(", ");
    conditions.push(`cp.ean IN (${placeholders})`);
    params.push(...eans);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  return { conditions, params, whereClause };
}

/**
 * Productos con precio actual y variación porcentual respecto a N días atrás.
 * Soporta filtrado por texto, categoría, cadena y lista de EANs.
 * Paginación con LIMIT/OFFSET.
 *
 * For the common case (no chain filter), uses an in-memory cache of per-date
 * price aggregations so only the first request per date pays the full scan.
 */
export function getProducts(options: ProductQueryOptions): {
  products: Product[];
  total: number;
} {
  const { dias = 30, page = 1, pageSize = 30, cadena = "" } = options;
  const hasCadena = cadena.trim().length > 0;

  if (hasCadena) return getProductsFromDb(options);
  return getProductsCached(options);
}

function getProductsFromDb(options: ProductQueryOptions): {
  products: Product[];
  total: number;
} {
  const { dias = 30, page = 1, pageSize = 30, cadena = "" } = options;
  const { params, whereClause } = buildProductQueryParts(options);
  const offset = (Math.max(page, 1) - 1) * pageSize;

  const latestDate = (
    prepare("SELECT MAX(fecha) AS f FROM price_series WHERE cadena = ?").get(cadena) as { f: string | null }
  )?.f;
  if (!latestDate) return { products: [], total: 0 };

  const baseDate = (
    prepare("SELECT MIN(fecha) AS f FROM price_series WHERE fecha >= DATE('now', '-' || ? || ' days') AND cadena = ?").get(dias, cadena) as { f: string | null }
  )?.f;

  const total = (
    prepare(
      `SELECT COUNT(*) AS cnt FROM
       (SELECT ean FROM price_series WHERE fecha = ? AND precio_lista > 0 AND cadena = ? GROUP BY ean) pa
       JOIN canonical_products cp USING (ean) ${whereClause}`,
    ).get(latestDate, cadena, ...params) as { cnt: number }
  ).cnt;

  if (total === 0) return { products: [], total: 0 };

  const products = prepare(`
    SELECT cp.ean, cp.product_description, cp.marca, cp.categoria, cp.image_url,
      ROUND(pa.precio_hoy, 0) AS precio_actual,
      CASE WHEN pb.precio_antes IS NOT NULL AND pb.precio_antes > 0
        THEN ROUND((pa.precio_hoy - pb.precio_antes) / pb.precio_antes * 100, 1)
        ELSE NULL END AS variacion_pct,
      pa.cobertura_cadenas
    FROM (SELECT ean, AVG(precio_lista) AS precio_hoy, COUNT(DISTINCT cadena) AS cobertura_cadenas
          FROM price_series WHERE fecha = ? AND precio_lista > 0 AND cadena = ? GROUP BY ean) pa
    LEFT JOIN (SELECT ean, AVG(precio_lista) AS precio_antes
               FROM price_series WHERE fecha = ? AND precio_lista > 0 AND cadena = ? GROUP BY ean) pb USING (ean)
    JOIN canonical_products cp USING (ean)
    ${whereClause}
    ORDER BY pa.cobertura_cadenas DESC, cp.product_description
    LIMIT ? OFFSET ?
  `).all(latestDate, cadena, baseDate, cadena, ...params, pageSize, offset) as Product[];

  return { products, total };
}

function getProductsCached(options: ProductQueryOptions): {
  products: Product[];
  total: number;
} {
  const { dias = 30, page = 1, pageSize = 30, search = "", category = "", eans } = options;
  const offset = (Math.max(page, 1) - 1) * pageSize;

  const all = getProductsSnapshot(dias);
  if (all.length === 0) return { products: [], total: 0 };

  let filtered: CachedProduct[] = all;

  if (category.trim()) {
    filtered = filtered.filter((p) => p.categoria === category);
  }

  if (eans && eans.length > 0) {
    const eanSet = new Set(eans);
    filtered = filtered.filter((p) => eanSet.has(p.ean));
  }

  if (search.trim()) {
    const terms = stripDiacritics(search).split(/\s+/).filter(Boolean);
    filtered = filtered.filter((p) =>
      terms.every(
        (t) => p.product_description_norm.includes(t) || p.marca_norm.includes(t),
      ),
    );
  }

  // Already sorted by cobertura DESC, product_description ASC from the snapshot
  const products = filtered.slice(offset, offset + pageSize).map(
    ({ product_description_norm: _, marca_norm: __, ...rest }) => rest,
  );

  return { products, total: filtered.length };
}

/**
 * Serie histórica de precios para un EAN.
 * Usa media geométrica (EXP(AVG(LN(x)))) para agregar precios de distintas cadenas.
 * Filtra outliers: excluye precios > 5x la mediana del EAN para evitar que
 * errores de datos (ej: disco reportando $549K en vez de $6.6K) distorsionen el promedio.
 */
export function getPriceHistory(ean: string): PricePoint[] {
  const sql = `
    WITH mediana AS (
      SELECT precio_lista AS med
      FROM price_series
      WHERE ean = ? AND precio_lista > 0
      ORDER BY precio_lista
      LIMIT 1 OFFSET (
        SELECT COUNT(*) / 2 FROM price_series
        WHERE ean = ? AND precio_lista > 0
      )
    )
    SELECT
      fecha,
      EXP(AVG(LN(precio_lista))) AS precio_promedio
    FROM price_series, mediana -- cross join: mediana returns 1 row, used to per-row outlier filtering
    WHERE ean = ?
      AND precio_lista > 0
      AND precio_lista <= med * 5
    GROUP BY fecha
    ORDER BY fecha
  `;
  return prepare(sql).all(ean, ean, ean) as PricePoint[];
}

export function getPriceHistoryByChain(
  ean: string,
): { fecha: string; cadena: string; precio: number }[] {
  const sql = `
    WITH mediana AS (
      SELECT precio_lista AS med
      FROM price_series
      WHERE ean = ? AND precio_lista > 0
      ORDER BY precio_lista
      LIMIT 1 OFFSET (
        SELECT COUNT(*) / 2 FROM price_series
        WHERE ean = ? AND precio_lista > 0
      )
    )
    SELECT fecha, cadena, precio_lista AS precio
    FROM price_series, mediana
    WHERE ean = ?
      AND precio_lista > 0
      AND precio_lista <= med * 5
    ORDER BY fecha, cadena
  `;
  return prepare(sql).all(ean, ean, ean) as {
    fecha: string;
    cadena: string;
    precio: number;
  }[];
}

/**
 * Precio promedio por cadena de supermercado para un conjunto de EANs.
 * Útil para comparar dónde conviene comprar la canasta.
 */
export function getProductByEan(ean: string, dias = 30): Product | null {
  const result = getProducts({ eans: [ean], dias, page: 1, pageSize: 1 });
  return result.products[0] ?? null;
}

export function getPriceStats(ean: string): {
  min_historico: number;
  max_historico: number;
  min_chain: string | null;
  max_chain: string | null;
  min_fecha: string;
  max_fecha: string;
  dias_datos: number;
} | null {
  const sql = `
    WITH stats AS (
      SELECT
        MIN(precio_lista) AS min_historico,
        MAX(precio_lista) AS max_historico,
        COUNT(DISTINCT fecha) AS dias_datos
      FROM price_series
      WHERE ean = ? AND precio_lista > 0
    ),
    min_row AS (
      SELECT cadena AS min_chain, fecha AS min_fecha
      FROM price_series
      WHERE ean = ? AND precio_lista > 0
      ORDER BY precio_lista ASC
      LIMIT 1
    ),
    max_row AS (
      SELECT cadena AS max_chain, fecha AS max_fecha
      FROM price_series
      WHERE ean = ? AND precio_lista > 0
      ORDER BY precio_lista DESC
      LIMIT 1
    )
    SELECT
      s.min_historico, s.max_historico, s.dias_datos,
      mn.min_chain, mn.min_fecha,
      mx.max_chain, mx.max_fecha
    FROM stats s
    LEFT JOIN min_row mn ON 1=1
    LEFT JOIN max_row mx ON 1=1
  `;
  const row = prepare(sql).get(ean, ean, ean) as
    | {
        min_historico: number;
        max_historico: number;
        min_chain: string | null;
        max_chain: string | null;
        min_fecha: string;
        max_fecha: string;
        dias_datos: number;
      }
    | undefined;
  if (!row || row.min_historico == null) return null;
  return row;
}

export function getCategoryPriceHistory(category: string): PricePoint[] {
  const sql = `
    SELECT
      ps.fecha,
      EXP(AVG(LN(ps.precio_lista))) AS precio_promedio
    FROM price_series ps
    JOIN canonical_products cp ON cp.ean = ps.ean
    WHERE cp.categoria = ?
      AND ps.precio_lista > 0
    GROUP BY ps.fecha
    ORDER BY ps.fecha
  `;
  return prepare(sql).all(category) as PricePoint[];
}

export function getChainPrices(eans: string[]): ChainPrice[] {
  if (eans.length === 0) return [];

  const placeholders = eans.map(() => "?").join(", ");

  const sql = `
    SELECT
      cadena,
      ROUND(SUM(precio_lista), 0) AS total_canasta
    FROM price_series
    WHERE ean IN (${placeholders})
      AND fecha = (SELECT MAX(fecha) FROM price_series)
      AND precio_lista > 0
    GROUP BY cadena
    ORDER BY total_canasta
  `;

  return prepare(sql).all(...eans) as ChainPrice[];
}

export function getBranches(): Branch[] {
  const sql = `
    SELECT cadena, formato, direccion, latitud, longitud, provincia, localidad
    FROM sucursales
    ORDER BY cadena, localidad
  `;
  return prepare(sql).all() as Branch[];
}
