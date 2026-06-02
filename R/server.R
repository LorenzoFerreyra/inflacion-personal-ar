server <- function(input, output, session) {

  con <- dbConnect(RSQLite::SQLite(), DB_PATH)
  onSessionEnded(function() dbDisconnect(con))

  calc_data <- reactiveVal(NULL)

  # ── Startup: send categories ──────────────────────────────────────────

  observe({
    cats <- tryCatch(
      dbGetQuery(con, "
        SELECT categoria, COUNT(*) AS n
        FROM canonical_products
        WHERE categoria IS NOT NULL
        GROUP BY categoria
        ORDER BY categoria
      "),
      error = function(e) data.frame(categoria = character(), n = integer())
    )
    session$sendCustomMessage("categories", toJSON(cats, auto_unbox = TRUE))
  })

  # ── Helper: variation CTE ─────────────────────────────────────────────

  variation_cte <- function() {
    "WITH daily_avg AS (
      SELECT ean, fecha, ROUND(AVG(precio_lista), 2) AS precio
      FROM price_series
      WHERE precio_lista > 0 AND fecha >= ?
      GROUP BY ean, fecha
    ),
    bounds AS (
      SELECT ean, MIN(fecha) AS first_date, MAX(fecha) AS last_date
      FROM daily_avg
      GROUP BY ean
    ),
    variations AS (
      SELECT b.ean,
        l.precio AS precio_actual,
        CASE
          WHEN b.first_date = b.last_date THEN NULL
          WHEN f.precio > 0 THEN ROUND((l.precio - f.precio) / f.precio * 100, 1)
          ELSE NULL
        END AS variacion
      FROM bounds b
      JOIN daily_avg f ON b.ean = f.ean AND b.first_date = f.fecha
      JOIN daily_avg l ON b.ean = l.ean AND b.last_date = l.fecha
    )"
  }

  # ── Search products (Step 1) ──────────────────────────────────────────

  observeEvent(input$search_products, {
    q <- input$search_products
    term     <- q$term %||% ""
    category <- q$category %||% ""
    period   <- q$period %||% "mensual"
    days     <- PERIOD_DAYS[[period]] %||% 30
    cutoff   <- as.character(Sys.Date() - days)

    conditions <- character()
    params <- list(cutoff)

    if (nzchar(term)) {
      conditions <- c(conditions, "(c.product_description LIKE ? OR c.marca LIKE ?)")
      params <- c(params, paste0("%", term, "%"), paste0("%", term, "%"))
    }
    if (nzchar(category)) {
      conditions <- c(conditions, "c.categoria = ?")
      params <- c(params, category)
    }

    where <- if (length(conditions) > 0) {
      paste("WHERE", paste(conditions, collapse = " AND "))
    } else {
      ""
    }

    sql <- sprintf(
      "%s
      SELECT c.ean, c.product_description, c.marca, c.categoria,
        v.precio_actual, v.variacion
      FROM canonical_products c
      LEFT JOIN variations v ON c.ean = v.ean
      %s
      ORDER BY c.product_description
      LIMIT 50",
      variation_cte(), where
    )

    results <- tryCatch(
      dbGetQuery(con, sql, params = params),
      error = function(e) {
        message("search_products error: ", e$message)
        data.frame()
      }
    )

    session$sendCustomMessage("search_results", toJSON(results, auto_unbox = TRUE))
  })

  # ── Basket variations (Step 2 / period change) ────────────────────────

  observeEvent(input$basket_variations, {
    q    <- input$basket_variations
    eans <- q$eans
    period <- q$period %||% "mensual"
    days   <- PERIOD_DAYS[[period]] %||% 30
    cutoff <- as.character(Sys.Date() - days)

    if (length(eans) == 0) {
      session$sendCustomMessage("basket_data", "[]")
      return()
    }

    placeholders <- paste(rep("?", length(eans)), collapse = ",")
    params <- c(list(cutoff), as.list(eans))

    sql <- sprintf(
      "%s
      SELECT c.ean, c.product_description, c.marca, c.categoria,
        COALESCE(v.variacion, 0) AS variacion
      FROM canonical_products c
      LEFT JOIN variations v ON c.ean = v.ean
      WHERE c.ean IN (%s)
      ORDER BY c.product_description",
      variation_cte(), placeholders
    )

    results <- tryCatch(
      dbGetQuery(con, sql, params = params),
      error = function(e) {
        message("basket_variations error: ", e$message)
        data.frame()
      }
    )

    session$sendCustomMessage("basket_data", toJSON(results, auto_unbox = TRUE))
  })

  # ── Calculate results (Step 3) ────────────────────────────────────────

  observeEvent(input$calculate, {
    q      <- input$calculate
    eans   <- q$eans
    period <- q$period %||% "mensual"
    days   <- PERIOD_DAYS[[period]] %||% 30
    cutoff <- as.character(Sys.Date() - days)
    ipc    <- IPC[[period]] %||% 0

    if (length(eans) == 0) return()

    placeholders <- paste(rep("?", length(eans)), collapse = ",")

    # Per-product variations
    params_prod <- c(list(cutoff), as.list(eans))
    sql_prod <- sprintf(
      "%s
      SELECT c.ean, c.product_description, c.marca, c.categoria,
        COALESCE(v.variacion, 0) AS variacion
      FROM canonical_products c
      LEFT JOIN variations v ON c.ean = v.ean
      WHERE c.ean IN (%s)
      ORDER BY v.variacion DESC",
      variation_cte(), placeholders
    )

    product_data <- tryCatch(
      dbGetQuery(con, sql_prod, params = params_prod),
      error = function(e) {
        message("calculate products error: ", e$message)
        data.frame()
      }
    )

    # Per-cadena average prices (latest date only)
    params_cadena <- c(list(cutoff), as.list(eans))
    sql_cadena <- sprintf("
      WITH latest AS (
        SELECT ean, cadena, precio_lista,
          ROW_NUMBER() OVER (PARTITION BY ean, cadena ORDER BY fecha DESC) AS rn
        FROM price_series
        WHERE precio_lista > 0 AND fecha >= ? AND ean IN (%s)
      )
      SELECT cadena, ROUND(AVG(precio_lista), 0) AS precio_promedio
      FROM latest
      WHERE rn = 1
      GROUP BY cadena
      ORDER BY precio_promedio DESC
    ", placeholders)

    cadena_data <- tryCatch(
      dbGetQuery(con, sql_cadena, params = params_cadena),
      error = function(e) {
        message("calculate cadena error: ", e$message)
        data.frame()
      }
    )

    personal_inflation <- if (nrow(product_data) > 0) {
      round(mean(product_data$variacion, na.rm = TRUE), 1)
    } else {
      0
    }

    diff_pp <- round(personal_inflation - ipc, 1)

    result <- list(
      personal_inflation = personal_inflation,
      ipc                = ipc,
      diff_pp            = diff_pp,
      period             = period,
      period_label       = PERIOD_LABELS[[period]],
      products           = product_data,
      cadenas            = cadena_data
    )

    calc_data(result)
    session$sendCustomMessage("results", toJSON(result, auto_unbox = TRUE))
  })

  # ── Cadena bar chart (ggplot2) ────────────────────────────────────────

  output$cadena_chart <- renderPlot({
    data <- calc_data()
    req(data, nrow(data$cadenas) > 0)

    df <- data$cadenas
    df$cadena <- factor(df$cadena, levels = rev(df$cadena))

    ggplot(df, aes(x = cadena, y = precio_promedio)) +
      geom_col(fill = "#4ade80", width = 0.55) +
      geom_text(
        aes(label = paste0("$", formatC(precio_promedio, format = "f", digits = 0, big.mark = "."))),
        hjust = -0.15, color = "#e5e5e5", size = 4.5, family = "sans"
      ) +
      coord_flip() +
      scale_y_continuous(expand = expansion(mult = c(0, 0.35))) +
      labs(x = NULL, y = NULL) +
      theme_void() +
      theme(
        plot.background  = element_rect(fill = "#161616", color = NA),
        panel.background = element_rect(fill = "#161616", color = NA),
        axis.text.y      = element_text(color = "#e5e5e5", size = 13, hjust = 1, margin = margin(r = 12)),
        plot.margin      = margin(12, 24, 12, 12)
      )
  }, bg = "#161616")

  outputOptions(output, "cadena_chart", suspendWhenHidden = FALSE)
}
