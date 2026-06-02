# ═══════════════════════════════════════════════════════════════════════════
# Database query functions — simple date-filtered queries, variations in R
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

q_cutoff_fecha <- function(con, target) {
  fecha <- tryCatch(
    dbGetQuery(con, "SELECT MAX(fecha) AS fecha FROM price_series WHERE fecha <= ?",
               params = list(target))$fecha,
    error = function(e) NULL
  )
  if (is.null(fecha) || is.na(fecha)) {
    fecha <- tryCatch(
      dbGetQuery(con, "SELECT MIN(fecha) AS fecha FROM price_series")$fecha,
      error = function(e) NULL
    )
  }
  fecha
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

q_search_products <- function(con, latest_fecha, cutoff_fecha, term = "", category = "") {
  term <- safe_str(term)
  category <- safe_str(category)

  has_cutoff <- !is.null(cutoff_fecha) && !is.na(cutoff_fecha) && cutoff_fecha != latest_fecha

  conditions <- "pl.precio_lista > 0"
  params <- if (has_cutoff) list(latest_fecha, cutoff_fecha) else list(latest_fecha)

  if (nzchar(term)) {
    conditions <- paste0(conditions, " AND (c.product_description LIKE ? OR c.marca LIKE ?)")
    params <- c(params, paste0("%", term, "%"), paste0("%", term, "%"))
  }
  if (nzchar(category)) {
    conditions <- paste0(conditions, " AND c.categoria = ?")
    params <- c(params, category)
  }

  if (has_cutoff) {
    sql <- sprintf("
      SELECT c.ean, c.product_description, c.marca, c.categoria,
             ROUND(AVG(pl.precio_lista), 0) AS precio_actual,
             CASE WHEN pc.precio_cutoff > 0
               THEN ROUND((AVG(pl.precio_lista) - pc.precio_cutoff) / pc.precio_cutoff * 100, 1)
               ELSE NULL END AS variacion
      FROM canonical_products c
      JOIN price_series pl ON c.ean = pl.ean AND pl.fecha = ?
      LEFT JOIN (
        SELECT ean, ROUND(AVG(precio_lista), 0) AS precio_cutoff
        FROM price_series WHERE fecha = ? AND precio_lista > 0
        GROUP BY ean
      ) pc ON c.ean = pc.ean
      WHERE %s
      GROUP BY c.ean, c.product_description, c.marca, c.categoria
      ORDER BY variacion IS NULL, c.product_description
      LIMIT 50
    ", conditions)
  } else {
    sql <- sprintf("
      SELECT c.ean, c.product_description, c.marca, c.categoria,
             ROUND(AVG(pl.precio_lista), 0) AS precio_actual,
             NULL AS variacion
      FROM canonical_products c
      JOIN price_series pl ON c.ean = pl.ean AND pl.fecha = ?
      WHERE %s
      GROUP BY c.ean, c.product_description, c.marca, c.categoria
      ORDER BY c.product_description
      LIMIT 50
    ", conditions)
  }

  tryCatch(
    dbGetQuery(con, sql, params = params),
    error = function(e) {
      message("q_search_products error: ", e$message)
      data.frame(ean = character(), product_description = character(),
                 marca = character(), categoria = character(),
                 precio_actual = numeric(), variacion = numeric())
    }
  )
}

q_basket_variations <- function(con, eans, latest_fecha, cutoff_fecha) {
  if (length(eans) == 0) return(data.frame())

  has_cutoff <- !is.null(cutoff_fecha) && !is.na(cutoff_fecha) && cutoff_fecha != latest_fecha
  placeholders <- paste(rep("?", length(eans)), collapse = ",")

  if (has_cutoff) {
    sql <- sprintf("
      SELECT c.ean, c.product_description, c.marca, c.categoria,
             ROUND(AVG(pl.precio_lista), 0) AS precio_actual,
             CASE WHEN pc.precio_cutoff > 0
               THEN ROUND((AVG(pl.precio_lista) - pc.precio_cutoff) / pc.precio_cutoff * 100, 1)
               ELSE NULL END AS variacion
      FROM canonical_products c
      JOIN price_series pl ON c.ean = pl.ean AND pl.fecha = ?
      LEFT JOIN (
        SELECT ean, ROUND(AVG(precio_lista), 0) AS precio_cutoff
        FROM price_series WHERE fecha = ? AND precio_lista > 0
        GROUP BY ean
      ) pc ON c.ean = pc.ean
      WHERE pl.precio_lista > 0 AND c.ean IN (%s)
      GROUP BY c.ean, c.product_description, c.marca, c.categoria
      ORDER BY c.product_description
    ", placeholders)
    params <- c(list(latest_fecha, cutoff_fecha), as.list(eans))
  } else {
    sql <- sprintf("
      SELECT c.ean, c.product_description, c.marca, c.categoria,
             ROUND(AVG(pl.precio_lista), 0) AS precio_actual,
             NULL AS variacion
      FROM canonical_products c
      JOIN price_series pl ON c.ean = pl.ean AND pl.fecha = ?
      WHERE pl.precio_lista > 0 AND c.ean IN (%s)
      GROUP BY c.ean, c.product_description, c.marca, c.categoria
      ORDER BY c.product_description
    ", placeholders)
    params <- c(list(latest_fecha), as.list(eans))
  }

  tryCatch(
    dbGetQuery(con, sql, params = params),
    error = function(e) {
      message("q_basket_variations error: ", e$message)
      data.frame()
    }
  )
}

q_product_chain_prices <- function(con, ean, latest_fecha) {
  tryCatch(
    dbGetQuery(con, "
      SELECT cadena, ROUND(precio_lista, 0) AS precio
      FROM price_series
      WHERE ean = ? AND fecha = ? AND precio_lista > 0
      ORDER BY precio_lista ASC
    ", params = list(ean, latest_fecha)),
    error = function(e) data.frame()
  )
}

q_cadena_prices <- function(con, eans, latest_fecha) {
  if (length(eans) == 0) return(data.frame())

  placeholders <- paste(rep("?", length(eans)), collapse = ",")

  sql <- sprintf("
    SELECT ps.cadena, ROUND(AVG(ps.precio_lista), 0) AS precio_promedio
    FROM price_series ps
    WHERE ps.fecha = ? AND ps.precio_lista > 0 AND ps.ean IN (%s)
    GROUP BY ps.cadena
    ORDER BY precio_promedio DESC
  ", placeholders)

  tryCatch(
    dbGetQuery(con, sql, params = c(list(latest_fecha), as.list(eans))),
    error = function(e) {
      message("q_cadena_prices error: ", e$message)
      data.frame()
    }
  )
}
