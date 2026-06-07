library(DBI)
library(RSQLite)
library(dplyr)
library(ggplot2)
library(plotly)
library(jsonlite)

PAGE_SIZE <- 30

server <- function(input, output, session) {
  con <- dbConnect(RSQLite::SQLite(), DB_PATH)
  onSessionEnded(function() dbDisconnect(con))

  # ── Reactive state ─────────────────────────────────────────────────────
  basket <- reactiveValues(eans = character(), info = list())

  latest_fecha <- reactiveVal(NULL)
  observe({ latest_fecha(q_latest_fecha(con)) })

  period_days <- reactive({
    PERIOD_DAYS[[input$period %||% "mensual"]] %||% 30
  })

  # ── Categories ─────────────────────────────────────────────────────────

  observe({
    cats <- q_categories(con)
    session$sendCustomMessage(
      "categories",
      toJSON(cats[order(-cats$n), ], auto_unbox = TRUE)
    )
  })

  # ── Tab 1: Search (paginated) ──────────────────────────────────────────

  search_term_val <- reactiveVal("")
  search_cat_val  <- reactiveVal("")

  observeEvent(input$search_term,
    { search_term_val(input$search_term %||% "") },
    ignoreNULL = FALSE
  )
  observeEvent(input$search_category,
    { search_cat_val(input$search_category %||% "") },
    ignoreNULL = FALSE
  )

  observeEvent(input$search_page, {
    lf <- latest_fecha()
    if (is.null(lf)) return()

    page <- as.integer(input$search_page %||% 1)

    sr <- get_products(con,
      search   = search_term_val(),
      category = search_cat_val(),
      dias     = period_days(),
      page     = page,
      page_size = PAGE_SIZE
    )
    session$sendCustomMessage("search_results", toJSON(
      list(rows = sr, page = page, has_more = nrow(sr) == PAGE_SIZE),
      auto_unbox = TRUE
    ))
  }, ignoreNULL = FALSE)

  # ── Basket management ──────────────────────────────────────────────────

  observeEvent(input$add_product, {
    ean <- input$add_product
    if (is.null(ean) || !nzchar(ean) || ean %in% basket$eans) return()

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
    if (is.null(ean) || !nzchar(ean)) return()
    basket$eans <- setdiff(basket$eans, ean)
    basket$info[[ean]] <- NULL
    send_basket_update()
  })

  send_basket_update <- function() {
    eans <- basket$eans
    if (length(eans) == 0) {
      session$sendCustomMessage("basket_data", "[]")
      return()
    }
    if (is.null(latest_fecha())) return()

    info_json <- lapply(eans, function(ean) {
      inf <- basket$info[[ean]]
      list(ean = ean, name = inf$name, brand = inf$brand, category = inf$category)
    })
    session$sendCustomMessage("basket_info", toJSON(info_json, auto_unbox = TRUE))

    bv <- get_products(con, eans = eans, dias = period_days(), page_size = 200)
    session$sendCustomMessage("basket_data", toJSON(bv, auto_unbox = TRUE))
  }

  observeEvent(input$basket_refresh, { send_basket_update() })

  # ── Step navigation ────────────────────────────────────────────────────

  observeEvent(input$go_to_step, {
    step <- as.integer(input$go_to_step)
    if (!step %in% 1:3) return()
    session$sendCustomMessage("go_to_step", step)
    if (step == 3 && length(basket$eans) > 0) trigger_calculate()
  })

  # ── Results calculation ────────────────────────────────────────────────

  calc_data <- reactiveVal(NULL)

  trigger_calculate <- function() {
    eans <- basket$eans
    if (length(eans) == 0 || is.null(latest_fecha())) return()

    pd <- input$period %||% "mensual"
    ipc_val <- IPC[[pd]] %||% 0

    product_data <- get_products(con, eans = eans, dias = period_days(), page_size = 200) %>%
      arrange(desc(variacion_pct))
    cadena_data <- get_chain_prices(con, eans)

    personal_inflation <- if (nrow(product_data) > 0) {
      round(mean(product_data$variacion_pct, na.rm = TRUE), 1)
    } else { 0 }

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

  observeEvent(input$calculate, { trigger_calculate() })

  # ── Cadena bar chart (Step 3) ──────────────────────────────────────────

  output$cadena_chart <- renderPlotly({
    data <- calc_data()
    req(data, nrow(data$cadenas) > 0)

    df <- data$cadenas
    df$cadena <- factor(df$cadena, levels = df$cadena)

    p <- ggplot(df, aes(
      x = precio_promedio_canasta, y = cadena,
      text = paste0(cadena, ": $", formatC(precio_promedio_canasta, format = "f", digits = 0, big.mark = "."))
    )) +
      geom_col(fill = "#4ade80", width = 0.55) +
      scale_x_continuous(expand = expansion(mult = c(0, 0.15))) +
      labs(x = NULL, y = NULL) +
      theme_void() +
      theme(
        plot.background = element_rect(fill = "#161616", color = NA),
        panel.background = element_rect(fill = "#161616", color = NA),
        axis.text.y = element_text(color = "#e5e5e5", size = 13, hjust = 1, margin = margin(r = 12)),
        plot.margin = margin(12, 24, 12, 12)
      )

    ggplotly(p, tooltip = "text") %>%
      layout(
        paper_bgcolor = "#161616", plot_bgcolor = "#161616",
        font = list(color = "#e5e5e5"),
        xaxis = list(visible = FALSE),
        margin = list(l = 10, r = 10, t = 10, b = 10)
      ) %>%
      config(displayModeBar = FALSE)
  })

  outputOptions(output, "cadena_chart", suspendWhenHidden = FALSE)

  # ── Tab 2: Explorador (paginated) ─────────────────────────────────────

  exp_search_val <- reactiveVal("")

  observeEvent(input$exp_search_term,
    { exp_search_val(input$exp_search_term %||% "") },
    ignoreNULL = FALSE
  )

  observeEvent(input$exp_search_page, {
    lf <- latest_fecha()
    if (is.null(lf)) return()

    page <- as.integer(input$exp_search_page %||% 1)

    sr <- get_products(con,
      search    = exp_search_val(),
      dias      = period_days(),
      page      = page,
      page_size = PAGE_SIZE
    )
    session$sendCustomMessage("exp_search_results", toJSON(
      list(rows = sr, page = page, has_more = nrow(sr) == PAGE_SIZE),
      auto_unbox = TRUE
    ))
  }, ignoreNULL = FALSE)

  observeEvent(input$select_product_exp, {
    ean <- input$select_product_exp
    if (is.null(ean) || !nzchar(ean)) return()

    history <- get_price_history(con, ean)
    chains  <- get_chain_prices(con, c(ean))

    product_info <- tryCatch(
      dbGetQuery(con,
        "SELECT ean, product_description, marca, categoria
         FROM canonical_products WHERE ean = ?",
        params = list(ean)
      ),
      error = function(e) data.frame()
    )

    current <- get_products(con, eans = c(ean), dias = period_days())
    variacion <- if (nrow(current) > 0) current$variacion_pct[1] else NA

    detail <- list(
      ean       = ean,
      name      = if (nrow(product_info) > 0) product_info$product_description[1] else ean,
      brand     = if (nrow(product_info) > 0) product_info$marca[1] else "",
      category  = if (nrow(product_info) > 0) product_info$categoria[1] else "",
      variacion = variacion,
      history   = history,
      chains    = chains
    )
    session$sendCustomMessage("exp_product_detail", toJSON(detail, auto_unbox = TRUE))
  })

  # ── Tab 3: Insights (on-demand) ───────────────────────────────────────

  observeEvent(input$load_insights, {
    lf <- latest_fecha()
    if (is.null(lf)) return()

    all_products <- get_products(con, dias = period_days(), page_size = 500)

    total <- nrow(all_products)
    valid <- all_products[!is.na(all_products$variacion_pct), ]

    max_up   <- if (nrow(valid) > 0) valid[which.max(valid$variacion_pct), ] else NULL
    max_down <- if (nrow(valid) > 0) valid[which.min(valid$variacion_pct), ] else NULL

    alerts <- if (nrow(valid) > 0) head(valid[order(-valid$variacion_pct), ], 15) else data.frame()

    chains <- get_chain_prices(con, all_products$ean[1:min(50, nrow(all_products))])

    insights <- list(
      total         = total,
      max_up_name   = if (!is.null(max_up)) max_up$product_description[1] else "",
      max_up_val    = if (!is.null(max_up)) max_up$variacion_pct[1] else NA,
      max_down_name = if (!is.null(max_down)) max_down$product_description[1] else "",
      max_down_val  = if (!is.null(max_down)) max_down$variacion_pct[1] else NA,
      alerts        = alerts,
      chains        = chains
    )
    session$sendCustomMessage("insights_data", toJSON(insights, auto_unbox = TRUE))
  })

  # ── Tab switching ──────────────────────────────────────────────────────

  observeEvent(input$active_tab,
    { session$sendCustomMessage("highlight_tab", input$active_tab) },
    ignoreNULL = TRUE
  )
}
