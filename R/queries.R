# ==============================================================================
# R/queries.R
#
# Funciones para interactuar con la base de datos.
# ==============================================================================

#' @title Obtener datos de precios para una canasta
#' @description Consulta la tabla `price_series` para obtener los precios de
#' una lista de productos (EANs) dentro de un rango de fechas.
#'
#' @param pool Un objeto `pool` de conexión a la base de datos.
#' @param eans Un vector de caracteres con los EANs de los productos.
#' @param start_date La fecha de inicio del período (objeto `Date`).
#' @param end_date La fecha de fin del período (objeto `Date`).
#'
#' @return Un `data.frame` con `fecha`, `precio_lista`, `product_description` y `marca`.
#' Los precios se promedian por día para cada producto si existen en múltiples cadenas.
fetch_price_data <- function(pool, eans, start_date, end_date) {
  # Validar que los inputs son correctos
  stopifnot(is.character(eans), length(eans) > 0)
  stopifnot(inherits(start_date, "Date"), inherits(end_date, "Date"))

  # Consulta SQL parametrizada para evitar inyección SQL.
  # Agrupamos por EAN y fecha para obtener un precio promedio diario por producto,
  # lo que simplifica el cálculo del índice si un producto está en varias cadenas.
  query <- "
    SELECT
      p.fecha,
      c.product_description,
      c.marca,
      AVG(p.precio_lista) AS precio_lista -- Promedio diario por producto
    FROM price_series p
    JOIN canonical_products c ON p.ean = c.ean
    WHERE
      p.ean IN (?) AND
      p.fecha BETWEEN ? AND ?
    GROUP BY p.ean, p.fecha, c.product_description, c.marca
    ORDER BY p.fecha
  "

  # Usar sqlInterpolate para construir la consulta de forma segura.
  # El `lapply` y `paste` es para manejar el `IN (?)` con múltiples valores.
  eans_sql <- paste(lapply(eans, function(x) DBI::dbQuoteString(pool, x)), collapse = ",")

  # Reemplazar el placeholder de los EANs manualmente
  safe_query <- gsub("\\?", eans_sql, query, fixed = TRUE)

  # Interpolar las fechas
  final_query <- sqlInterpolate(
    pool,
    safe_query,
    .dots = list(as.character(start_date), as.character(end_date))
  )

  # Ejecutar la consulta
  tryCatch(
    {
      dbGetQuery(pool, final_query)
    },
    error = function(e) {
      message("Error en la consulta a la base de datos: ", e$message)
      # Devolver un dataframe vacío en caso de error
      data.frame()
    }
  )
}


#' @title Buscar productos por texto
#' @description Busca productos en la tabla `canonical_products` que coincidan
#' con un término de búsqueda.
#'
#' @param pool Un objeto `pool` de conexión a la base de datos.
#' @param search_term El texto a buscar en la descripción o marca.
#' @param limit El número máximo de resultados a devolver.
#'
#' @return Una lista nombrada `(value = ean, label = description)` para usar en selectizeInput.
search_products <- function(pool, search_term, limit = 100) {
  # Validar input
  stopifnot(is.character(search_term), nchar(search_term) > 0)

  # El término de búsqueda se envuelve en '%' para buscar subcadenas.
  search_pattern <- paste0("%", search_term, "%")

  query <- "
    SELECT ean, product_description, marca
    FROM canonical_products
    WHERE product_description LIKE ? OR marca LIKE ?
    ORDER BY product_description
    LIMIT ?
  "

  # Interpolar los parámetros de forma segura
  safe_query <- sqlInterpolate(
    pool,
    query,
    .dots = list(search_pattern, search_pattern, limit)
  )

  # Ejecutar la consulta
  results <- tryCatch(
    {
      dbGetQuery(pool, safe_query)
    },
    error = function(e) {
      message("Error en la búsqueda de productos: ", e$message)
      data.frame()
    }
  )

  # Si no hay resultados, devolver NULL
  if (nrow(results) == 0) {
    return(NULL)
  }

  # Formatear para selectizeInput (lista nombrada)
  setNames(results$ean, paste(results$product_description, " (", results$marca, ")", sep = ""))
}
