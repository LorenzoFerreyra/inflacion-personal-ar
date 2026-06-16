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
import type { Product, PricePoint, ChainPrice, Category, Branch } from "./types";

// ─── Conexión ────────────────────────────────────────────────────────────────

const DB_PATH = path.resolve(
  process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "prices.db"),
);

/**
 * Singleton: una sola conexión reutilizada entre requests.
 * better-sqlite3 es sincrónico, ideal para Next.js API routes.
 */
let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH, { readonly: true });
    db.pragma("journal_mode = WAL");
    db.pragma("mmap_size = 268435456"); // 256MB
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    db.function("normalize", (str: unknown) =>
      str != null ? String(str).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase() : "",
    );
  }
  return db;
}

function stripDiacritics(str: string): string {
  return str.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function buildSearchConditions(
  search: string,
  conditions: string[],
  params: (string | number)[],
) {
  const tokens = search.trim().split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    conditions.push(
      "(normalize(cp.product_description) LIKE ? OR normalize(cp.marca) LIKE ?)",
    );
    const pattern = `%${stripDiacritics(token)}%`;
    params.push(pattern, pattern);
  }
}

/**
 * Cache de prepared statements por forma de SQL.
 * better-sqlite3 compila cada SQL string una vez; reutilizarlo evita
 * re-compilación en cada request con los mismos filtros activos.
 */
const STMT_CACHE_MAX = 50;
const stmtCache = new Map<string, Database.Statement>();

function prepare(sql: string): Database.Statement {
  let stmt = stmtCache.get(sql);
  if (stmt) {
    // Move to end (most recently used) so eviction targets least recently used
    stmtCache.delete(sql);
    stmtCache.set(sql, stmt);
    return stmt;
  }
  if (stmtCache.size >= STMT_CACHE_MAX) {
    const oldest = stmtCache.keys().next().value;
    if (oldest !== undefined) stmtCache.delete(oldest);
  }
  stmt = getDb().prepare(sql);
  stmtCache.set(sql, stmt);
  return stmt;
}

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Devuelve la fecha más reciente con datos de precios.
 */
