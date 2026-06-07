# ═══════════════════════════════════════════════════════════════════════════
# Data layer — three core queries + helpers
# ═══════════════════════════════════════════════════════════════════════════

safe_str <- function(x) {
  if (is.null(x) || length(x) == 0) "" else as.character(x)
}

q_latest_fecha <- function(con) {
  tryCatch(
    dbGetQuery(con, "SELECT MAX(fecha) AS fecha FROM price_series")$fecha,
    error = function(e) NULL
  )
}

q_categories <- function(con) {
  tryCatch(
    dbGetQuery(con, "
      SELECT categoria, COUNT(*) AS n
      FROM canonical_products
      WHERE categoria IS NOT NULL AND categoria != ''
      GROUP BY categoria
      ORDER BY categoria
    "),
    error = function(e) data.frame(categoria = character(), n = integer())
  )
}

# ── Query 1: productos con precio actual y variación ─────────────────────

get_products <- function(con, search = "", category = "", dias = 30, eans = NULL) {
  search   <- safe_str(search)
  category <- safe_str(category)

  conditions <- "1 = 1"
  params <- list(dias)

  if (nzchar(search)) {
    conditions <- paste0(conditions, " AND (cp.product_description LIKE ? OR cp.marca LIKE ?)")
    params <- c(params, paste0("%", search, "%"), paste0("%", search, "%"))
  }
  if (nzchar(category)) {
    conditions <- paste0(conditions, " AND cp.categoria = ?")
    params <- c(params, category)
  }
  if (!is.null(eans) && length(eans) > 0) {
    placeholders <- paste(rep("?", length(eans)), collapse = ", ")
    conditions <- paste0(conditions, sprintf(" AND cp.ean IN (%s)", placeholders))
    params <- c(params, as.list(eans))
  }

  sql <- sprintf("
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
    )
    SELECT
      cp.ean,
      cp.product_description,
      cp.marca,
      cp.categoria,
      ROUND(pa.precio_hoy, 0)                                              AS precio_actual,
      ROUND((pa.precio_hoy - pb.precio_antes) / pb.precio_antes * 100, 1)  AS variacion_pct
    FROM precio_actual pa
    JOIN precio_base pb USING (ean)
    JOIN canonical_products cp USING (ean)
    WHERE %s
    ORDER BY cp.product_description
  ", conditions)

  tryCatch(
    dbGetQuery(con, sql, params = params),
    error = function(e) {
      message("get_products error: ", e$message)
      data.frame(
        ean = character(), product_description = character(),
        marca = character(), categoria = character(),
        precio_actual = numeric(), variacion_pct = numeric()
      )
    }
  )
}

# ── Query 2: serie histórica por EAN ─────────────────────────────────────

get_price_history <- function(con, ean) {
  sql <- "
    SELECT
      fecha,
      EXP(AVG(LN(precio_lista))) AS precio_promedio
    FROM price_series
    WHERE ean = ?
      AND precio_lista > 0
    GROUP BY fecha
    ORDER BY fecha
  "

  tryCatch(
    dbGetQuery(con, sql, params = list(ean)),
    error = function(e) {
      message("get_price_history error: ", e$message)
      data.frame(fecha = character(), precio_promedio = numeric())
    }
  )
}

# ── Query 3: precio por cadena para un conjunto de EANs ──────────────────

get_chain_prices <- function(con, eans) {
  if (length(eans) == 0) return(data.frame())

  placeholders <- paste(rep("?", length(eans)), collapse = ", ")

  sql <- sprintf("
    SELECT
      cadena,
      ROUND(AVG(precio_lista), 0) AS precio_promedio_canasta
    FROM price_series
    WHERE ean IN (%s)
      AND fecha = (SELECT MAX(fecha) FROM price_series)
      AND precio_lista > 0
    GROUP BY cadena
    ORDER BY precio_promedio_canasta
  ", placeholders)

  tryCatch(
    dbGetQuery(con, sql, params = as.list(eans)),
    error = function(e) {
      message("get_chain_prices error: ", e$message)
      data.frame(cadena = character(), precio_promedio_canasta = numeric())
    }
  )
}
