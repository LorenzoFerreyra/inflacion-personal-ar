server <- function(input, output, session) {

  con <- dbConnect(RSQLite::SQLite(), DB_PATH)
  onSessionEnded(function() dbDisconnect(con))

  calc_data <- reactiveVal(NULL)

  latest_fecha <- reactiveVal(NULL)

  observe({
    latest_fecha(q_latest_fecha(con))
  })

  cutoff_for_period <- function(period) {
    lf <- latest_fecha()
    if (is.null(lf)) return(NULL)
    days <- PERIOD_DAYS[[period]] %||% 30
    target <- as.character(as.Date(lf) - days)
    q_cutoff_fecha(con, target)
  }

  observe({
    cats <- q_categories(con)
    session$sendCustomMessage("categories", toJSON(cats, auto_unbox = TRUE))
  })

  observeEvent(input$search_products, {
    req(latest_fecha())
    q      <- input$search_products
    term   <- q$term %||% ""
    cat    <- q$category %||% ""
    period <- q$period %||% "mensual"
    cutoff <- cutoff_for_period(period)

    results <- q_search_products(con, latest_fecha(), cutoff, term, cat)
    session$sendCustomMessage("search_results", toJSON(results, auto_unbox = TRUE))
  })

  observeEvent(input$basket_variations, {
    req(latest_fecha())
    q      <- input$basket_variations
    eans   <- q$eans
    period <- q$period %||% "mensual"
    cutoff <- cutoff_for_period(period)

    if (length(eans) == 0) {
      session$sendCustomMessage("basket_data", "[]")
      return()
    }

    results <- q_basket_variations(con, eans, latest_fecha(), cutoff)
    session$sendCustomMessage("basket_data", toJSON(results, auto_unbox = TRUE))
  })

  observeEvent(input$calculate, {
    req(latest_fecha())
    q      <- input$calculate
    eans   <- q$eans
    period <- q$period %||% "mensual"
    cutoff <- cutoff_for_period(period)
    ipc    <- IPC[[period]] %||% 0

    if (length(eans) == 0) return()

    product_data <- q_basket_variations(con, eans, latest_fecha(), cutoff) %>%
      arrange(desc(variacion))

    cadena_data <- q_cadena_prices(con, eans, latest_fecha())

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

  output$cadena_chart <- renderPlot({
    data <- calc_data()
    req(data, nrow(data$cadenas) > 0)

    df <- data$cadenas
    df$cadena <- factor(df$cadena, levels = rev(df$cadena))

    ggplot(df, aes(x = cadena, y = precio_promedio)) +
      geom_col(fill = "#4ade80", width = 0.55) +
      geom_text(
        aes(label = paste0(
          "$",
          formatC(precio_promedio, format = "f", digits = 0, big.mark = ".")
        )),
        hjust = -0.15, color = "#e5e5e5", size = 4.5
      ) +
      coord_flip() +
      scale_y_continuous(expand = expansion(mult = c(0, 0.35))) +
      labs(x = NULL, y = NULL) +
      theme_void() +
      theme(
        plot.background  = element_rect(fill = "#161616", color = NA),
        panel.background = element_rect(fill = "#161616", color = NA),
        axis.text.y      = element_text(
          color = "#e5e5e5", size = 13, hjust = 1, margin = margin(r = 12)
        ),
        plot.margin = margin(12, 24, 12, 12)
      )
  }, bg = "#161616")

  outputOptions(output, "cadena_chart", suspendWhenHidden = FALSE)
}
