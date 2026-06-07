library(shiny)
library(DBI)
library(RSQLite)
library(DT)
library(plotly)

source("R/queries.R")

DB_PATH <- "C:/Users/Lorenzo/Documents/Desktop project versions/scrapers-uflo/data/prices.db"

IPC <- list(mensual = 8.8, trimestral = 26.5, interanual = 118.4)
PERIOD_DAYS <- list(mensual = 30, trimestral = 90, interanual = 365)

PAGE_SIZE <- 30

ui <- fluidPage(
  theme = bslib::bs_theme(bootswatch = "darkly"),
  titlePanel("Observatorio de Inflación"),

  tabsetPanel(
    id = "main_tabs",

    # ── Tab 1: Mi canasta ─────────────────────────────────────────────────
    tabPanel("Mi canasta",
      fluidRow(
        column(8,
          h4("Buscar productos"),
          fluidRow(
            column(6, textInput("search_term", NULL, placeholder = "Buscar producto...")),
            column(3, selectInput("search_category", "Categoría", choices = c("Todas" = ""))),
            column(3, selectInput("period", "Variación",
              choices = c("Mensual" = "mensual", "Trimestral" = "trimestral", "Interanual" = "interanual")
            ))
          ),
          DTOutput("product_table"),
          fluidRow(
            column(6, actionButton("prev_page", "← Anterior", class = "btn-sm")),
            column(6, actionButton("next_page", "Siguiente →", class = "btn-sm pull-right"))
          )
        ),
        column(4,
          h4("Tu canasta"),
          uiOutput("basket_list"),
          hr(),
          uiOutput("basket_summary"),
          actionButton("calculate", "Calcular mi inflación", class = "btn-primary btn-block")
        )
      ),
      conditionalPanel("output.show_results",
        hr(),
        h4("Tu resultado"),
        fluidRow(
          column(4, uiOutput("kpi_personal")),
          column(4, uiOutput("kpi_ipc")),
          column(4, uiOutput("kpi_diff"))
        ),
        fluidRow(
          column(6, h5("Variación por producto"), DTOutput("result_products_table")),
          column(6, h5("Precio promedio por cadena"), plotlyOutput("cadena_chart", height = "300px"))
        )
      )
    ),

    # ── Tab 2: Explorador ─────────────────────────────────────────────────
    tabPanel("Explorador",
      fluidRow(
        column(7,
          h4("Productos"),
          fluidRow(
            column(8, textInput("exp_search", NULL, placeholder = "Buscar producto...")),
            column(4, selectInput("exp_period", "Variación",
              choices = c("Mensual" = "mensual", "Trimestral" = "trimestral", "Interanual" = "interanual")
            ))
          ),
          DTOutput("exp_product_table"),
          fluidRow(
            column(6, actionButton("exp_prev_page", "← Anterior", class = "btn-sm")),
            column(6, actionButton("exp_next_page", "Siguiente →", class = "btn-sm pull-right"))
          )
        ),
        column(5,
          h4("Detalle del producto"),
          uiOutput("exp_detail_card")
        )
      )
    ),

    # ── Tab 3: Insights ───────────────────────────────────────────────────
    tabPanel("Insights",
      fluidRow(
        column(4, uiOutput("insight_total")),
        column(4, uiOutput("insight_max_up")),
        column(4, uiOutput("insight_max_down"))
      ),
      hr(),
      fluidRow(
        column(6,
          h4("Alertas de precio"),
          DTOutput("alerts_table")
        ),
        column(6,
          h4("Ranking de cadenas"),
          plotlyOutput("chain_rank_chart", height = "300px")
        )
      )
    )
  )
)

