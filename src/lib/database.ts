/**
 * database.ts — Capa de acceso a datos (PostgreSQL)
 *
 * Todas las queries viven acá. El resto de la app nunca toca SQL directo.
 * La base viene del scraper (no público) y tiene estas tablas principales:
 *   - price_runs: precios por EAN y cadena guardados como tramos [desde, hasta]
 *     en los que el precio no cambió (en vez de una fila por día)
 *   - canonical_products: catálogo de productos con descripción, marca, categoría
 *   - daily_counts: cantidad de precios por día, precalculada
 *   - indice_clase_mensual / indice_agregado_mensual: índices propios por
 *     clase COICOP y sus agregados; indec_ipc / indec_aperturas: serie del INDEC
 *
 * Funciones SQL auxiliares (sql/schema_runs_pg.sql del scraper):
 *   - ps_at(fecha): los precios vigentes ese día
 *   - ps_eans(eans[]): la serie diaria expandida de una lista de EANs
 */

import { Pool, types } from "pg";
import type {
  Product,
  PricePoint,
  ChainPrice,
  Category,
  Branch,
} from "./types";
import {
  REGION_INDEC,
  compararIndices,
  type ComparacionIndices,
  type FilaIndec,
  type FilaIndicePropio,
} from "./indices";
import { RELATIVO_MAX, RELATIVO_MIN, type RelativoProducto } from "./canasta";

// ─── Conexión ────────────────────────────────────────────────────────────────

// COUNT() (int8) y NUMERIC llegan como string por defecto; DATE como Date.
types.setTypeParser(20, (v) => Number(v));
types.setTypeParser(1700, (v) => Number(v));
types.setTypeParser(1082, (v) => v);

/**
 * Singleton: un solo pool reutilizado entre requests. Se crea recién en la
 * primera query, así `next build` no necesita DATABASE_URL.
 */
const globalForDb = globalThis as unknown as {
  __pgPool: Pool | undefined;
};

export function getPool(): Pool {
  if (!globalForDb.__pgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL env variable is required.");
    }
    globalForDb.__pgPool = new Pool({
      connectionString,
      max: 10,
      statement_timeout: 30_000,
    });
  }
  return globalForDb.__pgPool;
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

/** Fecha de corte (hoy UTC menos N días); el parámetro es la cantidad de días. */
const CUTOFF_CTE =
  "WITH c AS (SELECT ((now() AT TIME ZONE 'UTC')::date - ?::int) AS d)";

/**
 * Si la ventana de N días cae entera en el tramo de precios comparables.
 * Si no, la variación de los productos es null: antes del primer mes del
 * índice los precios tienen otra escala y no se pueden comparar.
 */
export async function periodoComparable(dias: number): Promise<boolean> {
  const row = await query<{ ok: boolean | null }>(`${CUTOFF_CTE}
    SELECT c.d >= (SELECT MIN(periodo) FROM indice_clase_mensual) AS ok FROM c`).get(dias);
  return row?.ok === true;
}

