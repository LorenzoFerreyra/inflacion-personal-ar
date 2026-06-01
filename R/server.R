source("R/queries.R")

server <- function(input, output, session) {

  # ── Send categories + products on startup ──────────────────────────────

  observe({
    categories <- tryCatch(
      dbGetQuery(db, "
        SELECT categoria, COUNT(*) AS n
        FROM canonical_products
        WHERE categoria IS NOT NULL
        GROUP BY categoria
        ORDER BY categoria
      "),
      error = function(e) data.frame(categoria = character(0), n = integer(0))
    )

    session$sendCustomMessage("categories", toJSON(categories, auto_unbox = TRUE))
  })

  # JS sends: Shiny.setInputValue('search_query', {term, category})
  observeEvent(input$search_query, {
    q <- input$search_query

    term_filter <- if (nzchar(q$term)) {
      paste0("AND (c.product_description LIKE '%", q$term, "%' OR c.marca LIKE '%", q$term, "%')")
    } else {
      ""
    }

    cat_filter <- if (nzchar(q$category)) {
      paste0("AND c.categoria = '", q$category, "'")
    } else {
      ""
    }

    query <- sprintf("
      SELECT c.ean, c.product_description, c.marca, c.categoria
      FROM canonical_products c
      WHERE 1=1 %s %s
      ORDER BY c.product_description
      LIMIT 50
    ", cat_filter, term_filter)

    products <- tryCatch(
      dbGetQuery(db, query),
      error = function(e) data.frame()
    )

    session$sendCustomMessage("products", toJSON(products, auto_unbox = TRUE))
  })

  # ── Search module: search by term ──────────────────────────────────────

  # JS sends: Shiny.setInputValue('price_search', {term, category})
  observeEvent(input$price_search, {
    q <- input$price_search

    term_clause <- if (nzchar(q$term)) {
      paste0("AND (c.product_description LIKE '%", q$term, "%' OR c.marca LIKE '%", q$term, "%')")
    } else {
      ""
    }

    cat_clause <- if (nzchar(q$category)) {
      paste0("AND c.categoria = '", q$category, "'")
    } else {
      ""
    }

    query <- sprintf("
      SELECT
        c.ean,
        c.product_description,
        c.marca,
        c.categoria,
        latest.precio_actual,
        latest.precio_anterior,
        CASE
          WHEN latest.precio_anterior > 0
          THEN ROUND((latest.precio_actual - latest.precio_anterior) / latest.precio_anterior * 100, 1)
          ELSE NULL
        END AS variacion
      FROM canonical_products c
      LEFT JOIN (
        SELECT
          p1.ean,
          p1.precio_lista AS precio_actual,
          p2.precio_lista AS precio_anterior
        FROM (
          SELECT ean, ROUND(AVG(precio_lista), 2) AS precio_lista
          FROM price_series
          WHERE fecha = (SELECT MAX(fecha) FROM price_series)
          GROUP BY ean
        ) p1
        LEFT JOIN (
          SELECT ean, ROUND(AVG(precio_lista), 2) AS precio_lista
          FROM price_series
          WHERE fecha = (
            SELECT DISTINCT fecha FROM price_series ORDER BY fecha DESC LIMIT 1 OFFSET 30
          )
          GROUP BY ean
        ) p2 ON p1.ean = p2.ean
      ) latest ON c.ean = latest.ean
      WHERE latest.precio_actual IS NOT NULL %s %s
      ORDER BY c.product_description
      LIMIT 50
    ", cat_clause, term_clause)

    results <- tryCatch(
      dbGetQuery(db, query),
      error = function(e) data.frame()
    )

    session$sendCustomMessage("search_results", toJSON(results, auto_unbox = TRUE))
  })

  # ── Calculate personal inflation ───────────────────────────────────────

  # JS sends: Shiny.setInputValue('calculate', {eans: [...], days: 90})
  observeEvent(input$calculate, {
    req(input$calculate)
    params <- input$calculate
    eans <- params$eans
    days <- if (!is.null(params$days)) params$days else 90

    if (length(eans) == 0) return()

    eans_sql <- paste(
      vapply(eans, function(x) as.character(dbQuoteString(db, x)), character(1)),
      collapse = ","
    )

    # Price series for selected basket
    basket_query <- sprintf("
      SELECT
        p.fecha,
        p.ean,
        c.product_description,
        c.marca,
        ROUND(AVG(p.precio_lista), 2) AS precio
      FROM price_series p
      JOIN canonical_products c ON p.ean = c.ean
      WHERE p.ean IN (%s)
        AND p.precio_lista > 0
        AND p.fecha >= date('now', '-%d days')
      GROUP BY p.ean, p.fecha
      ORDER BY p.fecha
    ", eans_sql, days)

    basket_data <- tryCatch(
      dbGetQuery(db, basket_query),
      error = function(e) data.frame()
    )

    if (nrow(basket_data) == 0) {
      session$sendCustomMessage("results", toJSON(list(error = "Sin datos para los productos seleccionados"), auto_unbox = TRUE))
      return()
    }

    # Compute basket cost per date
    basket_index <- basket_data %>%
      group_by(fecha) %>%
      summarise(costo = sum(precio, na.rm = TRUE), .groups = "drop") %>%
      arrange(fecha) %>%
      mutate(indice = round(costo / first(costo) * 100, 2))

    # Per-product latest variation
    product_variation <- basket_data %>%
      group_by(ean, product_description, marca) %>%
      arrange(fecha) %>%
      summarise(
        precio_inicio = first(precio),
        precio_fin    = last(precio),
        variacion     = round((last(precio) - first(precio)) / first(precio) * 100, 1),
        .groups       = "drop"
      ) %>%
      arrange(desc(variacion))

    # Summary stats
    inflation_personal <- round(
      (last(basket_index$costo) - first(basket_index$costo)) / first(basket_index$costo) * 100, 1
    )

    result <- list(
      inflation_personal = inflation_personal,
      basket_index       = basket_index,
      product_variation  = product_variation,
      n_products         = length(eans),
      days               = days
    )

    session$sendCustomMessage("results", toJSON(result, auto_unbox = TRUE))
  })
}