export function getLatestDate(): string | null {
  const row = prepare("SELECT MAX(fecha) AS fecha FROM price_series")
    .get() as { fecha: string | null } | undefined;
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
     ORDER BY categoria`,
  )
    .all() as Category[];
}

/**
 * Productos con precio actual y variación porcentual respecto a N días atrás.
 *
 * Usa dos CTEs:
 *   - precio_actual: promedio de precios en la fecha más reciente
 *   - precio_base: promedio de precios en la fecha más antigua dentro del rango
 *
 * Soporta filtrado por texto, categoría, y lista de EANs.
 * Paginación con LIMIT/OFFSET.
 */
export function getProductCount(options: {
  search?: string;
  category?: string;
  dias?: number;
  eans?: string[];
}): number {
  const { search = "", category = "", dias = 30, eans } = options;

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

  const sql = `
    WITH
    precio_actual AS (
      SELECT ean
      FROM price_series
      WHERE fecha = (SELECT MAX(fecha) FROM price_series)
        AND precio_lista > 0
      GROUP BY ean
    ),
    precio_base AS (
      SELECT ean
      FROM price_series
      WHERE fecha = (
        SELECT MIN(fecha)
        FROM price_series
        WHERE fecha >= DATE('now', '-' || ? || ' days')
      )
        AND precio_lista > 0
      GROUP BY ean
    )
    SELECT COUNT(*) AS total
    FROM precio_actual pa
    JOIN precio_base pb USING (ean)
    JOIN canonical_products cp USING (ean)
    ${whereClause}
  `;

  const row = prepare(sql).get(dias, ...params) as { total: number };
  return row.total;
}

export function getProducts(options: {
  search?: string;
  category?: string;
  dias?: number;
  eans?: string[];
  page?: number;
  pageSize?: number;
}): Product[] {
  const {
    search = "",
    category = "",
    dias = 30,
    eans,
    page = 1,
    pageSize = 30,
  } = options;

  // Construir condiciones WHERE dinámicas
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

  const offset = (Math.max(page, 1) - 1) * pageSize;

  const sql = `
    WITH
    precio_actual AS (
      SELECT ean, AVG(precio_lista) AS precio_hoy
      FROM price_series
      WHERE fecha = (SELECT MAX(fecha) FROM price_series)
        AND precio_lista > 0
      GROUP BY ean
    ),
    precio_base AS (
      SELECT ean, AVG(precio_lista) AS precio_antes
      FROM price_series
      WHERE fecha = (
        SELECT MIN(fecha)
        FROM price_series
        WHERE fecha >= DATE('now', '-' || ? || ' days')
      )
        AND precio_lista > 0
      GROUP BY ean
    ),
    cobertura AS (
      SELECT ean, COUNT(DISTINCT cadena) AS cobertura_cadenas
      FROM price_series
      WHERE fecha = (SELECT MAX(fecha) FROM price_series)
        AND precio_lista > 0
      GROUP BY ean
    )
    SELECT
      cp.ean,
      cp.product_description,
      cp.marca,
      cp.categoria,
      cp.image_url,
      ROUND(pa.precio_hoy, 0) AS precio_actual,
      ROUND(
        (pa.precio_hoy - pb.precio_antes) / pb.precio_antes * 100,
        1
      ) AS variacion_pct,
      COALESCE(cob.cobertura_cadenas, 1) AS cobertura_cadenas
    FROM precio_actual pa
    JOIN precio_base pb USING (ean)
    JOIN canonical_products cp USING (ean)
    LEFT JOIN cobertura cob USING (ean)
    ${whereClause}
    ORDER BY cobertura_cadenas DESC, cp.product_description
    LIMIT ? OFFSET ?
  `;

  return prepare(sql).all(dias, ...params, pageSize, offset) as Product[];
}

/**
 * Serie histórica de precios para un EAN.
 * Usa media geométrica (EXP(AVG(LN(x)))) para agregar precios de distintas cadenas.
 */
export function getPriceHistory(ean: string): PricePoint[] {
  const sql = `
    SELECT
      fecha,
      EXP(AVG(LN(precio_lista))) AS precio_promedio
    FROM price_series
    WHERE ean = ?
      AND precio_lista > 0
    GROUP BY fecha
    ORDER BY fecha
  `;
  return prepare(sql).all(ean) as PricePoint[];
}

export function getPriceHistoryByChain(
  ean: string,
): { fecha: string; cadena: string; precio: number }[] {
  const sql = `
    SELECT fecha, cadena, precio_lista AS precio
    FROM price_series
    WHERE ean = ?
      AND precio_lista > 0
    ORDER BY fecha, cadena
  `;
  return prepare(sql).all(ean) as {
    fecha: string;
    cadena: string;
    precio: number;
  }[];
}

/**
 * Precio promedio por cadena de supermercado para un conjunto de EANs.
 * Útil para comparar dónde conviene comprar la canasta.
 */
export function getProductByEan(ean: string): Product | null {
  const sql = `
    WITH
    precio_actual AS (
      SELECT ean, AVG(precio_lista) AS precio_hoy
      FROM price_series
      WHERE ean = ?
        AND fecha = (SELECT MAX(fecha) FROM price_series)
        AND precio_lista > 0
      GROUP BY ean
    ),
    precio_base AS (
      SELECT ean, AVG(precio_lista) AS precio_antes
      FROM price_series
      WHERE ean = ?
        AND fecha = (
          SELECT MIN(fecha)
          FROM price_series
          WHERE fecha >= DATE('now', '-30 days')
        )
        AND precio_lista > 0
      GROUP BY ean
    ),
    cobertura AS (
      SELECT ean, COUNT(DISTINCT cadena) AS cobertura_cadenas
      FROM price_series
      WHERE ean = ?
        AND fecha = (SELECT MAX(fecha) FROM price_series)
        AND precio_lista > 0
      GROUP BY ean
    )
    SELECT
      cp.ean,
      cp.product_description,
      cp.marca,
      cp.categoria,
      cp.image_url,
      ROUND(pa.precio_hoy, 0) AS precio_actual,
      ROUND(
        (pa.precio_hoy - pb.precio_antes) / pb.precio_antes * 100,
        1
      ) AS variacion_pct,
      COALESCE(cob.cobertura_cadenas, 1) AS cobertura_cadenas
    FROM canonical_products cp
    LEFT JOIN precio_actual pa ON pa.ean = cp.ean
    LEFT JOIN precio_base pb ON pb.ean = cp.ean
    LEFT JOIN cobertura cob ON cob.ean = cp.ean
    WHERE cp.ean = ?
  `;
  const row = prepare(sql).get(ean, ean, ean, ean) as
    | Product
    | undefined;
  return row ?? null;
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

  return prepare(sql)
    .all(...eans) as ChainPrice[];
}

export function getBranches(): Branch[] {
  const sql = `
    SELECT cadena, formato, direccion, latitud, longitud, provincia, localidad
    FROM sucursales
    WHERE latitud IS NOT NULL AND longitud IS NOT NULL
    ORDER BY cadena, localidad
  `;
  return prepare(sql).all() as Branch[];
}
