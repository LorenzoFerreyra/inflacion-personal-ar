library(shiny)
library(DBI)
library(RSQLite)
library(dplyr)
library(ggplot2)

# ═══════════════════════════════════════════════════════════════════════════
# Constants
# ═══════════════════════════════════════════════════════════════════════════

DB_PATH <- "C:/Users/Lorenzo/Desktop/prices.db"

IPC <- list(mensual = 8.8, trimestral = 26.5, interanual = 118.4)

PERIOD_DAYS <- list(mensual = 30, trimestral = 90, interanual = 365)

PERIOD_LABELS <- list(
  mensual = "Mensual", trimestral = "Trimestral", interanual = "Interanual"
)

PERIOD_SUBTITLES <- list(
  mensual = "30 días", trimestral = "90 días", interanual = "365 días"
)

# ═══════════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════════

variation_badge <- function(v) {
  if (is.null(v) || is.na(v)) {
    return(span("var-badge var-flat", "—"))
  }
  cls <- if (v > 0) "var-up" else if (v < 0) "var-down" else "var-flat"
  sign <- if (v > 0) "+" else ""
  span(paste("var-badge", cls), paste0(sign, v, "%"))
}

span <- function(class, text) {
  sprintf('<span class="%s">%s</span>', class, text)
}

# ═══════════════════════════════════════════════════════════════════════════
# CSS
# ═══════════════════════════════════════════════════════════════════════════

