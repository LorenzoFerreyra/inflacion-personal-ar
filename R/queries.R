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
  tryCatch(
    dbGetQuery(con, "SELECT MAX(fecha) AS fecha FROM price_series WHERE fecha <= ?",
               params = list(target))$fecha,
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

q_search_products <- function(con, latest_fecha, cutoff_fecha, term = "", category = "") {
  term <- safe_str(term)
  category <- safe_str(category)

  conditions <- "ps.precio_lista > 0"
  params <- list(latest_fecha)

  if (nzchar(term)) {
    conditions <- paste0(conditions, " AND (c.product_description LIKE ? OR c.marca LIKE ?)")
    params <- c(params, paste0("%", term, "%"), paste0("%", term, "%"))
  }
  if (nzchar(category)) {
    conditions <- paste0(conditions, " AND c.categoria = ?")
    params <- c(params, category)
  }

  sql <- sprintf("
    SELECT c.ean, c.product_description, c.marca, c.categoria,
           ROUND(AVG(ps.precio_lista), 0) AS precio_actual
    FROM canonical_products c
    JOIN price_series ps ON c.ean = ps.ean AND ps.fecha = ?
    WHERE %s
    GROUP BY c.ean, c.product_description, c.marca, c.categoria
    ORDER BY c.product_description
    LIMIT 50
  ", conditions)

  latest <- tryCatch(
    dbGetQuery(con, sql, params = params),
    error = function(e) {
      message("q_search_products error: ", e$message)
      data.frame(ean = character(), product_description = character(),
                 marca = character(), categoria = character(),
                 precio_actual = numeric())
    }
  )

  if (nrow(latest) == 0 || is.null(cutoff_fecha)) {
    latest$variacion <- NA_real_
    return(latest)
  }

  add_variation(con, latest, cutoff_fecha)
}

q_basket_variations <- function(con, eans, latest_fecha, cutoff_fecha) {
  if (length(eans) == 0) return(data.frame())

  placeholders <- paste(rep("?", length(eans)), collapse = ",")

  sql <- sprintf("
    SELECT c.ean, c.product_description, c.marca, c.categoria,
           ROUND(AVG(ps.precio_lista), 0) AS precio_actual
    FROM canonical_products c
    JOIN price_series ps ON c.ean = ps.ean AND ps.fecha = ?
    WHERE ps.precio_lista > 0 AND c.ean IN (%s)
    GROUP BY c.ean, c.product_description, c.marca, c.categoria
    ORDER BY c.product_description
  ", placeholders)

  latest <- tryCatch(
    dbGetQuery(con, sql, params = c(list(latest_fecha), as.list(eans))),
    error = function(e) {
      message("q_basket_variations error: ", e$message)
      data.frame()
    }
  )

  if (nrow(latest) == 0 || is.null(cutoff_fecha)) {
    latest$variacion <- NA_real_
    return(latest)
  }

  add_variation(con, latest, cutoff_fecha)
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

# ── Helper: add variation column by comparing against cutoff prices ──────

add_variation <- function(con, latest_df, cutoff_fecha) {
  eans <- latest_df$ean
  placeholders <- paste(rep("?", length(eans)), collapse = ",")

  sql <- sprintf("
    SELECT ean, ROUND(AVG(precio_lista), 0) AS precio_cutoff
    FROM price_series
    WHERE fecha = ? AND precio_lista > 0 AND ean IN (%s)
    GROUP BY ean
  ", placeholders)

  cutoff_prices <- tryCatch(
    dbGetQuery(con, sql, params = c(list(cutoff_fecha), as.list(eans))),
    error = function(e) data.frame()
  )

  if (nrow(cutoff_prices) > 0) {
    latest_df <- latest_df %>%
      left_join(cutoff_prices, by = "ean") %>%
      mutate(variacion = if_else(
        !is.na(precio_cutoff) & precio_cutoff > 0,
        round((precio_actual - precio_cutoff) / precio_cutoff * 100, 1),
        NA_real_
      )) %>%
      select(-precio_cutoff)
  } else {
    latest_df$variacion <- NA_real_
  }

  latest_df
}
