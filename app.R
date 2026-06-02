library(shiny)
library(DBI)
library(RSQLite)
library(dplyr)
library(ggplot2)

source("R/queries.R")

# ═══════════════════════════════════════════════════════════════════════════
# Constants
# ═══════════════════════════════════════════════════════════════════════════

DB_PATH <- "C:/Users/Lorenzo/Desktop/prices.db"

IPC <- list(
  mensual    = 8.8,
  trimestral = 26.5,
  interanual = 118.4
)

PERIOD_DAYS <- list(
  mensual    = 30,
  trimestral = 90,
  interanual = 365
)

PERIOD_LABELS <- list(
  mensual    = "Mensual",
  trimestral = "Trimestral",
  interanual = "Interanual"
)

PERIOD_SUBTITLES <- list(
  mensual    = "30 días",
  trimestral = "90 días",
  interanual = "365 días"
)

# ═══════════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════════

variation_badge <- function(v) {
  if (is.null(v) || is.na(v)) {
    return(tags$span(class = "var-badge var-flat", "—"))
  }
  cls  <- if (v > 0) "var-up" else if (v < 0) "var-down" else "var-flat"
  sign <- if (v > 0) "+" else ""
  tags$span(class = paste("var-badge", cls), paste0(sign, v, "%"))
}

# ═══════════════════════════════════════════════════════════════════════════
# UI
# ═══════════════════════════════════════════════════════════════════════════