async function getProductsSnapshot(dias: number): Promise<CachedProduct[]> {
  const latestDate = (
    await query<{ f: string | null }>(
      "SELECT MAX(hasta)::text AS f FROM price_runs",
    ).get()
  )?.f;
  if (!latestDate) return [];

  if (productsSnapshot && productsSnapshot.latestDate === latestDate && productsSnapshot.dias === dias) {
    return productsSnapshot.products;
  }

  const baseDate = (await periodoComparable(dias))
    ? ((
        await query<{ f: string | null }>(`${CUTOFF_CTE}
          SELECT MIN(GREATEST(desde, c.d))::text AS f FROM price_runs, c WHERE hasta >= c.d`).get(dias)
      )?.f ?? null)
    : null;

  // La variación compara cada cadena consigo misma (solo las que tienen
  // precio en las dos fechas) y promedia las cadenas con media geométrica.
  // Comparar promedios de cadenas distintas movía la variación cuando
  // cambiaba qué cadenas tenían el producto, sin que cambiara ningún precio.
  const products = await query<Product>(`
    WITH
    hoy AS (
      SELECT ean, cadena, AVG(precio_lista) AS p
      FROM ps_at(?::date) WHERE precio_lista > 0 AND is_outlier = 0 GROUP BY ean, cadena
    ),
    antes AS (
      SELECT ean, cadena, AVG(precio_lista) AS p
      FROM ps_at(?::date) WHERE precio_lista > 0 AND is_outlier = 0 GROUP BY ean, cadena
    ),
    precio_actual AS (
      SELECT ean, AVG(p) AS precio_hoy, COUNT(*) AS cobertura_cadenas FROM hoy GROUP BY ean
    ),
    variacion AS (
      SELECT h.ean, EXP(AVG(LN(h.p / a.p))) - 1 AS v
      FROM hoy h JOIN antes a USING (ean, cadena) GROUP BY h.ean
    )
    SELECT cp.ean, cp.product_description, cp.marca, cp.categoria, cp.image_url,
      ROUND(pa.precio_hoy::numeric, 0) AS precio_actual,
      ROUND((v.v * 100)::numeric, 1) AS variacion_pct,
      pa.cobertura_cadenas
    FROM precio_actual pa
    LEFT JOIN variacion v USING (ean)
    JOIN canonical_products cp USING (ean)
    ORDER BY pa.cobertura_cadenas DESC, cp.product_description
  `).all(latestDate, baseDate);

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
    .replace(/[̀-ͯ]/g, "")
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
        "(cp.ean LIKE ? ESCAPE '\\' OR cp.descr_norm LIKE ? ESCAPE '\\' OR cp.marca_norm LIKE ? ESCAPE '\\')",
      );
      const pattern = `%${escaped}%`;
      params.push(pattern, pattern, pattern);
    } else {
      conditions.push(
        "(cp.descr_norm LIKE ? ESCAPE '\\' OR cp.marca_norm LIKE ? ESCAPE '\\')",
      );
      const pattern = `%${escapeLike(stripDiacritics(token))}%`;
      params.push(pattern, pattern);
    }
  }
}

type SqlParam = string | number | bigint | boolean | null | string[];