CSS <- '
:root {
  --bg:      #0f0f0f;
  --surface: #1a1a1a;
  --border:  #2a2a2a;
  --text:    #e5e5e5;
  --muted:   #888;
  --accent:  #4ade80;
  --red:     #f87171;
  --radius:  10px;
  --font:    "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: var(--bg); color: var(--text);
  font-family: var(--font); font-size: 15px; line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
ul { list-style: none; }
button {
  font-family: inherit; cursor: pointer; border: none;
  background: none; color: inherit; font-size: inherit;
}

/* Header */
.app-header { padding: 24px 32px 0; max-width: 1100px; margin: 0 auto; }
.header-row { display: flex; align-items: center; gap: 12px; }
.header-left { display: flex; align-items: center; gap: 12px; }
.app-title { font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }
.badge {
  font-size: 11px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.5px; background: var(--accent); color: #000;
  padding: 2px 8px; border-radius: 99px;
}
.app-subtitle { color: var(--muted); font-size: 14px; margin-top: 4px; }

/* Tab nav */
.tab-nav {
  display: flex; gap: 4px; padding: 20px 32px 0; max-width: 1100px;
  margin: 0 auto; border-bottom: 1px solid var(--border);
}
.tab-link {
  padding: 10px 20px; font-size: 14px; font-weight: 500; color: var(--muted);
  border-radius: var(--radius) var(--radius) 0 0;
  transition: color 0.15s, background 0.15s;
  background: transparent; position: relative;
}
.tab-link:hover { color: var(--text); }
.tab-link.active { color: var(--text); background: var(--surface); }
.tab-link.active::after {
  content: ""; position: absolute; bottom: -1px; left: 0; right: 0;
  height: 2px; background: var(--accent);
}

/* Main */
main { max-width: 1100px; margin: 0 auto; padding: 24px 32px 48px; }
.placeholder-pane { text-align: center; padding: 80px 20px; }

/* Step layout */
.step-columns { display: grid; grid-template-columns: 1fr 340px; gap: 28px; align-items: start; }
.step-narrow  { max-width: 620px; margin: 0 auto; }
.step-top-bar { margin-bottom: 20px; }

/* Headings */
.section-heading {
  font-size: 13px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.8px; color: var(--muted); margin-bottom: 14px;
}
.section-subheading {
  font-size: 13px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.8px; color: var(--muted); margin: 28px 0 14px;
}

/* Buttons */
.btn {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 10px 20px; font-size: 14px; font-weight: 600;
  border-radius: var(--radius); transition: background 0.15s, opacity 0.15s;
  gap: 6px;
}
.btn-primary       { background: var(--accent); color: #000; }
.btn-primary:hover { opacity: 0.85; }
.btn-primary:disabled { opacity: 0.35; cursor: not-allowed; }
.btn-secondary       { background: var(--surface); color: var(--text); border: 1px solid var(--border); }
.btn-secondary:hover { background: #252525; }
.btn-ghost       { background: transparent; color: var(--muted); padding: 8px 12px; font-weight: 500; }
.btn-ghost:hover { color: var(--text); }
.btn-full { width: 100%; }
.btn-group { display: flex; gap: 10px; margin-top: 24px; }

/* Search */
.search-box { position: relative; margin-bottom: 16px; }
.search-box input {
  width: 100%; padding: 12px 14px 12px 38px; background: var(--surface);
  border: 1px solid var(--border); border-radius: var(--radius);
  color: var(--text); font-family: var(--font); font-size: 14px;
  outline: none; transition: border-color 0.15s;
}
.search-box input:focus { border-color: var(--accent); }
.search-box input::placeholder { color: #555; }
.search-icon {
  position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
  color: #555; pointer-events: none;
}

/* Category chips */
.chip-group { margin-bottom: 8px; }
.chip-wrapper {
  display: flex; flex-wrap: wrap; gap: 8px;
  max-height: 72px; overflow: hidden; transition: max-height 0.3s ease;
}
.chip-wrapper.expanded { max-height: 320px; overflow-y: auto; padding-right: 4px; }
.chip {
  padding: 6px 14px; font-size: 13px; font-weight: 500; border-radius: 99px;
  background: var(--surface); color: var(--muted); border: 1px solid var(--border);
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  flex-shrink: 0; white-space: nowrap;
}
.chip:hover { color: var(--text); border-color: #444; }
.chip.active { background: var(--accent); color: #000; border-color: var(--accent); }
.chip-more {
  padding: 5px 12px; font-size: 12px; font-weight: 500; color: var(--muted);
  background: transparent; border: 1px dashed var(--border);
  border-radius: 99px; margin-top: 6px; transition: color 0.15s, border-color 0.15s;
  cursor: pointer; flex-shrink: 0;
}
.chip-more:hover { color: var(--text); border-color: #555; }

/* Period toggle */
.period-toggle {
  display: inline-flex; gap: 4px; background: var(--surface);
  border-radius: var(--radius); padding: 4px; margin-bottom: 18px;
}
.period-btn {
  padding: 7px 16px; font-size: 13px; font-weight: 500;
  border-radius: 7px; color: var(--muted); transition: background 0.15s, color 0.15s;
}
.period-btn:hover { color: var(--text); }
.period-btn.active { background: #2a2a2a; color: var(--text); font-weight: 600; }

/* Product list */
.product-list {
  max-height: 480px; overflow-y: auto; border: 1px solid var(--border);
  border-radius: var(--radius); background: var(--surface);
}
.product-row {
  display: flex; align-items: center; gap: 12px; padding: 12px 16px;
  border-bottom: 1px solid #222; transition: background 0.1s;
}
.product-row:last-child { border-bottom: none; }
.product-row:hover { background: #1e1e1e; }
.product-row.in-basket { background: rgba(74, 222, 128, 0.06); }
.product-info { flex: 1; min-width: 0; }
.product-name {
  font-size: 14px; font-weight: 500; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis;
}
.product-meta { font-size: 12px; color: var(--muted); margin-top: 1px; }
.product-price {
  font-size: 13px; font-weight: 500; color: var(--muted);
  white-space: nowrap; min-width: 70px; text-align: right;
}
.product-add {
  flex-shrink: 0; width: 32px; height: 32px; border-radius: 50%;
  border: 1px solid var(--border); display: flex; align-items: center;
  justify-content: center; font-size: 16px; color: var(--muted);
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.product-add:hover { border-color: var(--accent); color: var(--accent); }
.product-row.in-basket .product-add {
  background: var(--accent); color: #000; border-color: var(--accent);
}
.product-row.in-basket .product-add:hover { opacity: 0.8; }

/* Variation badge */
.var-badge {
  font-size: 13px; font-weight: 600; padding: 3px 10px;
  border-radius: 99px; white-space: nowrap; flex-shrink: 0;
}
.var-up   { background: rgba(248, 113, 113, 0.15); color: var(--red); }
.var-down { background: rgba(74, 222, 128, 0.12); color: var(--accent); }
.var-flat { background: rgba(136, 136, 136, 0.12); color: var(--muted); }

/* Basket list */
.basket-list {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius);
}
.basket-item {
  display: flex; align-items: center; gap: 12px; padding: 12px 16px;
  border-bottom: 1px solid #222;
}
.basket-item:last-child { border-bottom: none; }
.basket-item-info { flex: 1; min-width: 0; }
.basket-item-name {
  font-size: 14px; font-weight: 500; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis;
}
.basket-item-cat { font-size: 12px; color: var(--muted); margin-top: 1px; }
.basket-remove {
  flex-shrink: 0; width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; color: var(--muted);
  transition: color 0.15s, background 0.15s;
}
.basket-remove:hover { color: var(--red); background: rgba(248, 113, 113, 0.1); }

/* Basket summary */
.basket-summary {
  margin-top: 16px; padding: 16px; background: var(--surface);
  border-radius: var(--radius); border: 1px solid var(--border);
  display: flex; gap: 20px;
}
.basket-summary.hidden { display: none; }
.summary-block { flex: 1; }
.summary-label {
  font-size: 12px; color: var(--muted); text-transform: uppercase;
  letter-spacing: 0.5px; margin-bottom: 4px;
}
.summary-value { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
.summary-sub { font-size: 13px; margin-top: 4px; }

/* Result cards */
.result-cards {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 16px; margin-bottom: 8px;
}
.result-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 20px; text-align: center;
}
.result-card-label {
  font-size: 12px; color: var(--muted); text-transform: uppercase;
  letter-spacing: 0.5px; margin-bottom: 8px;
}
.result-card-value { font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
.result-card-sub { font-size: 13px; color: var(--muted); margin-top: 6px; }

/* Utility */
.color-red   { color: var(--red); }
.color-green { color: var(--accent); }

/* Chart */
.chart-wrapper {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 16px; margin-bottom: 8px;
}

/* Empty state */
.empty-state { text-align: center; padding: 32px 20px; color: var(--muted); font-size: 14px; }

/* Scrollbar */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }

/* Responsive */
@media (max-width: 768px) {
  .app-header { padding: 20px 16px 0; }
  .tab-nav { padding: 16px 16px 0; overflow-x: auto; }
  main { padding: 20px 16px 40px; }
  .step-columns { grid-template-columns: 1fr; }
  .result-cards { grid-template-columns: 1fr; }
}
'

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
    tags$style(HTML(CSS))
  ),

  # ── Header ──
  HTML('
    <header class="app-header">
      <div class="header-row">
        <div class="header-left">
          <h1 class="app-title">Observatorio de inflación</h1>
          <span class="badge">Beta</span>
        </div>
      </div>
      <p class="app-subtitle">Tu inflación real, no el promedio</p>
    </header>

    <nav class="tab-nav">
      <button class="tab-link active" data-tab="canasta"
              onclick="Shiny.setInputValue(\'active_tab\',\'canasta\')">
        Mi canasta
      </button>
      <button class="tab-link" data-tab="explorador"
              onclick="Shiny.setInputValue(\'active_tab\',\'explorador\')">
        Explorador
      </button>
      <button class="tab-link" data-tab="insights"
              onclick="Shiny.setInputValue(\'active_tab\',\'insights\')">
        Insights
      </button>
    </nav>
  '),

  # ── Main ──
  tags$main(
    conditionalPanel(
      "input.active_tab != 'explorador' && input.active_tab != 'insights'",
      uiOutput("step_content")
    ),
    conditionalPanel(
      "input.active_tab == 'explorador'",
      HTML('<div class="placeholder-pane"><p class="empty-state">Explorador — próximamente</p></div>')
    ),
    conditionalPanel(
      "input.active_tab == 'insights'",
      HTML('<div class="placeholder-pane"><p class="empty-state">Insights — próximamente</p></div>')
    )
  ),

  # ── JS bridge ──
  tags$script(HTML('
    $(document).on("shiny:connected", function() {

      // Tab highlight
      Shiny.addCustomMessageHandler("highlight_tab", function(tab) {
        $(".tab-link").removeClass("active");
        $(".tab-link[data-tab=\\"" + tab + "\\""]").addClass("active");
      });

      // Debounced search
      var searchTimer = null;
      $(document).on("input", "#search_term", function() {
        var val = $(this).val();
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function() {
          Shiny.setInputValue("search_term", val);
        }, 300);
      });

      // Restore search focus after re-render
      $(document).on("shiny:value", function(e) {
        if (e.name === "step_content") {
          setTimeout(function() {
            var el = document.getElementById("search_term");
            if (el) { el.focus(); el.selectionStart = el.selectionEnd = el.value.length; }
          }, 50);
        }
      });
    });
  '))
)

# ═══════════════════════════════════════════════════════════════════════════
# Server
# ═══════════════════════════════════════════════════════════════════════════

server <- function(input, output, session) {
  con <- dbConnect(RSQLite::SQLite(), DB_PATH)
  onSessionEnded(function() dbDisconnect(con))

  current_step <- reactiveVal(1)
  basket_eans <- reactiveVal(character())
  basket_info <- reactiveVal(list())

  # ── Tab highlight ──────────────────────────────────────────────────────
  observeEvent(input$active_tab,
    {
      session$sendCustomMessage("highlight_tab", input$active_tab)
    },
    ignoreNULL = TRUE
  )

  # ── Period ─────────────────────────────────────────────────────────────
  period <- reactive({
    input$period %||% "mensual"
  })

  # ── Cached dates (from R/queries.R) ────────────────────────────────────
  latest_fecha <- reactiveVal(NULL)

  observe({
    latest_fecha(q_latest_fecha(con))
  })

  cutoff_fecha <- reactive({
    req(latest_fecha())
    days <- PERIOD_DAYS[[period()]] %||% 30
    target <- as.character(as.Date(latest_fecha()) - days)
    q_cutoff_fecha(con, target)
  })

  # ── Load categories ────────────────────────────────────────────────────
  categories <- reactiveVal(
    data.frame(categoria = character(), n = integer())
  )

  observe({
    categories(q_categories(con))
  })

  # ── Search state ───────────────────────────────────────────────────────
  search_term_val <- reactiveVal("")
  search_cat_val <- reactiveVal("")

  observe({
    search_term_val(input$search_term %||% "")
  })
  observe({
    search_cat_val(input$search_category %||% "")
  })

  search_trigger <- reactive({
    list(period(), search_term_val(), search_cat_val())
  })

  # ── Search results (uses R/queries.R) ────────────────────────────────────
  search_results <- reactive({
    req(search_trigger(), latest_fecha())
    q_search_products(
      con, latest_fecha(), cutoff_fecha(),
      search_term_val() %||% "", search_cat_val() %||% ""
    )
  })

  # ── Basket variations (uses R/queries.R) ─────────────────────────────────
  basket_variations <- reactive({
    eans <- basket_eans()
    if (length(eans) == 0) return(data.frame())
    req(latest_fecha())
    q_basket_variations(con, eans, latest_fecha(), cutoff_fecha())
  })

  # ── Basket summary ─────────────────────────────────────────────────────
  basket_summary_data <- reactive({
    bv <- basket_variations()
    if (nrow(bv) == 0) {
      return(NULL)
    }
    vars <- na.omit(bv$variacion)
    if (length(vars) == 0) {
      return(NULL)
    }

    avg <- round(mean(vars), 1)
    ipc <- IPC[[period()]] %||% 0
    diff <- round(avg - ipc, 1)
    list(avg = avg, ipc = ipc, diff = diff)
  })

  # ── Add / remove products ──────────────────────────────────────────────
  observeEvent(input$add_product, {
    ean <- input$add_product
    if (is.null(ean) || !nzchar(ean)) {
      return()
    }
    if (ean %in% basket_eans()) {
      return()
    }

    row <- search_results()[search_results()$ean == ean, ]
    if (nrow(row) == 0) {
      row <- tryCatch(
        dbGetQuery(con,
          "SELECT ean, product_description, marca, categoria
           FROM canonical_products WHERE ean = ?",
          params = list(ean)
        ),
        error = function(e) data.frame()
      )
    }

    basket_eans(c(basket_eans(), ean))
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
    if (is.null(ean) || !nzchar(ean)) {
      return()
    }
    basket_eans(setdiff(basket_eans(), ean))
    info <- basket_info()
    info[[ean]] <- NULL
    basket_info(info)
  })

  # ── Step navigation ────────────────────────────────────────────────────
  observeEvent(input$go_to_step, {
    s <- as.integer(input$go_to_step)
    if (s %in% 1:3) current_step(s)
  })

  # ═════════════════════════════════════════════════════════════════════
  # Render step content
  # ═════════════════════════════════════════════════════════════════════

  output$step_content <- renderUI({
    switch(as.character(current_step()),
      "1" = step1_html(),
      "2" = step2_html(),
      "3" = step3_html()
    )
  })

  # ── Step 1 ─────────────────────────────────────────────────────────────

  step1_html <- reactive({
    sr <- search_results()
    eans <- basket_eans()
    info <- basket_info()
    cats <- categories()
    summary <- basket_summary_data()

    pd <- period()
    subt <- PERIOD_SUBTITLES[[pd]]

    # ── Category chips (collapsible) ──
    if (nrow(cats) > 0) {
      cats_sorted <- cats[order(-cats$n), ]
      active_cat <- search_cat_val()
      VISIBLE <- 8L
      n_total <- nrow(cats_sorted)
      has_more <- n_total > VISIBLE

      # Move active category into visible range
      if (nzchar(active_cat) && has_more) {
        idx <- which(cats_sorted$categoria == active_cat)
        if (length(idx) > 0 && idx > VISIBLE) {
          cats_sorted <- rbind(
            cats_sorted[seq_len(VISIBLE - 1), , drop = FALSE],
            cats_sorted[idx, , drop = FALSE],
            cats_sorted[setdiff(
              seq_len(n_total),
              c(seq_len(VISIBLE - 1), idx)
            ), , drop = FALSE]
          )
        }
      }

      chip_buttons <- paste0(vapply(seq_len(n_total), function(i) {
        cat <- cats_sorted$categoria[[i]]
        act <- if (active_cat == cat) " active" else ""
        sprintf(
          '<button class="chip%s" onclick="Shiny.setInputValue(\'search_category\',\'%s\')">%s</button>',
          act, gsub("'", "\\'", cat), cat
        )
      }, ""), collapse = "")

      todos_act <- if (!nzchar(active_cat)) " active" else ""

      if (has_more) {
        hidden_n <- n_total - VISIBLE
        chip_html <- sprintf(
          '
          <div id="category_chips" class="chip-group">
            <button class="chip%s" onclick="Shiny.setInputValue(\'search_category\',\'\')">Todos</button>
            <div class="chip-wrapper">%s</div>
            <button class="chip-more" data-hidden="%d"
              onclick="var w=this.parentElement.querySelector(\'.chip-wrapper\');if(w.classList.toggle(\'expanded\')){this.textContent=\'Ver menos\'}else{this.textContent=\'%s\'}">
              + %d más
            </button>
          </div>', todos_act, chip_buttons, hidden_n,
          paste0("+ ", hidden_n, " m\u00e1s"), hidden_n
        )
      } else {
        chip_html <- sprintf('
          <div id="category_chips" class="chip-group">
            <button class="chip%s" onclick="Shiny.setInputValue(\'search_category\',\'\')">Todos</button>
            <div class="chip-wrapper expanded">%s</div>
          </div>', todos_act, chip_buttons)
      }
    } else {
      chip_html <- ""
    }

    # ── Period buttons ──
    period_btns <- paste0(lapply(
      c("mensual", "trimestral", "interanual"),
      function(p) {
        act <- if (pd == p) " active" else ""
        sprintf(
          '<button class="period-btn%s" onclick="Shiny.setInputValue(\'period\',\'%s\')">%s</button>',
          act, p, PERIOD_LABELS[[p]]
        )
      }
    ), collapse = "")

    # ── Product rows ──
    if (nrow(sr) == 0) {
      product_rows <- '<li class="empty-state">No se encontraron productos.</li>'
    } else {
      product_rows <- paste0(lapply(seq_len(nrow(sr)), function(i) {
        p <- sr[i, ]
        in_b <- p$ean %in% eans
        ean_esc <- gsub("'", "\\'", p$ean)
        action_name <- if (in_b) "remove_product" else "add_product"
        btn_label <- if (in_b) "&#10003;" else "+"
        row_cls <- if (in_b) " product-row in-basket" else "product-row"

        pa <- p$precio_actual
        precio <- if (length(pa) > 0 && !is.na(pa) && pa > 0) {
          paste0("$", format(round(pa), big.mark = ".", decimal.mark = ",", scientific = FALSE))
        } else {
          "—"
        }

        sprintf(
          '
          <li class="%s" data-ean="%s">
            <div class="product-info">
              <div class="product-name">%s</div>
              <div class="product-meta">%s · %s</div>
            </div>
            <span class="product-price">%s</span>
            %s
            <button class="product-add"
              onclick="Shiny.setInputValue(\'%s\',\'%s\')">%s</button>
          </li>',
          row_cls, p$ean,
          p$product_description, p$marca %||% "", p$categoria %||% "",
          precio,
          variation_badge(p$variacion),
          action_name, ean_esc, btn_label
        )
      }), collapse = "")
    }

    # ── Basket preview (right column) ──
    if (length(eans) == 0) {
      basket_html <- '<ul class="basket-list"><li class="empty-state">Agregá productos desde la izquierda.</li></ul>'
      summary_html <- ""
    } else {
      basket_items <- paste0(lapply(eans, function(ean) {
        inf <- info[[ean]]
        bv <- basket_variations()
        vr <- if (nrow(bv) > 0) bv[bv$ean == ean, ] else data.frame()
        v <- if (nrow(vr) > 0) vr$variacion[1] else NULL
        ean_esc <- gsub("'", "\\'", ean)
        sprintf(
          '
          <li class="basket-item" data-ean="%s">
            <div class="basket-item-info">
              <div class="basket-item-name">%s</div>
              <div class="basket-item-cat">%s · %s</div>
            </div>
            %s
            <button class="basket-remove"
              onclick="Shiny.setInputValue(\'remove_product\',\'%s\')"
              aria-label="Quitar">&times;</button>
          </li>',
          ean, inf$name %||% ean, inf$brand %||% "", inf$category %||% "",
          variation_badge(v), ean_esc
        )
      }), collapse = "")

      basket_html <- sprintf('<ul class="basket-list">%s</ul>', basket_items)

      if (!is.null(summary)) {
        avg_sign <- if (summary$avg >= 0) "+" else ""
        avg_color <- if (summary$avg >= 0) "color-red" else "color-green"
        ipc_sign <- if (summary$ipc >= 0) "+" else ""
        diff_sign <- if (summary$diff >= 0) "+" else ""
        diff_color <- if (summary$diff > 0) {
          "color-red"
        } else if (summary$diff < 0) "color-green" else ""
        diff_label <- if (summary$diff > 0) {
          "por encima"
        } else if (summary$diff < 0) "por debajo" else ""
        summary_html <- sprintf(
          '
          <div class="basket-summary">
            <div class="summary-block">
              <div class="summary-label">Tu inflación (%s)</div>
              <div class="summary-value %s">%s%s%%</div>
            </div>
            <div class="summary-block">
              <div class="summary-label">IPC oficial</div>
              <div class="summary-value">%s%s%%</div>
              <div class="summary-sub %s">%s%s pp %s</div>
            </div>
          </div>', subt, avg_color, avg_sign, summary$avg,
          ipc_sign, summary$ipc, diff_color, diff_sign, summary$diff, diff_label
        )
      } else {
        summary_html <- ""
      }
    }

    n_eans <- length(eans)
    disabled <- if (n_eans == 0) " disabled" else ""
    btn_label <- paste0(
      "Revisar canasta",
      if (n_eans > 0) paste0(" (", n_eans, ")") else ""
    )

    HTML(sprintf(
      '
      <div class="step-columns">
        <div class="col-left">
          <h2 class="section-heading">ARMA TU CANASTA</h2>

          <div class="search-box">
            <svg class="search-icon" viewBox="0 0 24 24" width="16" height="16"
                 fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input id="search_term" type="text" placeholder="Buscar producto…"
                   value="%s" autocomplete="off">
          </div>

          %s

          <div class="period-toggle" id="period_toggle_1">%s</div>

          <ul class="product-list">%s</ul>
        </div>

        <div class="col-right">
          <h2 class="section-heading">TU CANASTA ACTUAL</h2>
          %s
          %s
          <button id="btn_review" class="btn btn-primary btn-full"
                  style="margin-top:16px" %s
                  onclick="Shiny.setInputValue(\'go_to_step\',2)">%s</button>
        </div>
      </div>',
      isolate(search_term_val()), chip_html, period_btns, product_rows,
      basket_html, summary_html, disabled, btn_label
    ))
  })

  # ── Step 2 ─────────────────────────────────────────────────────────────

  step2_html <- reactive({
    eans <- basket_eans()
    info <- basket_info()
    bv <- basket_variations()
    pd <- period()

    period_btns <- paste0(lapply(
      c("mensual", "trimestral", "interanual"),
      function(p) {
        act <- if (pd == p) " active" else ""
        sprintf(
          '<button class="period-btn%s" onclick="Shiny.setInputValue(\'period\',\'%s\')">%s</button>',
          act, p, PERIOD_LABELS[[p]]
        )
      }
    ), collapse = "")

    if (length(eans) == 0) {
      basket_html <- '<ul class="basket-list"><li class="empty-state">Tu canasta está vacía. Volvé al paso 1 para agregar productos.</li></ul>'
      btn_html <- ""
    } else {
      basket_items <- paste0(lapply(eans, function(ean) {
        inf <- info[[ean]]
        vr <- if (nrow(bv) > 0) bv[bv$ean == ean, ] else data.frame()
        v <- if (nrow(vr) > 0) vr$variacion[1] else NULL
        ean_esc <- gsub("'", "\\'", ean)
        sprintf(
          '
          <li class="basket-item" data-ean="%s">
            <div class="basket-item-info">
              <div class="basket-item-name">%s</div>
              <div class="basket-item-cat">%s · %s</div>
            </div>
            %s
            <button class="basket-remove"
              onclick="Shiny.setInputValue(\'remove_product\',\'%s\')"
              aria-label="Quitar">&times;</button>
          </li>',
          ean, inf$name %||% ean, inf$brand %||% "", inf$category %||% "",
          variation_badge(v), ean_esc
        )
      }), collapse = "")
      basket_html <- sprintf('<ul class="basket-list">%s</ul>', basket_items)
      btn_html <- '
        <div class="btn-group">
          <button id="btn_results" class="btn btn-primary btn-full"
            onclick="Shiny.setInputValue(\'go_to_step\',3)">Ver mi resultado</button>
        </div>'
    }

    HTML(sprintf('
      <div class="step-narrow">
        <div class="step-top-bar">
          <button class="btn btn-ghost"
            onclick="Shiny.setInputValue(\'go_to_step\',1)">&larr; Volver</button>
        </div>
        <h2 class="section-heading">REVISAR TU CANASTA</h2>
        <div class="period-toggle" id="period_toggle_2">%s</div>
        %s
        %s
      </div>', period_btns, basket_html, btn_html))
  })

  # ── Step 3 ─────────────────────────────────────────────────────────────

  step3_data <- reactive({
    eans <- basket_eans()
    if (length(eans) == 0) return(NULL)
    req(latest_fecha())

    pd <- period()
    product_data <- q_basket_variations(con, eans, latest_fecha(), cutoff_fecha()) %>%
      arrange(desc(variacion))
    cadena_data <- q_cadena_prices(con, eans, latest_fecha())

    pi <- if (nrow(product_data) > 0) round(mean(product_data$variacion, na.rm = TRUE), 1) else 0
    ipc <- IPC[[pd]] %||% 0
    diff <- round(pi - ipc, 1)

    list(
      personal_inflation = pi, ipc = ipc, diff_pp = diff,
      period_label = PERIOD_SUBTITLES[[pd]],
      products = product_data, cadenas = cadena_data
    )
  })

  step3_html <- reactive({
    data <- step3_data()

    if (is.null(data) || nrow(data$products) == 0) {
      return(HTML('
        <div class="step-narrow">
          <div class="step-top-bar">
            <button class="btn btn-ghost"
              onclick="Shiny.setInputValue(\'go_to_step\',2)">&larr; Editar canasta</button>
          </div>
          <h2 class="section-heading">TU RESULTADO</h2>
          <div class="result-cards">
            <div class="result-card">
              <div class="result-card-label">Sin datos</div>
              <div class="result-card-sub">Agregá productos a tu canasta para ver tu inflación personal.</div>
            </div>
          </div>
        </div>'))
    }

    pi_sign <- if (data$personal_inflation >= 0) "+" else ""
    pi_color <- if (data$personal_inflation > data$ipc) "color-red" else "color-green"
    ipc_sign <- if (data$ipc >= 0) "+" else ""
    diff_sign <- if (data$diff_pp >= 0) "+" else ""
    diff_color <- if (data$diff_pp > 0) {
      "color-red"
    } else if (data$diff_pp < 0) "color-green" else ""
    diff_label <- if (data$diff_pp > 0) {
      "Por encima del IPC"
    } else if (data$diff_pp < 0) "Por debajo del IPC" else "Igual al IPC"

    product_rows <- paste0(lapply(seq_len(nrow(data$products)), function(i) {
      p <- data$products[i, ]
      sprintf(
        '
        <li class="basket-item">
          <div class="basket-item-info">
            <div class="basket-item-name">%s</div>
            <div class="basket-item-cat">%s · %s</div>
          </div>
          %s
        </li>',
        p$product_description, p$marca %||% "", p$categoria %||% "",
        variation_badge(p$variacion)
      )
    }), collapse = "")

    HTML(sprintf(
      '
      <div class="step-narrow">
        <div class="step-top-bar">
          <button class="btn btn-ghost"
            onclick="Shiny.setInputValue(\'go_to_step\',2)">&larr; Editar canasta</button>
        </div>
        <h2 class="section-heading">TU RESULTADO</h2>

        <div class="result-cards">
          <div class="result-card">
            <div class="result-card-label">Tu inflación (%s)</div>
            <div class="result-card-value %s">%s%s%%</div>
          </div>
          <div class="result-card">
            <div class="result-card-label">IPC oficial</div>
            <div class="result-card-value">%s%s%%</div>
          </div>
          <div class="result-card">
            <div class="result-card-label">Diferencia</div>
            <div class="result-card-value %s">%s%s pp</div>
            <div class="result-card-sub">%s</div>
          </div>
        </div>

        <h3 class="section-subheading">VARIACIÓN POR PRODUCTO</h3>
        <ul class="basket-list">%s</ul>

        <h3 class="section-subheading">PRECIO PROMEDIO POR CADENA</h3>
        <div class="chart-wrapper">%s</div>

        <div class="btn-group">
          <button class="btn btn-secondary"
            onclick="Shiny.setInputValue(\'go_to_step\',2)">Editar canasta</button>
        </div>
      </div>',
      data$period_label, pi_color, pi_sign, data$personal_inflation,
      ipc_sign, data$ipc,
      diff_color, diff_sign, data$diff_pp, diff_label,
      product_rows,
      as.character(plotOutput("cadena_chart", height = "350px"))
    ))
  })

  # ── Cadena chart ───────────────────────────────────────────────────────

  output$cadena_chart <- renderPlot(
    {
      data <- step3_data()
      req(data, nrow(data$cadenas) > 0)

      df <- data$cadenas
      df$cadena <- factor(df$cadena, levels = rev(df$cadena))

      ggplot(df, aes(x = cadena, y = precio_promedio)) +
        geom_col(fill = "#4ade80", width = 0.55) +
        geom_text(
          aes(label = paste0(
            "$",
            format(round(precio_promedio), big.mark = ".", decimal.mark = ",", scientific = FALSE)
          )),
          hjust = -0.15, color = "#e5e5e5", size = 4.5
        ) +
        coord_flip() +
        scale_y_continuous(expand = expansion(mult = c(0, 0.35))) +
        labs(x = NULL, y = NULL) +
        theme_void() +
        theme(
          plot.background = element_rect(fill = "#1a1a1a", color = NA),
          panel.background = element_rect(fill = "#1a1a1a", color = NA),
          axis.text.y = element_text(
            color = "#e5e5e5", size = 13,
            hjust = 1, margin = margin(r = 12)
          ),
          plot.margin = margin(12, 24, 12, 12)
        )
    },
    bg = "#1a1a1a"
  )

  outputOptions(output, "cadena_chart", suspendWhenHidden = FALSE)

  # ── Input observers ────────────────────────────────────────────────────
  observeEvent(input$search_term,
    {
      search_term_val(input$search_term)
    },
    ignoreNULL = FALSE
  )

  observeEvent(input$search_category,
    {
      search_cat_val(input$search_category)
    },
    ignoreNULL = FALSE
  )
}

# ═══════════════════════════════════════════════════════════════════════════

shinyApp(ui = ui, server = server)
