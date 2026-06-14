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
import type { Product, PricePoint, ChainPrice, Category } from "./types";

// ─── Conexión ────────────────────────────────────────────────────────────────

const DB_PATH = path.resolve(
  "/home/lorenzoferreyra/Documents/Projects/scrapers-uflo/data/prices.db",
);

/**
 * Singleton: una sola conexión reutilizada entre requests.
 * better-sqlite3 es sincrónico, ideal para Next.js API routes.
 */
let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH, { readonly: true });
    // Performance: WAL mode + memory-mapped I/O
    db.pragma("journal_mode = WAL");
    db.pragma("mmap_size = 268435456"); // 256MB
  }
  return db;
}

/**
 * Cache de prepared statements por forma de SQL.
 * better-sqlite3 compila cada SQL string una vez; reutilizarlo evita
 * re-compilación en cada request con los mismos filtros activos.
 */
const stmtCache = new Map<string, Database.Statement>();

function prepare(sql: string): Database.Statement {
  let stmt = stmtCache.get(sql);
  if (!stmt) {
    stmt = getDb().prepare(sql);
    stmtCache.set(sql, stmt);
  }
  return stmt;
}

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Devuelve la fecha más reciente con datos de precios.
 */
export function getLatestDate(): string | null {
  const row = getDb()
    .prepare("SELECT MAX(fecha) AS fecha FROM price_series")
    .get() as { fecha: string | null } | undefined;
  return row?.fecha ?? null;
}

/**
 * Lista de categorías con cantidad de productos en cada una.
 */
export function getCategories(): Category[] {
  return getDb()
    .prepare(
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
    conditions.push("(cp.product_description LIKE ? OR cp.marca LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
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
        WHERE fecha >= DATE('now', '-${dias} days')
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
    LIMIT ${pageSize} OFFSET ${offset}
  `;

  return prepare(sql).all(...params) as Product[];
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
  return getDb().prepare(sql).all(ean) as PricePoint[];
}

/**
 * Precio promedio por cadena de supermercado para un conjunto de EANs.
 * Útil para comparar dónde conviene comprar la canasta.
 */
export function getChainPrices(eans: string[]): ChainPrice[] {
  if (eans.length === 0) return [];

  const placeholders = eans.map(() => "?").join(", ");

  const sql = `
    SELECT
      cadena,
      ROUND(AVG(precio_lista), 0) AS precio_promedio_canasta
    FROM price_series
    WHERE ean IN (${placeholders})
      AND fecha = (SELECT MAX(fecha) FROM price_series)
      AND precio_lista > 0
    GROUP BY cadena
    ORDER BY precio_promedio_canasta
  `;

  return getDb()
    .prepare(sql)
    .all(...eans) as ChainPrice[];
}