ui <- fluidPage(
  tags$head(
    tags$meta(charset = "UTF-8"),
    tags$meta(name = "viewport", content = "width=device-width, initial-scale=1.0"),
    tags$title("Observatorio de Inflación"),
    tags$link(
      href = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
      rel = "stylesheet"
    ),
    tags$style("
      /* ── Reset & Base ─────────────────────────────────────────────── */
      :root {
        --bg:        #0f0f0f;
        --surface:   #1a1a1a;
        --border:    #2a2a2a;
        --text:      #e5e5e5;
        --muted:     #888;
        --accent:    #4ade80;
        --red:       #f87171;
        --radius:    10px;
        --font:      'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      }

      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

      body {
        background: var(--bg);
        color: var(--text);
        font-family: var(--font);
        font-size: 15px;
        line-height: 1.5;
        -webkit-font-smoothing: antialiased;
      }

      ul { list-style: none; }

      button {
        font-family: inherit;
        cursor: pointer;
        border: none;
        background: none;
        color: inherit;
        font-size: inherit;
      }

      /* ── Header ───────────────────────────────────────────────────── */
      .app-header {
        padding: 24px 32px 0;
        max-width: 1100px;
        margin: 0 auto;
      }
      .header-row {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .header-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .app-title {
        font-size: 22px;
        font-weight: 700;
        letter-spacing: -0.3px;
      }
      .badge {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        background: var(--accent);
        color: #000;
        padding: 2px 8px;
        border-radius: 99px;
      }
      .app-subtitle {
        color: var(--muted);
        font-size: 14px;
        margin-top: 4px;
      }

      /* ── Tab Nav ──────────────────────────────────────────────────── */
      .tab-nav {
        display: flex;
        gap: 4px;
        padding: 20px 32px 0;
        max-width: 1100px;
        margin: 0 auto;
        border-bottom: 1px solid var(--border);
      }
      .tab-link {
        padding: 10px 20px;
        font-size: 14px;
        font-weight: 500;
        color: var(--muted);
        border-radius: var(--radius) var(--radius) 0 0;
        transition: color 0.15s, background 0.15s;
        background: transparent;
        position: relative;
      }
      .tab-link:hover { color: var(--text); }
      .tab-link.active {
        color: var(--text);
        background: var(--surface);
      }
      .tab-link.active::after {
        content: '';
        position: absolute;
        bottom: -1px;
        left: 0;
        right: 0;
        height: 2px;
        background: var(--accent);
      }

      /* ── Main ─────────────────────────────────────────────────────── */
      main {
        max-width: 1100px;
        margin: 0 auto;
        padding: 24px 32px 48px;
      }
      .tab-pane { display: none; }
      .tab-pane.active { display: block; }
      .step { display: none; }
      .step.active { display: block; }

      .placeholder-pane {
        text-align: center;
        padding: 80px 20px;
      }

      /* ── Step Layout ──────────────────────────────────────────────── */
      .step-columns {
        display: grid;
        grid-template-columns: 1fr 340px;
        gap: 28px;
        align-items: start;
      }
      .step-narrow {
        max-width: 620px;
        margin: 0 auto;
      }
      .step-top-bar {
        margin-bottom: 20px;
      }

      /* ── Headings ─────────────────────────────────────────────────── */
      .section-heading {
        font-size: 13px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        color: var(--muted);
        margin-bottom: 14px;
      }
      .section-subheading {
        font-size: 13px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        color: var(--muted);
        margin: 28px 0 14px;
      }

      /* ── Buttons ──────────────────────────────────────────────────── */
      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 10px 20px;
        font-size: 14px;
        font-weight: 600;
        border-radius: var(--radius);
        transition: background 0.15s, opacity 0.15s;
        gap: 6px;
      }
      .btn-primary {
        background: var(--accent);
        color: #000;
      }
      .btn-primary:hover { opacity: 0.85; }
      .btn-primary:disabled {
        opacity: 0.35;
        cursor: not-allowed;
      }
      .btn-secondary {
        background: var(--surface);
        color: var(--text);
        border: 1px solid var(--border);
      }
      .btn-secondary:hover { background: #252525; }
      .btn-ghost {
        background: transparent;
        color: var(--muted);
        padding: 8px 12px;
        font-weight: 500;
      }
      .btn-ghost:hover { color: var(--text); }
      .btn-full { width: 100%; }
      .btn-group {
        display: flex;
        gap: 10px;
        margin-top: 24px;
      }

      /* ── Search ───────────────────────────────────────────────────── */
      .search-box {
        position: relative;
        margin-bottom: 16px;
      }
      .search-box input {
        width: 100%;
        padding: 12px 14px 12px 38px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        color: var(--text);
        font-family: var(--font);
        font-size: 14px;
        outline: none;
        transition: border-color 0.15s;
      }
      .search-box input:focus { border-color: var(--accent); }
      .search-box input::placeholder { color: #555; }
      .search-icon {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        color: #555;
      }

      /* ── Category Chips ───────────────────────────────────────────── */
      .chip-group {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 16px;
      }
      .chip {
        padding: 6px 14px;
        font-size: 13px;
        font-weight: 500;
        border-radius: 99px;
        background: var(--surface);
        color: var(--muted);
        border: 1px solid var(--border);
        transition: background 0.15s, color 0.15s, border-color 0.15s;
      }
      .chip:hover { color: var(--text); border-color: #444; }
      .chip.active {
        background: var(--accent);
        color: #000;
        border-color: var(--accent);
      }

      /* ── Period Toggle ────────────────────────────────────────────── */
      .period-toggle {
        display: inline-flex;
        gap: 4px;
        background: var(--surface);
        border-radius: var(--radius);
        padding: 4px;
        margin-bottom: 18px;
      }
      .period-btn {
        padding: 7px 16px;
        font-size: 13px;
        font-weight: 500;
        border-radius: 7px;
        color: var(--muted);
        transition: background 0.15s, color 0.15s;
      }
      .period-btn:hover { color: var(--text); }
      .period-btn.active {
        background: #2a2a2a;
        color: var(--text);
        font-weight: 600;
      }

      /* ── Product List ─────────────────────────────────────────────── */
      .product-list {
        max-height: 480px;
        overflow-y: auto;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        background: var(--surface);
      }
      .product-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        border-bottom: 1px solid #222;
        transition: background 0.1s;
      }
      .product-row:last-child { border-bottom: none; }
      .product-row:hover { background: #1e1e1e; }
      .product-row.in-basket { background: rgba(74, 222, 128, 0.06); }
      .product-info {
        flex: 1;
        min-width: 0;
      }
      .product-name {
        font-size: 14px;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .product-meta {
        font-size: 12px;
        color: var(--muted);
        margin-top: 1px;
      }
      .product-price {
        font-size: 13px;
        font-weight: 500;
        color: var(--muted);
        white-space: nowrap;
        min-width: 70px;
        text-align: right;
      }
      .product-add {
        flex-shrink: 0;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 1px solid var(--border);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        color: var(--muted);
        transition: background 0.15s, color 0.15s, border-color 0.15s;
      }
      .product-add:hover { border-color: var(--accent); color: var(--accent); }
      .product-row.in-basket .product-add {
        background: var(--accent);
        color: #000;
        border-color: var(--accent);
      }
      .product-row.in-basket .product-add:hover {
        opacity: 0.8;
      }

      /* ── Variation Badge ──────────────────────────────────────────── */
      .var-badge {
        font-size: 13px;
        font-weight: 600;
        padding: 3px 10px;
        border-radius: 99px;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .var-up   { background: rgba(248, 113, 113, 0.15); color: var(--red); }
      .var-down { background: rgba(74, 222, 128, 0.12); color: var(--accent); }
      .var-flat { background: rgba(136, 136, 136, 0.12); color: var(--muted); }

      /* ── Basket List ──────────────────────────────────────────────── */
      .basket-list {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
      }
      .basket-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        border-bottom: 1px solid #222;
      }
      .basket-item:last-child { border-bottom: none; }
      .basket-item-info {
        flex: 1;
        min-width: 0;
      }
      .basket-item-name {
        font-size: 14px;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .basket-item-cat {
        font-size: 12px;
        color: var(--muted);
        margin-top: 1px;
      }
      .basket-remove {
        flex-shrink: 0;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        color: var(--muted);
        transition: color 0.15s, background 0.15s;
      }
      .basket-remove:hover {
        color: var(--red);
        background: rgba(248, 113, 113, 0.1);
      }

      /* ── Basket Summary (Step 1 right panel) ──────────────────────── */
      .basket-summary {
        margin-top: 16px;
        padding: 16px;
        background: var(--surface);
        border-radius: var(--radius);
        border: 1px solid var(--border);
        display: flex;
        gap: 20px;
      }
      .basket-summary.hidden { display: none; }
      .summary-block { flex: 1; }
      .summary-label {
        font-size: 12px;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 4px;
      }
      .summary-value {
        font-size: 22px;
        font-weight: 700;
        letter-spacing: -0.5px;
      }
      .summary-sub {
        font-size: 13px;
        margin-top: 4px;
      }

      /* ── Result Cards (Step 3) ────────────────────────────────────── */
      .result-cards {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        margin-bottom: 8px;
      }
      .result-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 20px;
        text-align: center;
      }
      .result-card-label {
        font-size: 12px;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 8px;
      }
      .result-card-value {
        font-size: 28px;
        font-weight: 700;
        letter-spacing: -0.5px;
      }
      .result-card-sub {
        font-size: 13px;
        color: var(--muted);
        margin-top: 6px;
      }

      /* ── Colors ───────────────────────────────────────────────────── */
      .color-red   { color: var(--red); }
      .color-green { color: var(--accent); }

      /* ── Chart ────────────────────────────────────────────────────── */
      .chart-wrapper {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 16px;
        margin-bottom: 8px;
      }

      /* ── Empty State ──────────────────────────────────────────────── */
      .empty-state {
        text-align: center;
        padding: 32px 20px;
        color: var(--muted);
        font-size: 14px;
      }

      /* ── Scrollbar ────────────────────────────────────────────────── */
      ::-webkit-scrollbar { width: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb {
        background: #333;
        border-radius: 3px;
      }

      /* ── Responsive ───────────────────────────────────────────────── */
      @media (max-width: 768px) {
        .app-header { padding: 20px 16px 0; }
        .tab-nav { padding: 16px 16px 0; overflow-x: auto; }
        main { padding: 20px 16px 40px; }
        .step-columns { grid-template-columns: 1fr; }
        .result-cards { grid-template-columns: 1fr; }
      }
    ")
  ),

  # ── Header ─────────────────────────────────────────────────────────────
  tags$header(class = "app-header",
    tags$div(class = "header-row",
      tags$div(class = "header-left",
        tags$h1(class = "app-title", "Observatorio de inflación"),
        tags$span(class = "badge", "Beta")
      )
    ),
    tags$p(class = "app-subtitle", "Tu inflación real, no el promedio")
  ),

  # ── Tab Navigation ─────────────────────────────────────────────────────
  tags$nav(class = "tab-nav",
    tags$button(class = "tab-link active", `data-tab` = "canasta",
                onclick = "Shiny.setInputValue('active_tab', 'canasta')", "Mi canasta"),
    tags$button(class = "tab-link", `data-tab` = "explorador",
                onclick = "Shiny.setInputValue('active_tab', 'explorador')", "Explorador"),
    tags$button(class = "tab-link", `data-tab` = "insights",
                onclick = "Shiny.setInputValue('active_tab', 'insights')", "Insights")
  ),

  # ── Main Content ───────────────────────────────────────────────────────
  tags$main(
    # Tab: Mi canasta
    conditionalPanel(
      condition = "input.active_tab != 'explorador' && input.active_tab != 'insights'",
      uiOutput("step_content")
    ),
    # Tab: Explorador
    conditionalPanel(
      condition = "input.active_tab == 'explorador'",
      tags$div(class = "placeholder-pane",
        tags$p(class = "empty-state", "Explorador — próximamente")
      )
    ),
    # Tab: Insights
    conditionalPanel(
      condition = "input.active_tab == 'insights'",
      tags$div(class = "placeholder-pane",
        tags$p(class = "empty-state", "Insights — próximamente")
      )
    )
  ),

  # ── JS: Tab switching + search input binding ───────────────────────────
  tags$script("
    $(document).on('shiny:connected', function() {

      // Tab highlight
      Shiny.addCustomMessageHandler('highlight_tab', function(tab) {
        $('.tab-link').removeClass('active');
        $('.tab-link[data-tab=\"' + tab + '\"]').addClass('active');
      });

      // Debounced search input (event delegation for dynamically rendered input)
      var searchTimer = null;
      $(document).on('input', '#search_term', function() {
        var val = $(this).val();
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function() {
          Shiny.setInputValue('search_term', val);
        }, 300);
      });

      // Restore focus to search input after Shiny re-renders step content
      $(document).on('shiny:value', function(e) {
        if (e.name === 'step_content') {
          setTimeout(function() {
            var el = document.getElementById('search_term');
            if (el) {
              el.focus();
              el.selectionStart = el.selectionEnd = el.value.length;
            }
          }, 50);
        }
      });

    });
  ")
)

# ═══════════════════════════════════════════════════════════════════════════
# Server
# ═══════════════════════════════════════════════════════════════════════════

server <- function(input, output, session) {

  # ── Database ───────────────────────────────────────────────────────────
  con <- dbConnect(RSQLite::SQLite(), DB_PATH)
  onSessionEnded(function() dbDisconnect(con))

  # ── Reactive State ─────────────────────────────────────────────────────
  current_step  <- reactiveVal(1)
  basket_eans   <- reactiveVal(character())
  basket_info   <- reactiveVal(list())   # ean -> list(name, brand, category)

  # ── Tab switching ──────────────────────────────────────────────────────
  observeEvent(input$active_tab, {
    session$sendCustomMessage("highlight_tab", input$active_tab)
  }, ignoreNULL = TRUE)

  # ── Period ─────────────────────────────────────────────────────────────
  period <- reactive({ input$period %||% "mensual" })

  # ── Cached latest fecha ────────────────────────────────────────────────
  latest_fecha <- reactiveVal(NULL)

  observe({
    latest_fecha(q_latest_fecha(con))
  })

  cutoff_fecha <- reactive({
    req(latest_fecha())
    pd   <- period()
    days <- PERIOD_DAYS[[pd]] %||% 30
    target <- as.character(as.Date(latest_fecha()) - days)
    q_cutoff_fecha(con, target)
  })

  # ── Load categories on startup ─────────────────────────────────────────
  categories <- reactiveVal(data.frame(categoria = character(), n = integer()))

  observe({
    categories(q_categories(con))
  })

  # ── Search products (reactive) ─────────────────────────────────────────
  search_term_val  <- reactiveVal("")
  search_cat_val   <- reactiveVal("")

  observe({
    search_term_val(input$search_term %||% "")
  })

  observe({
    search_cat_val(input$search_category %||% "")
  })

  search_results <- reactive({
    req(latest_fecha())
    q_search_products(con, latest_fecha(), cutoff_fecha(),
                      search_term_val(), search_cat_val())
  })

  # ── Basket variations (for steps 2 & 3) ────────────────────────────────
  basket_variations <- reactive({
    eans <- basket_eans()
    if (length(eans) == 0) return(data.frame())
    req(latest_fecha())
    q_basket_variations(con, eans, latest_fecha(), cutoff_fecha())
  })

  # ── Basket summary (for step 1 right panel) ────────────────────────────
  basket_summary_data <- reactive({
    bv <- basket_variations()
    if (nrow(bv) == 0) return(NULL)

    vars <- bv$variacion
    vars <- vars[!is.na(vars)]
    if (length(vars) == 0) return(NULL)

    avg  <- round(mean(vars), 1)
    ipc  <- IPC[[period()]] %||% 0
    diff <- round(avg - ipc, 1)

    list(
      avg  = avg,
      ipc  = ipc,
      diff = diff,
      n    = length(vars)
    )
  })

  # ── Basket management: add/remove product ──────────────────────────────
  observeEvent(input$add_product, {
    ean <- input$add_product
    if (is.null(ean) || !nzchar(ean)) return()

    current <- basket_eans()
    if (ean %in% current) return()  # already in basket

    # Find product details from current search results
    sr <- search_results()
    row <- sr[sr$ean == ean, ]
    if (nrow(row) == 0) {
      # Fallback: query the DB directly
      row <- tryCatch(
        dbGetQuery(con, "SELECT ean, product_description, marca, categoria FROM canonical_products WHERE ean = ?",
                   params = list(ean)),
        error = function(e) data.frame()
      )
    }

    basket_eans(c(current, ean))

    info <- basket_info()
    info[[ean]] <- list(
      name     = if (nrow(row) > 0) row$product_description[1] %||% ean else ean,
      brand    = if (nrow(row) > 0) row$marca[1] %||% "" else "",
      category = if (nrow(row) > 0) row$categoria[1] %||% "" else ""
    )
    basket_info(info)
  })

  observeEvent(input$remove_product, {
    ean <- input$remove_product
    if (is.null(ean) || !nzchar(ean)) return()

    current <- basket_eans()
    basket_eans(setdiff(current, ean))

    info <- basket_info()
    info[[ean]] <- NULL
    basket_info(info)
  })

  # ── Step navigation ────────────────────────────────────────────────────
  observeEvent(input$go_to_step, {
    step <- as.integer(input$go_to_step)
    if (step %in% 1:3) current_step(step)
  })

  # ═════════════════════════════════════════════════════════════════════
  # Step 1 UI
  # ═════════════════════════════════════════════════════════════════════

  output$step_content <- renderUI({
    step <- current_step()
    switch(as.character(step),
      "1" = step1_ui(),
      "2" = step2_ui(),
      "3" = step3_ui()
    )
  })

  # Re-bind custom message on step change for tab highlighting
  observeEvent(current_step(), {
    # Re-sync tab highlight if needed
    session$sendCustomMessage("highlight_tab", "canasta")
  })

  step1_ui <- reactive({
    sr  <- search_results()
    eans <- basket_eans()
    info <- basket_info()
    cats <- categories()
    summary <- basket_summary_data()

    tagList(
      tags$div(class = "step-columns",

        # ── Left column: search + product list ───────────────────────
        tags$div(class = "col-left",
          tags$h2(class = "section-heading", "ARMA TU CANASTA"),

          # Search box
          tags$div(class = "search-box",
            tags$svg(class = "search-icon", viewBox = "0 0 24 24", width = "16", height = "16",
              fill = "none", stroke = "currentColor", `stroke-width` = "2",
              tags$circle(cx = "11", cy = "11", r = "8"),
              tags$line(x1 = "21", y1 = "21", x2 = "16.65", y2 = "16.65")
            ),
            tags$input(id = "search_term", type = "text", placeholder = "Buscar producto…",
              value = isolate(search_term_val()), autocomplete = "off")
          ),

          # Category chips
          if (nrow(cats) > 0) {
            tags$div(id = "category_chips", class = "chip-group",
              tags$button(
                class = paste("chip", if (search_cat_val() == "") " active" else ""),
                onclick = "Shiny.setInputValue('search_category', '')",
                "Todos"
              ),
              lapply(seq_len(nrow(cats)), function(i) {
                cat <- cats$categoria[[i]]
                tags$button(
                  class = paste("chip", if (search_cat_val() == cat) " active" else ""),
                  onclick = sprintf("Shiny.setInputValue('search_category', '%s')", gsub("'", "\\'", cat)),
                  cat
                )
              })
            )
          },

          # Period toggle
          tags$div(class = "period-toggle", id = "period_toggle_1",
            lapply(c("mensual", "trimestral", "interanual"), function(p) {
              tags$button(
                class = paste("period-btn", if (period() == p) " active" else ""),
                onclick = sprintf("Shiny.setInputValue('period', '%s')", p),
                PERIOD_LABELS[[p]]
              )
            })
          ),

          # Product list
          if (nrow(sr) == 0) {
            tags$ul(class = "product-list",
              tags$li(class = "empty-state", "No se encontraron productos.")
            )
          } else {
            tags$ul(class = "product-list",
              lapply(seq_len(nrow(sr)), function(i) {
                p     <- sr[i, ]
                in_b  <- p$ean %in% eans
                ean_safe <- gsub("'", "\\'", p$ean)
                tags$li(
                  class = paste("product-row", if (in_b) " in-basket" else ""),
                  `data-ean` = p$ean,
                  tags$div(class = "product-info",
                    tags$div(class = "product-name", p$product_description),
                    tags$div(class = "product-meta",
                      paste(c(p$marca, p$categoria), collapse = " · "))
                  ),
                  tags$span(class = "product-price",
                    if (!is.na(p$precio_actual) && p$precio_actual > 0)
                      paste0("$", formatC(p$precio_actual, format = "f", digits = 0, big.mark = "."))
                    else "—"
                  ),
                  variation_badge(p$variacion),
                  tags$button(
                    class = "product-add",
                    onclick = sprintf("Shiny.setInputValue('%s', '%s')",
                      if (in_b) "remove_product" else "add_product", ean_safe),
                    if (in_b) "✓" else "+"
                  )
                )
              })
            )
          }
        ),

        # ── Right column: basket preview ─────────────────────────────
        tags$div(class = "col-right",
          tags$h2(class = "section-heading", "TU CANASTA ACTUAL"),

          if (length(eans) == 0) {
            tags$ul(class = "basket-list",
              tags$li(class = "empty-state", "Agregá productos desde la izquierda.")
            )
          } else {
            tagList(
              tags$ul(class = "basket-list",
                lapply(eans, function(ean) {
                  inf <- info[[ean]]
                  ean_safe <- gsub("'", "\\'", ean)
                  bv <- basket_variations()
                  var_row <- if (nrow(bv) > 0) bv[bv$ean == ean, ] else data.frame()
                  v <- if (nrow(var_row) > 0) var_row$variacion[1] else NULL

                  tags$li(class = "basket-item", `data-ean` = ean,
                    tags$div(class = "basket-item-info",
                      tags$div(class = "basket-item-name", inf$name %||% ean),
                      tags$div(class = "basket-item-cat",
                        paste(c(inf$brand, inf$category), collapse = " · "))
                    ),
                    variation_badge(v),
                    tags$button(class = "basket-remove",
                      onclick = sprintf("Shiny.setInputValue('remove_product', '%s')", ean_safe),
                      `aria-label` = "Quitar", "×")
                  )
                })
              ),

              # Summary
              if (!is.null(summary)) {
                tags$div(class = "basket-summary",
                  tags$div(class = "summary-block",
                    tags$div(class = "summary-label",
                      paste("Tu inflación (", PERIOD_SUBTITLES[[period()]], ")", sep = "")),
                    tags$div(class = paste("summary-value",
                      if (summary$avg >= 0) "color-red" else "color-green"),
                      paste0(if (summary$avg >= 0) "+" else "", summary$avg, "%"))
                  ),
                  tags$div(class = "summary-block",
                    tags$div(class = "summary-label", "IPC oficial"),
                    tags$div(class = "summary-value",
                      paste0(if (summary$ipc >= 0) "+" else "", summary$ipc, "%")),
                    tags$div(class = paste("summary-sub",
                      if (summary$diff > 0) "color-red" else if (summary$diff < 0) "color-green" else ""),
                      paste0(
                        if (summary$diff >= 0) "+" else "", summary$diff, " pp ",
                        if (summary$diff > 0) "por encima"
                        else if (summary$diff < 0) "por debajo"
                        else ""
                      ))
                  )
                )
              }
            )
          },

          tags$button(
            id = "btn_review",
            class = "btn btn-primary btn-full",
            style = "margin-top: 16px;",
            disabled = if (length(eans) == 0) "" else NULL,
            onclick = "Shiny.setInputValue('go_to_step', 2)",
            paste0("Revisar canasta", if (length(eans) > 0) paste0(" (", length(eans), ")") else "")
          )
        )
      )
    )
  })

  # ═════════════════════════════════════════════════════════════════════
  # Step 2 UI
  # ═════════════════════════════════════════════════════════════════════

  step2_ui <- reactive({
    eans <- basket_eans()
    info <- basket_info()
    bv   <- basket_variations()

    tags$div(class = "step-narrow",
      tags$div(class = "step-top-bar",
        tags$button(class = "btn btn-ghost",
          onclick = "Shiny.setInputValue('go_to_step', 1)",
          "← Volver")
      ),

      tags$h2(class = "section-heading", "REVISAR TU CANASTA"),

      # Period toggle (synced)
      tags$div(class = "period-toggle", id = "period_toggle_2",
        lapply(c("mensual", "trimestral", "interanual"), function(p) {
          tags$button(
            class = paste("period-btn", if (period() == p) " active" else ""),
            onclick = sprintf("Shiny.setInputValue('period', '%s')", p),
            PERIOD_LABELS[[p]]
          )
        })
      ),

      if (length(eans) == 0) {
        tags$ul(class = "basket-list",
          tags$li(class = "empty-state", "Tu canasta está vacía. Volvé al paso 1 para agregar productos.")
        )
      } else {
        tagList(
          tags$ul(class = "basket-list",
            lapply(eans, function(ean) {
              inf <- info[[ean]]
              var_row <- if (nrow(bv) > 0) bv[bv$ean == ean, ] else data.frame()
              v <- if (nrow(var_row) > 0) var_row$variacion[1] else NULL
              ean_safe <- gsub("'", "\\'", ean)

              tags$li(class = "basket-item", `data-ean` = ean,
                tags$div(class = "basket-item-info",
                  tags$div(class = "basket-item-name", inf$name %||% ean),
                  tags$div(class = "basket-item-cat",
                    paste(c(inf$brand, inf$category), collapse = " · "))
                ),
                variation_badge(v),
                tags$button(class = "basket-remove",
                  onclick = sprintf("Shiny.setInputValue('remove_product', '%s')", ean_safe),
                  `aria-label` = "Quitar", "×")
              )
            })
          ),

          tags$div(class = "btn-group",
            tags$button(id = "btn_results", class = "btn btn-primary btn-full",
              onclick = "Shiny.setInputValue('go_to_step', 3)",
              "Ver mi resultado")
          )
        )
      }
    )
  })

  # ═════════════════════════════════════════════════════════════════════
  # Step 3 UI (results depend on server-side data, so use renderUI)
  # ═════════════════════════════════════════════════════════════════════

  step3_data <- reactive({
    eans <- basket_eans()
    if (length(eans) == 0) return(NULL)
    req(latest_fecha())

    pd <- period()

    product_data <- q_basket_variations(con, eans, latest_fecha(), cutoff_fecha()) %>%
      arrange(desc(variacion))

    cadena_data <- q_cadena_prices(con, eans, latest_fecha())

    personal_inflation <- if (nrow(product_data) > 0) {
      round(mean(product_data$variacion, na.rm = TRUE), 1)
    } else 0

    ipc_val <- IPC[[pd]] %||% 0
    diff_pp <- round(personal_inflation - ipc_val, 1)

    list(
      personal_inflation = personal_inflation,
      ipc                = ipc_val,
      diff_pp            = diff_pp,
      period_label       = PERIOD_SUBTITLES[[pd]],
      products           = product_data,
      cadenas            = cadena_data
    )
  })

  step3_ui <- reactive({
    data <- step3_data()

    tags$div(class = "step-narrow",
      tags$div(class = "step-top-bar",
        tags$button(class = "btn btn-ghost",
          onclick = "Shiny.setInputValue('go_to_step', 2)",
          "← Editar canasta")
      ),

      tags$h2(class = "section-heading", "TU RESULTADO"),

      if (is.null(data) || nrow(data$products) == 0) {
        tags$div(class = "result-cards",
          tags$div(class = "result-card",
            tags$div(class = "result-card-label", "Sin datos"),
            tags$div(class = "result-card-sub", "Agregá productos a tu canasta para ver tu inflación personal.")
          )
        )
      } else {
        pi_sign  <- if (data$personal_inflation >= 0) "+" else ""
        pi_color <- if (data$personal_inflation > data$ipc) "color-red" else "color-green"
        diff_sign <- if (data$diff_pp >= 0) "+" else ""
        diff_color <- if (data$diff_pp > 0) "color-red" else if (data$diff_pp < 0) "color-green" else ""
        ipc_sign <- if (data$ipc >= 0) "+" else ""

        tagList(
          # Headline cards
          tags$div(class = "result-cards",
            tags$div(class = "result-card",
              tags$div(class = "result-card-label", paste("Tu inflación (", data$period_label, ")", sep = "")),
              tags$div(class = paste("result-card-value", pi_color),
                paste0(pi_sign, data$personal_inflation, "%"))
            ),
            tags$div(class = "result-card",
              tags$div(class = "result-card-label", "IPC oficial"),
              tags$div(class = "result-card-value",
                paste0(ipc_sign, data$ipc, "%"))
            ),
            tags$div(class = "result-card",
              tags$div(class = "result-card-label", "Diferencia"),
              tags$div(class = paste("result-card-value", diff_color),
                paste0(diff_sign, data$diff_pp, " pp")),
              tags$div(class = "result-card-sub",
                if (data$diff_pp > 0) "Por encima del IPC"
                else if (data$diff_pp < 0) "Por debajo del IPC"
                else "Igual al IPC")
            )
          ),

          # Product breakdown
          tags$h3(class = "section-subheading", "VARIACIÓN POR PRODUCTO"),
          tags$ul(class = "basket-list",
            lapply(seq_len(nrow(data$products)), function(i) {
              p <- data$products[i, ]
              tags$li(class = "basket-item",
                tags$div(class = "basket-item-info",
                  tags$div(class = "basket-item-name", p$product_description),
                  tags$div(class = "basket-item-cat",
                    paste(c(p$marca, p$categoria), collapse = " · "))
                ),
                variation_badge(p$variacion)
              )
            })
          ),

          # Cadena chart
          tags$h3(class = "section-subheading", "PRECIO PROMEDIO POR CADENA"),
          tags$div(class = "chart-wrapper",
            plotOutput("cadena_chart", height = "350px")
          ),

          tags$div(class = "btn-group",
            tags$button(class = "btn btn-secondary",
              onclick = "Shiny.setInputValue('go_to_step', 2)",
              "Editar canasta")
          )
        )
      }
    )
  })

  # ═════════════════════════════════════════════════════════════════════
  # Cadena bar chart (Step 3)
  # ═════════════════════════════════════════════════════════════════════

  output$cadena_chart <- renderPlot({
    data <- step3_data()
    req(data, nrow(data$cadenas) > 0)

    df <- data$cadenas
    df$cadena <- factor(df$cadena, levels = rev(df$cadena))

    ggplot(df, aes(x = cadena, y = precio_promedio)) +
      geom_col(fill = "#4ade80", width = 0.55) +
      geom_text(
        aes(label = paste0("$", formatC(precio_promedio, format = "f", digits = 0, big.mark = "."))),
        hjust = -0.15, color = "#e5e5e5", size = 4.5
      ) +
      coord_flip() +
      scale_y_continuous(expand = expansion(mult = c(0, 0.35))) +
      labs(x = NULL, y = NULL) +
      theme_void() +
      theme(
        plot.background  = element_rect(fill = "#1a1a1a", color = NA),
        panel.background = element_rect(fill = "#1a1a1a", color = NA),
        axis.text.y      = element_text(color = "#e5e5e5", size = 13, hjust = 1, margin = margin(r = 12)),
        plot.margin      = margin(12, 24, 12, 12)
      )
  }, bg = "#1a1a1a")

  outputOptions(output, "cadena_chart", suspendWhenHidden = FALSE)

  # ── Handle search input changes ────────────────────────────────────────
  observeEvent(input$search_term, {
    search_term_val(input$search_term)
  }, ignoreNULL = FALSE)

  # ── Handle category chip changes ───────────────────────────────────────
  observeEvent(input$search_category, {
    search_cat_val(input$search_category)
  }, ignoreNULL = FALSE)

  # ── Handle period changes ──────────────────────────────────────────────
  observeEvent(input$period, {
    # period() is already reactive, this just triggers invalidation
  })
}

# ═══════════════════════════════════════════════════════════════════════════
# Run
# ═══════════════════════════════════════════════════════════════════════════

shinyApp(ui = ui, server = server)
