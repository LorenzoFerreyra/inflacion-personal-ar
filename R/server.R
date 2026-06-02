library(DBI)
library(RSQLite)
library(dplyr)
library(ggplot2)
library(jsonlite)

server <- function(input, output, session) {
  con <- dbConnect(RSQLite::SQLite(), DB_PATH)
  onSessionEnded(function() dbDisconnect(con))

  # ── Reactive state ─────────────────────────────────────────────────────
  basket <- reactiveValues(eans = character(), info = list())

  # ── Latest fecha & cutoff ──────────────────────────────────────────────

  latest_fecha <- reactiveVal(NULL)
  observe({
    latest_fecha(q_latest_fecha(con))
  })

  cutoff_fecha <- reactive({
    lf <- latest_fecha()
    if (is.null(lf)) {
      return(NULL)
    }
    days <- PERIOD_DAYS[[input$period %||% "mensual"]] %||% 30
    target <- as.character(as.Date(lf) - days)
    q_cutoff_fecha(con, target)
  })

  # ── Categories (sorted by count, sent to JS on startup) ────────────────

  observe({
    cats <- q_categories(con)
    session$sendCustomMessage(
      "categories",
      toJSON(cats[order(-cats$n), ], auto_unbox = TRUE)
    )
  })

  # ── Search (reactive to term, category, period) ────────────────────────

  search_term_val <- reactiveVal("")
  search_cat_val <- reactiveVal("")

  observeEvent(input$search_term,
    {
      search_term_val(input$search_term %||% "")
    },
    ignoreNULL = FALSE
  )

  observeEvent(input$search_category,
    {
      search_cat_val(input$search_category %||% "")
    },
    ignoreNULL = FALSE
  )

  observe({
    lf <- latest_fecha()
    if (is.null(lf)) {
      return()
    }
    sr <- q_search_products(
      con, lf, cutoff_fecha(),
      search_term_val(), search_cat_val()
    )
    session$sendCustomMessage(
      "search_results",
      toJSON(sr, auto_unbox = TRUE)
    )
  })

  # ── Basket management ──────────────────────────────────────────────────

  observeEvent(input$add_product, {
    ean <- input$add_product
    if (is.null(ean) || !nzchar(ean) || ean %in% basket$eans) {
      return()
    }

    row <- tryCatch(
      dbGetQuery(con,
        "SELECT ean, product_description, marca, categoria
         FROM canonical_products WHERE ean = ?",
        params = list(ean)
      ),
      error = function(e) data.frame()
    )

    basket$eans <- c(basket$eans, ean)
    basket$info[[ean]] <- list(
      name     = if (nrow(row) > 0) row$product_description[1] %||% ean else ean,
      brand    = if (nrow(row) > 0) row$marca[1] %||% "" else "",
      category = if (nrow(row) > 0) row$categoria[1] %||% "" else ""
    )
    send_basket_update()
  })

  observeEvent(input$remove_product, {
    ean <- input$remove_product
    if (is.null(ean) || !nzchar(ean)) {
      return()
    }
    basket$eans <- setdiff(basket$eans, ean)
    basket$info[[ean]] <- NULL
    send_basket_update()
  })

  send_basket_update <- function() {
    eans <- basket$eans
    lf <- latest_fecha()
    if (length(eans) == 0) {
      session$sendCustomMessage("basket_data", "[]")
      return()
    }
    if (is.null(lf)) {
      return()
    }

    # Basket info for UI
    info_json <- lapply(eans, function(ean) {
      inf <- basket$info[[ean]]
      list(ean = ean, name = inf$name, brand = inf$brand, category = inf$category)
    })
    session$sendCustomMessage(
      "basket_info",
      toJSON(info_json, auto_unbox = TRUE)
    )

    # Variations
    bv <- q_basket_variations(con, eans, lf, cutoff_fecha())
    session$sendCustomMessage(
      "basket_data",
      toJSON(bv, auto_unbox = TRUE)
    )
  }

  # ── Basket refresh on period change from step 2 ────────────────────────

  observeEvent(input$basket_refresh, {
    send_basket_update()
  })

  # ── Step navigation ────────────────────────────────────────────────────

  observeEvent(input$go_to_step, {
    step <- as.integer(input$go_to_step)
    if (!step %in% 1:3) {
      return()
    }
    session$sendCustomMessage("go_to_step", step)

    # Auto-trigger calculate when navigating to step 3
    if (step == 3 && length(basket$eans) > 0) {
      trigger_calculate()
    }
  })

  # ── Results calculation ────────────────────────────────────────────────

  calc_data <- reactiveVal(NULL)

  trigger_calculate <- function() {
    eans <- basket$eans
    lf <- latest_fecha()
    if (length(eans) == 0 || is.null(lf)) {
      return()
    }

    pd <- input$period %||% "mensual"
    ipc_val <- IPC[[pd]] %||% 0

    product_data <- q_basket_variations(con, eans, lf, cutoff_fecha()) %>%
      arrange(desc(variacion))
    cadena_data <- q_cadena_prices(con, eans, lf)

    personal_inflation <- if (nrow(product_data) > 0) {
      round(mean(product_data$variacion, na.rm = TRUE), 1)
    } else {
      0
    }

    diff_pp <- round(personal_inflation - ipc_val, 1)

    result <- list(
      personal_inflation = personal_inflation,
      ipc                = ipc_val,
      diff_pp            = diff_pp,
      period_label       = PERIOD_SUBTITLES[[pd]],
      period             = pd,
      products           = product_data,
      cadenas            = cadena_data
    )

    calc_data(result)
    session$sendCustomMessage("results", toJSON(result, auto_unbox = TRUE))
  }

  observeEvent(input$calculate, {
    trigger_calculate()
  })

  # ── Cadena bar chart (Step 3) ──────────────────────────────────────────

  output$cadena_chart <- renderPlot(
    {
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
          plot.background = element_rect(fill = "#161616", color = NA),
          panel.background = element_rect(fill = "#161616", color = NA),
          axis.text.y = element_text(
            color = "#e5e5e5", size = 13,
            hjust = 1, margin = margin(r = 12)
          ),
          plot.margin = margin(12, 24, 12, 12)
        )
    },
    bg = "#161616"
  )

  outputOptions(output, "cadena_chart", suspendWhenHidden = FALSE)

  # ── Tab switching ──────────────────────────────────────────────────────

  observeEvent(input$active_tab,
    {
      session$sendCustomMessage("highlight_tab", input$active_tab)
    },
    ignoreNULL = TRUE
  )
}