server <- function(input, output, session) {
  con <- dbConnect(RSQLite::SQLite(), DB_PATH)
  onSessionEnded(function() dbDisconnect(con))

  # ── Reactive state ─────────────────────────────────────────────────────
  basket_eans <- reactiveVal(character())
  search_page <- reactiveVal(1)
  exp_page <- reactiveVal(1)
  selected_ean <- reactiveVal(NULL)
  calc_result <- reactiveVal(NULL)

  latest <- q_latest_fecha(con)

  # Populate category filter
  observe({
    cats <- q_categories(con)
    choices <- c("Todas" = "", setNames(cats$categoria, cats$categoria))
    updateSelectInput(session, "search_category", choices = choices)
  })

  # ── Tab 1: Search ─────────────────────────────────────────────────────

  observeEvent(input$search_term, { search_page(1) })
  observeEvent(input$search_category, { search_page(1) })
  observeEvent(input$period, { search_page(1) })
  observeEvent(input$prev_page, { search_page(max(1, search_page() - 1)) })
  observeEvent(input$next_page, { search_page(search_page() + 1) })

  search_data <- reactive({
    dias <- PERIOD_DAYS[[input$period]] %||% 30
    message("[DEBUG] search_data: period=", input$period, " dias=", dias,
            " search='", input$search_term, "' cat='", input$search_category, "'")
    result <- get_products(con,
      search    = input$search_term %||% "",
      category  = input$search_category %||% "",
      dias      = dias,
      page      = search_page(),
      page_size = PAGE_SIZE
    )
    message("[DEBUG] search_data got ", nrow(result), " rows")
    result
  })

  output$product_table <- renderDT({
    df <- search_data()
    if (nrow(df) == 0) return(datatable(data.frame(Mensaje = "Sin resultados"), options = list(dom = "t")))

    display <- df[, c("product_description", "marca", "categoria", "precio_actual", "variacion_pct")]
    names(display) <- c("Producto", "Marca", "Categoría", "Precio", "Var %")

    datatable(display,
      selection = "multiple",
      rownames = FALSE,
      options = list(dom = "t", pageLength = PAGE_SIZE, ordering = FALSE)
    ) |>
      formatCurrency("Precio", currency = "$", digits = 0) |>
      formatStyle("Var %", color = styleInterval(0, c("#4ade80", "#f87171")))
  })

  observeEvent(input$product_table_rows_selected, {
    rows <- input$product_table_rows_selected
    if (length(rows) == 0) return()
    df <- search_data()
    new_eans <- df$ean[rows]
    current <- basket_eans()
    basket_eans(unique(c(current, new_eans)))
  })

  # ── Basket ─────────────────────────────────────────────────────────────

  output$basket_list <- renderUI({
    eans <- basket_eans()
    if (length(eans) == 0) return(p("Seleccioná productos de la tabla.", class = "text-muted"))

    dias <- PERIOD_DAYS[[input$period]] %||% 30
    bdata <- get_products(con, eans = eans, dias = dias, page_size = 200)

    tags$ul(class = "list-group",
      lapply(seq_len(nrow(bdata)), function(i) {
        row <- bdata[i, ]
        var_label <- if (!is.na(row$variacion_pct)) paste0(row$variacion_pct, "%") else "—"
        var_class <- if (!is.na(row$variacion_pct) && row$variacion_pct > 0) "text-danger" else "text-success"
        tags$li(class = "list-group-item d-flex justify-content-between align-items-center",
          span(row$product_description),
          span(
            span(class = var_class, var_label),
            actionButton(paste0("rm_", row$ean), "×", class = "btn btn-sm btn-outline-danger ms-2",
              onclick = sprintf("Shiny.setInputValue('remove_ean', '%s', {priority: 'event'})", row$ean))
          )
        )
      })
    )
  })

  observeEvent(input$remove_ean, {
    basket_eans(setdiff(basket_eans(), input$remove_ean))
  })

  output$basket_summary <- renderUI({
    eans <- basket_eans()
    if (length(eans) == 0) return(NULL)
    p(strong(length(eans)), " productos en tu canasta")
  })

  # ── Calculate ──────────────────────────────────────────────────────────

  observeEvent(input$calculate, {
    eans <- basket_eans()
    if (length(eans) == 0) return()

    dias <- PERIOD_DAYS[[input$period]] %||% 30
    pd <- input$period %||% "mensual"
    ipc_val <- IPC[[pd]] %||% 0

    products <- get_products(con, eans = eans, dias = dias, page_size = 200)
    cadenas <- get_chain_prices(con, eans)

    personal <- if (nrow(products) > 0) round(mean(products$variacion_pct, na.rm = TRUE), 1) else 0
    diff_pp <- round(personal - ipc_val, 1)

    calc_result(list(
      personal = personal, ipc = ipc_val, diff_pp = diff_pp,
      products = products, cadenas = cadenas, period = pd
    ))
  })

  output$show_results <- reactive({ !is.null(calc_result()) })
  outputOptions(output, "show_results", suspendWhenHidden = FALSE)

  output$kpi_personal <- renderUI({
    r <- calc_result(); req(r)
    wellPanel(h6("Tu inflación"), h3(paste0(r$personal, "%"), class = if (r$personal > r$ipc) "text-danger" else "text-success"))
  })
  output$kpi_ipc <- renderUI({
    r <- calc_result(); req(r)
    wellPanel(h6("IPC oficial"), h3(paste0(r$ipc, "%")))
  })
  output$kpi_diff <- renderUI({
    r <- calc_result(); req(r)
    label <- if (r$diff_pp > 0) "por encima" else "por debajo"
    wellPanel(h6("Diferencia"), h3(paste0(r$diff_pp, " pp"), class = if (r$diff_pp > 0) "text-danger" else "text-success"), p(label))
  })

  output$result_products_table <- renderDT({
    r <- calc_result(); req(r)
    df <- r$products[order(-r$products$variacion_pct), c("product_description", "variacion_pct")]
    names(df) <- c("Producto", "Var %")
    datatable(df, rownames = FALSE, options = list(dom = "t", pageLength = 20))
  })

  output$cadena_chart <- renderPlotly({
    r <- calc_result(); req(r, nrow(r$cadenas) > 0)
    df <- r$cadenas
    df$cadena <- factor(df$cadena, levels = rev(df$cadena))
    plot_ly(df, y = ~cadena, x = ~precio_promedio_canasta, type = "bar", orientation = "h",
      marker = list(color = "#4ade80")) |>
      layout(xaxis = list(title = ""), yaxis = list(title = ""),
        paper_bgcolor = "transparent", plot_bgcolor = "transparent",
        font = list(color = "#ccc"))
  })

  # ── Tab 2: Explorador ─────────────────────────────────────────────────

  observeEvent(input$exp_search, { exp_page(1) })
  observeEvent(input$exp_period, { exp_page(1) })
  observeEvent(input$exp_prev_page, { exp_page(max(1, exp_page() - 1)) })
  observeEvent(input$exp_next_page, { exp_page(exp_page() + 1) })

  exp_data <- reactive({
    req(input$main_tabs == "Explorador")
    dias <- PERIOD_DAYS[[input$exp_period]] %||% 30
    get_products(con,
      search    = input$exp_search %||% "",
      dias      = dias,
      page      = exp_page(),
      page_size = PAGE_SIZE
    )
  })

  output$exp_product_table <- renderDT({
    df <- exp_data()
    if (nrow(df) == 0) return(datatable(data.frame(Mensaje = "Sin resultados"), options = list(dom = "t")))

    display <- df[, c("product_description", "marca", "precio_actual", "variacion_pct")]
    names(display) <- c("Producto", "Marca", "Precio", "Var %")

    datatable(display,
      selection = "single",
      rownames = FALSE,
      options = list(dom = "t", pageLength = PAGE_SIZE, ordering = FALSE)
    ) |>
      formatCurrency("Precio", currency = "$", digits = 0) |>
      formatStyle("Var %", color = styleInterval(0, c("#4ade80", "#f87171")))
  })

  observeEvent(input$exp_product_table_rows_selected, {
    row_idx <- input$exp_product_table_rows_selected
    if (length(row_idx) == 0) return()
    df <- exp_data()
    selected_ean(df$ean[row_idx])
  })

  output$exp_detail_card <- renderUI({
    ean <- selected_ean()
    if (is.null(ean)) return(p("Seleccioná un producto de la tabla.", class = "text-muted"))

    dias <- PERIOD_DAYS[[input$exp_period]] %||% 30
    info <- get_products(con, eans = c(ean), dias = dias)
    history <- get_price_history(con, ean)
    chains <- get_chain_prices(con, c(ean))

    name <- if (nrow(info) > 0) info$product_description[1] else ean
    brand <- if (nrow(info) > 0) info$marca[1] else ""
    var_pct <- if (nrow(info) > 0) info$variacion_pct[1] else NA

    var_label <- if (!is.na(var_pct)) paste0(var_pct, "%") else "—"
    var_class <- if (!is.na(var_pct) && var_pct > 0) "text-danger" else "text-success"

    in_basket <- ean %in% basket_eans()

    tagList(
      wellPanel(
        h5(name),
        p(class = "text-muted", brand),
        h4(class = var_class, var_label)
      ),
      if (nrow(history) > 1) plotlyOutput("exp_price_chart", height = "200px"),
      if (nrow(chains) > 0) {
        tags$table(class = "table table-sm",
          tags$thead(tags$tr(tags$th("Cadena"), tags$th("Precio"))),
          tags$tbody(
            lapply(seq_len(nrow(chains)), function(i) {
              tags$tr(
                tags$td(chains$cadena[i]),
                tags$td(paste0("$", formatC(chains$precio_promedio_canasta[i], format = "f", digits = 0, big.mark = ".")))
              )
            })
          )
        )
      },
      if (!in_basket) actionButton("exp_add_basket", "+ Agregar a canasta", class = "btn-primary btn-block")
      else p(class = "text-success", "✓ En tu canasta")
    )
  })

  output$exp_price_chart <- renderPlotly({
    ean <- selected_ean(); req(ean)
    history <- get_price_history(con, ean)
    req(nrow(history) > 1)
    plot_ly(history, x = ~fecha, y = ~precio_promedio, type = "scatter", mode = "lines",
      line = list(color = "#c9a87c")) |>
      layout(xaxis = list(title = ""), yaxis = list(title = "Precio"),
        paper_bgcolor = "transparent", plot_bgcolor = "transparent",
        font = list(color = "#ccc"))
  })

  observeEvent(input$exp_add_basket, {
    ean <- selected_ean()
    if (!is.null(ean)) basket_eans(unique(c(basket_eans(), ean)))
  })

  # ── Tab 3: Insights ───────────────────────────────────────────────────

  insights_data <- reactive({
    req(input$main_tabs == "Insights")
    dias <- PERIOD_DAYS[[input$period]] %||% 30
    all_products <- get_products(con, dias = dias, page_size = 200)
    valid <- all_products[!is.na(all_products$variacion_pct), ]
    chains <- get_chain_prices(con, all_products$ean[1:min(50, nrow(all_products))])
    list(all = all_products, valid = valid, chains = chains)
  })

  output$insight_total <- renderUI({
    d <- insights_data()
    wellPanel(h6("Productos monitoreados"), h3(nrow(d$all)))
  })
  output$insight_max_up <- renderUI({
    d <- insights_data()
    if (nrow(d$valid) == 0) return(wellPanel(h6("Mayor suba"), h3("—")))
    row <- d$valid[which.max(d$valid$variacion_pct), ]
    wellPanel(h6("Mayor suba"), h3(paste0("+", row$variacion_pct, "%"), class = "text-danger"), p(row$product_description))
  })
  output$insight_max_down <- renderUI({
    d <- insights_data()
    if (nrow(d$valid) == 0) return(wellPanel(h6("Mayor baja"), h3("—")))
    row <- d$valid[which.min(d$valid$variacion_pct), ]
    wellPanel(h6("Mayor baja"), h3(paste0(row$variacion_pct, "%"), class = "text-success"), p(row$product_description))
  })

  output$alerts_table <- renderDT({
    d <- insights_data()
    if (nrow(d$valid) == 0) return(datatable(data.frame(Mensaje = "Sin datos"), options = list(dom = "t")))
    top <- head(d$valid[order(-d$valid$variacion_pct), ], 15)
    display <- top[, c("product_description", "marca", "variacion_pct")]
    names(display) <- c("Producto", "Marca", "Var %")
    datatable(display, rownames = FALSE, options = list(dom = "t", pageLength = 15)) |>
      formatStyle("Var %", color = styleInterval(c(10, 20), c("#4ade80", "#fbbf24", "#f87171")))
  })

  output$chain_rank_chart <- renderPlotly({
    d <- insights_data()
    req(nrow(d$chains) > 0)
    df <- d$chains
    df$cadena <- factor(df$cadena, levels = rev(df$cadena))
    plot_ly(df, y = ~cadena, x = ~precio_promedio_canasta, type = "bar", orientation = "h",
      marker = list(color = "#4ade80")) |>
      layout(xaxis = list(title = ""), yaxis = list(title = ""),
        paper_bgcolor = "transparent", plot_bgcolor = "transparent",
        font = list(color = "#ccc"))
  })
}

shinyApp(ui = ui, server = server)