/** Convierte los `?` del SQL en placeholders posicionales `$1, $2, …` de pg. */
function numberPlaceholders(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

/**
 * Statement tipado: el tipo de fila se declara una sola vez, junto al SQL.
 * Es el único lugar donde se castea el resultado de pg, así los call sites
 * quedan tipados sin `as` dispersos. El SQL usa `?` como placeholder.
 */
export function query<Row>(sql: string) {
  const text = numberPlaceholders(sql);
  return {
    all: async (...params: SqlParam[]): Promise<Row[]> =>
      (await getPool().query(text, params)).rows as Row[],
    get: async (...params: SqlParam[]): Promise<Row | undefined> =>
      (await getPool().query(text, params)).rows[0] as Row | undefined,
  };
}

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Devuelve la fecha más reciente con datos de precios.
 */
export async function getLatestDate(): Promise<string | null> {
  const row = await query<{ fecha: string | null }>(
    "SELECT MAX(hasta)::text AS fecha FROM price_runs",
  ).get();
  return row?.fecha ?? null;
}

/**
 * Lista de categorías con cantidad de productos en cada una.
 */
export async function getCategories(): Promise<Category[]> {
  return query<Category>(
    `SELECT categoria, COUNT(*) AS n
     FROM canonical_products
     WHERE categoria IS NOT NULL AND categoria != ''
     GROUP BY categoria
     ORDER BY n DESC`,
  ).all();
}

/**
 * Lista de cadenas con datos de precios. Cacheada: no cambia entre requests.
 */
let chainsSnapshot: string[] | null = null;

export async function getChainList(): Promise<string[]> {
  if (!chainsSnapshot) {
    const rows = await query<{ cadena: string }>(
      `SELECT DISTINCT cadena FROM price_runs WHERE cadena IS NOT NULL AND cadena != '' ORDER BY cadena`,
    ).all();
    chainsSnapshot = rows.map((r) => r.cadena);
  }
  return chainsSnapshot;
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
export async function getProducts(options: ProductQueryOptions): Promise<{
  products: Product[];
  total: number;
}> {
  const { cadena = "" } = options;
  const hasCadena = cadena.trim().length > 0;

  if (hasCadena) return getProductsFromDb(options);
  return getProductsCached(options);
}

async function getProductsFromDb(options: ProductQueryOptions): Promise<{
  products: Product[];
  total: number;
}> {
  const { dias = 30, page = 1, pageSize = 30, cadena = "" } = options;
  const { params, whereClause } = buildProductQueryParts(options);
  const offset = (Math.max(page, 1) - 1) * pageSize;

  const latestDate = (
    await query<{ f: string | null }>(
      "SELECT MAX(hasta)::text AS f FROM price_runs WHERE cadena = ? AND is_outlier = 0",
    ).get(cadena)
  )?.f;
  if (!latestDate) return { products: [], total: 0 };

  const baseDate = (await periodoComparable(dias))
    ? ((
        await query<{ f: string | null }>(
          `${CUTOFF_CTE}
           SELECT MIN(GREATEST(desde, c.d))::text AS f FROM price_runs, c
           WHERE hasta >= c.d AND cadena = ? AND is_outlier = 0`,
        ).get(dias, cadena)
      )?.f ?? null)
    : null;

  const total =
    (
      await query<{ cnt: number }>(
        `SELECT COUNT(*) AS cnt FROM
         (SELECT ean FROM ps_at(?::date) WHERE precio_lista > 0 AND cadena = ? AND is_outlier = 0 GROUP BY ean) pa
         JOIN canonical_products cp USING (ean) ${whereClause}`,
      ).get(latestDate, cadena, ...params)
    )?.cnt ?? 0;

  if (total === 0) return { products: [], total: 0 };

  const products = await query<Product>(`
    SELECT cp.ean, cp.product_description, cp.marca, cp.categoria, cp.image_url,
      ROUND(pa.precio_hoy::numeric, 0) AS precio_actual,
      CASE WHEN pb.precio_antes IS NOT NULL AND pb.precio_antes > 0
        THEN ROUND(((pa.precio_hoy - pb.precio_antes) / pb.precio_antes * 100)::numeric, 1)
        ELSE NULL END AS variacion_pct,
      pa.cobertura_cadenas
    FROM (SELECT ean, AVG(precio_lista) AS precio_hoy, COUNT(DISTINCT cadena) AS cobertura_cadenas
          FROM ps_at(?::date) WHERE precio_lista > 0 AND cadena = ? AND is_outlier = 0 GROUP BY ean) pa
    LEFT JOIN (SELECT ean, AVG(precio_lista) AS precio_antes
               FROM ps_at(?::date) WHERE precio_lista > 0 AND cadena = ? AND is_outlier = 0 GROUP BY ean) pb USING (ean)
    JOIN canonical_products cp USING (ean)
    ${whereClause}
    ORDER BY pa.cobertura_cadenas DESC, cp.product_description
    LIMIT ? OFFSET ?
  `).all(latestDate, cadena, baseDate, cadena, ...params, pageSize, offset);

  return { products, total };
}

async function getProductsCached(options: ProductQueryOptions): Promise<{
  products: Product[];
  total: number;
}> {
  const { dias = 30, page = 1, pageSize = 30, search = "", category = "", eans } = options;
  const offset = (Math.max(page, 1) - 1) * pageSize;

  const all = await getProductsSnapshot(dias);
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
 */
export async function getPriceHistory(ean: string): Promise<PricePoint[]> {
  const sql = `
    SELECT
      fecha::text AS fecha,
      EXP(AVG(LN(precio_lista))) AS precio_promedio
    FROM ps_eans(ARRAY[?::text])
    WHERE precio_lista > 0
      AND is_outlier = 0
    GROUP BY fecha
    ORDER BY fecha
  `;
  return query<PricePoint>(sql).all(ean);
}

export async function getPriceHistoryByChain(
  ean: string,
): Promise<{ fecha: string; cadena: string; precio: number }[]> {
  const sql = `
    SELECT fecha::text AS fecha, cadena, precio_lista AS precio
    FROM ps_eans(ARRAY[?::text])
    WHERE precio_lista > 0
      AND is_outlier = 0
    ORDER BY fecha, cadena
  `;
  return query<{ fecha: string; cadena: string; precio: number }>(sql).all(ean);
}

/**
 * Precio promedio por cadena de supermercado para un conjunto de EANs.
 * Útil para comparar dónde conviene comprar la canasta.
 */
export async function getProductByEan(ean: string, dias = 30): Promise<Product | null> {
  const result = await getProducts({ eans: [ean], dias, page: 1, pageSize: 1 });
  return result.products[0] ?? null;
}

export async function getPriceStats(ean: string): Promise<{
  min_historico: number;
  max_historico: number;
  min_chain: string | null;
  max_chain: string | null;
  min_fecha: string;
  max_fecha: string;
  dias_datos: number;
} | null> {
  const sql = `
    WITH d AS (
      SELECT cadena, fecha, precio_lista
      FROM ps_eans(ARRAY[?::text])
      WHERE precio_lista > 0 AND is_outlier = 0
    ),
    stats AS (
      SELECT
        MIN(precio_lista) AS min_historico,
        MAX(precio_lista) AS max_historico,
        COUNT(DISTINCT fecha) AS dias_datos
      FROM d
    ),
    min_row AS (
      SELECT cadena AS min_chain, fecha::text AS min_fecha
      FROM d
      ORDER BY precio_lista ASC
      LIMIT 1
    ),
    max_row AS (
      SELECT cadena AS max_chain, fecha::text AS max_fecha
      FROM d
      ORDER BY precio_lista DESC
      LIMIT 1
    )
    SELECT
      s.min_historico, s.max_historico, s.dias_datos,
      mn.min_chain, mn.min_fecha,
      mx.max_chain, mx.max_fecha
    FROM stats s
    LEFT JOIN min_row mn ON TRUE
    LEFT JOIN max_row mx ON TRUE
  `;
  const row = await query<{
    min_historico: number;
    max_historico: number;
    min_chain: string | null;
    max_chain: string | null;
    min_fecha: string;
    max_fecha: string;
    dias_datos: number;
  }>(sql).get(ean);
  if (!row || row.min_historico == null) return null;
  return row;
}

// ─── Índices por clase COICOP (los arma el pipeline, load/coicop_pg.py) ──────

/** Índices propios: clases y agregados (grupos y divisiones), con nombre del INDEC. */
export async function getIndicesPropios(): Promise<FilaIndicePropio[]> {
  return query<FilaIndicePropio>(`
    SELECT 'Clase' AS nivel, i.codigo, a.nombre, i.periodo::text AS periodo, i.indice,
           i.var_mensual, i.n_pares, i.n_productos, i.n_cadenas, NULL::float8 AS cobertura
    FROM indice_clase_mensual i JOIN indec_aperturas a USING (codigo)
    UNION ALL
    SELECT g.nivel, g.codigo, a.nombre, g.periodo::text, g.indice,
           g.var_mensual, NULL, NULL, NULL, g.cobertura
    FROM indice_agregado_mensual g JOIN indec_aperturas a USING (codigo)
    ORDER BY codigo, periodo
  `).all();
}

/** Serie del INDEC de una región para esos códigos, desde un mes. */
export async function getIndecSerie(
  codigos: string[],
  region: string,
  desde: string,
): Promise<FilaIndec[]> {
  if (codigos.length === 0) return [];
  return query<FilaIndec>(`
    SELECT codigo, periodo::text AS periodo, indice, var_mensual
    FROM indec_ipc
    WHERE region = ? AND codigo = ANY(?::text[]) AND periodo >= ?::date
    ORDER BY codigo, periodo
  `).all(region, codigos, desde);
}

/** Último mes publicado por el INDEC que está cargado para la región. */
export async function getUltimoMesIndec(region: string): Promise<string | null> {
  const row = await query<{ periodo: string | null }>(
    "SELECT MAX(periodo)::text AS periodo FROM indec_ipc WHERE region = ? AND indice IS NOT NULL",
  ).get(region);
  return row?.periodo ?? null;
}

/**
 * Primer y último mes del índice por clase. El primero es también el primer
 * día con precios comparables: antes de julio de 2026 Disco, Jumbo y Vea
 * guardaban precios con otra escala.
 */
export async function getMesesIndice(): Promise<{ base: string | null; ultimo: string | null }> {
  const row = await query<{ base: string | null; ultimo: string | null }>(
    "SELECT MIN(periodo)::text AS base, MAX(periodo)::text AS ultimo FROM indice_clase_mensual",
  ).get();
  return { base: row?.base ?? null, ultimo: row?.ultimo ?? null };
}

/**
 * Relativo de cada producto entre dos meses: precio mensual promedio por
 * cadena, solo cadenas con precio en los dos meses, y media de los
 * logaritmos entre cadenas. Mismos filtros que el índice del pipeline.
 */
export async function getRelativosCanasta(
  eans: string[],
  desde: string,
  hasta: string,
): Promise<RelativoProducto[]> {
  if (eans.length === 0) return [];
  return query<RelativoProducto>(`
    WITH meses(periodo) AS (VALUES (?::date), (?::date)),
    pm AS (
      SELECT r.ean, r.cadena, m.periodo,
             SUM(r.precio_lista * d.dias) / SUM(d.dias) AS precio
      FROM price_runs r
      JOIN meses m ON r.desde <= (m.periodo + interval '1 month - 1 day')::date AND r.hasta >= m.periodo
      CROSS JOIN LATERAL (
        SELECT LEAST(r.hasta, (m.periodo + interval '1 month - 1 day')::date)
               - GREATEST(r.desde, m.periodo) + 1 AS dias
      ) d
      WHERE r.ean = ANY(?::text[]) AND r.cadena <> 'indec'
        AND r.precio_lista > 0 AND r.is_outlier = 0
      GROUP BY r.ean, r.cadena, m.periodo
    ),
    rel AS (
      SELECT a.ean, LN(b.precio / a.precio) AS l
      FROM pm a JOIN pm b ON b.ean = a.ean AND b.cadena = a.cadena
      WHERE a.periodo = ?::date AND b.periodo = ?::date
        AND b.precio / a.precio BETWEEN ? AND ?
    )
    SELECT rel.ean, cp.clase_coicop, AVG(rel.l) AS l, COUNT(*)::int AS n_cadenas
    FROM rel JOIN canonical_products cp USING (ean)
    GROUP BY rel.ean, cp.clase_coicop
  `).all(desde, hasta, eans, desde, hasta, RELATIVO_MIN, RELATIVO_MAX);
}

/** Índices propios y su par del INDEC, listos para la UI y el MCP. */
export async function getComparacionIndices(): Promise<ComparacionIndices> {
  const [propios, ultimoMesIndec, publicadas] = await Promise.all([
    getIndicesPropios(),
    getUltimoMesIndec(REGION_INDEC),
    query<{ codigo: string }>(
      "SELECT DISTINCT codigo FROM indec_ipc WHERE region = ? AND indice IS NOT NULL",
    ).all(REGION_INDEC),
  ]);
  const base = propios.map((p) => p.periodo).sort()[0];
  const codigos = [...new Set(propios.map((p) => p.codigo))];
  const indec = base ? await getIndecSerie(codigos, REGION_INDEC, base) : [];
  return compararIndices(propios, indec, new Set(publicadas.map((p) => p.codigo)), ultimoMesIndec);
}

/**
 * Clases que el INDEC publica en la región y, para las que tienen los dos
 * meses, ln(I_hasta / I_desde).
 */
export async function getIndecClases(
  region: string,
  desde: string,
  hasta: string,
): Promise<{ publicadas: Set<string>; ln: Map<string, number> }> {
  const rows = await query<{ codigo: string; l: number | null }>(`
    SELECT i.codigo,
           LN(MAX(i.indice) FILTER (WHERE i.periodo = ?::date)
              / MAX(i.indice) FILTER (WHERE i.periodo = ?::date)) AS l
    FROM indec_ipc i JOIN indec_aperturas a USING (codigo)
    WHERE i.region = ? AND a.nivel = 'Clase'
    GROUP BY i.codigo
  `).all(hasta, desde, region);
  const ln = new Map<string, number>();
  for (const r of rows) if (r.l !== null) ln.set(r.codigo, r.l);
  return { publicadas: new Set(rows.map((r) => r.codigo)), ln };
}

/** Tramos vigentes en la última fecha con datos, filtrados por EAN. */
const LATEST_RUNS_FOR_EANS = `
  FROM price_runs pr
  JOIN (SELECT MAX(hasta) AS d FROM price_runs) m
    ON pr.desde <= m.d AND pr.hasta >= m.d
  WHERE pr.ean = ANY(?::text[])
    AND pr.precio_lista > 0
    AND pr.is_outlier = 0
`;

export async function getChainPrices(eans: string[]): Promise<ChainPrice[]> {
  if (eans.length === 0) return [];

  const sql = `
    SELECT
      pr.cadena,
      ROUND(SUM(pr.precio_lista)::numeric, 0) AS total_canasta
    ${LATEST_RUNS_FOR_EANS}
    GROUP BY pr.cadena
    ORDER BY total_canasta
  `;

  return query<ChainPrice>(sql).all(eans);
}

/**
 * Precio de cada EAN en cada cadena, a la última fecha con datos.
 * Devuelve una fila por (ean, cadena) — la matriz que usa el
 * algoritmo de recomendación del chat de compras.
 */
export async function getLatestChainPricesByEan(
  eans: string[],
): Promise<{ ean: string; cadena: string; precio: number }[]> {
  if (eans.length === 0) return [];

  const sql = `
    SELECT pr.ean, pr.cadena, ROUND(AVG(pr.precio_lista)::numeric, 0) AS precio
    ${LATEST_RUNS_FOR_EANS}
    GROUP BY pr.ean, pr.cadena
  `;
  return query<{ ean: string; cadena: string; precio: number }>(sql).all(eans);
}

export async function getBranches(): Promise<Branch[]> {
  const sql = `
    SELECT cadena, formato, direccion, latitud, longitud, provincia, localidad
    FROM sucursales
    ORDER BY cadena, localidad
  `;
  return query<Branch>(sql).all();
}

// ─── INDEC Product Links ────────────────────────────────────────────────────

export async function getLinkedEansForIndec(indecEan: string): Promise<string[]> {
  const rows = await query<{ canon_ean: string }>(
    `SELECT canon_ean FROM indec_product_links WHERE indec_ean = ? AND status = 'confirmed'`,
  ).all(indecEan);
  return rows.map((r) => r.canon_ean);
}

export async function getIndecEanForProduct(canonEan: string): Promise<string | null> {
  const row = await query<{ indec_ean: string }>(
    `SELECT indec_ean FROM indec_product_links WHERE canon_ean = ? AND status = 'confirmed' LIMIT 1`,
  ).get(canonEan);
  return row?.indec_ean ?? null;
}

export async function getIndecLinkedAggregates(
  indecEan: string,
): Promise<{ fecha: string; mediana: number; min: number; max: number }[]> {
  const linkedEans = await getLinkedEansForIndec(indecEan);
  if (linkedEans.length === 0) return [];

  const sql = `
    WITH daily AS (
      SELECT fecha, ean, AVG(precio_lista) AS precio_avg
      FROM ps_eans(?::text[])
      WHERE precio_lista > 0
        AND is_outlier = 0
      GROUP BY fecha, ean
    ),
    ranked AS (
      SELECT fecha, precio_avg,
        ROW_NUMBER() OVER (PARTITION BY fecha ORDER BY precio_avg) AS rn,
        COUNT(*) OVER (PARTITION BY fecha) AS cnt
      FROM daily
    )
    SELECT
      fecha::text AS fecha,
      AVG(CASE WHEN rn IN (cnt/2, cnt/2+1) THEN precio_avg END) AS mediana,
      MIN(precio_avg) AS min,
      MAX(precio_avg) AS max
    FROM ranked
    GROUP BY fecha
    ORDER BY fecha
  `;
  return query<{ fecha: string; mediana: number; min: number; max: number }>(
    sql,
  ).all(linkedEans);
}

export async function getIndecLinkedByBrand(
  indecEan: string,
): Promise<{ marca: string; count: number; min_price: number; max_price: number }[]> {
  const linkedEans = await getLinkedEansForIndec(indecEan);
  if (linkedEans.length === 0) return [];

  const latestDate = await getLatestDate();
  if (!latestDate) return [];

  const sql = `
    SELECT
      cp.marca,
      COUNT(DISTINCT cp.ean) AS count,
      MIN(ps.precio_lista) AS min_price,
      MAX(ps.precio_lista) AS max_price
    FROM canonical_products cp
    JOIN ps_at(?::date) ps ON ps.ean = cp.ean
    WHERE cp.ean = ANY(?::text[])
      AND ps.precio_lista > 0
      AND ps.is_outlier = 0
    GROUP BY cp.marca
    ORDER BY count DESC
  `;
  return query<{
    marca: string;
    count: number;
    min_price: number;
    max_price: number;
  }>(sql).all(latestDate, linkedEans);
}
