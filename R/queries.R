fetch_price_data <- function(pool, eans) {
  stopifnot(is.character(eans), length(eans) > 0)

  eans_sql <- paste(
    vapply(eans, function(x) as.character(DBI::dbQuoteString(pool, x)), character(1)),
    collapse = ","
  )

  query <- sprintf(
    "SELECT
      c.product_description,
      c.marca,
      c.categoria,
      latest.fecha,
      ROUND(AVG(latest.precio_lista), 2) AS precio_promedio
    FROM (
      SELECT p.ean, p.cadena, p.fecha, p.precio_lista,
             ROW_NUMBER() OVER (PARTITION BY p.ean, p.cadena ORDER BY p.fecha DESC) AS rn
      FROM price_series p
      WHERE p.ean IN (%s) AND p.precio_lista > 0
    ) latest
    JOIN canonical_products c ON latest.ean = c.ean
    WHERE latest.rn = 1
    GROUP BY latest.ean
    ORDER BY c.product_description",
    eans_sql
  )

  tryCatch(
    dbGetQuery(pool, query),
    error = function(e) {
      message("Error en la consulta: ", e$message)
      data.frame()
    }
  )
}
