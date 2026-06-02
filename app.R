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

STEP_NAMES <- c("Agregar productos", "Revisar canasta", "Tu resultado")

# ═══════════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════════

span <- function(class, text) {
  sprintf('<span class="%s">%s</span>', class, text)
}

variation_badge <- function(v) {
  if (is.null(v) || is.na(v)) return(span("var-badge var-flat", "—"))
  cls <- if (v > 0) "var-up" else if (v < 0) "var-down" else "var-flat"
  sign <- if (v > 0) "+" else ""
  span(paste("var-badge", cls), paste0(sign, v, "%"))
}

format_price <- function(x) {
  if (is.null(x) || is.na(x) || x <= 0) return("—")
  paste0("$", format(round(x), big.mark = ".", decimal.mark = ",", scientific = FALSE))
}

search_icon_svg <- '<svg class="search-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'

stepper_html <- function(active) {
  steps <- vapply(1:3, function(i) {
    if (i < active) {
      cls_num <- "done"
      cls_txt <- "done"
    } else if (i == active) {
      cls_num <- "active"
      cls_txt <- "active"
    } else {
      cls_num <- "upcoming"
      cls_txt <- "upcoming"
    }
    onclick <- if (i <= active) {
      sprintf("Shiny.setInputValue('go_to_step',%d)", i)
    } else ""
    sprintf(
      '<div class="stepper-step"><button class="stepper-num %s" onclick="%s">%d</button><span class="stepper-text %s">%s</span></div>',
      cls_num, onclick, i, cls_txt, STEP_NAMES[i]
    )
  }, "")

  lines <- vapply(1:2, function(i) {
    cls <- if (i < active) " done" else ""
    sprintf('<div class="stepper-line%s"></div>', cls)
  }, "")

  paste0('<div class="stepper">', steps[1], lines[1], steps[2], lines[2], steps[3], '</div>')
}

period_buttons <- function(pd, input_name = "period") {
  paste0(lapply(c("mensual", "trimestral", "interanual"), function(p) {
    act <- if (pd == p) " active" else ""
    sprintf(
      '<button class="period-btn%s" onclick="Shiny.setInputValue(\'%s\',\'%s\')">%s</button>',
      act, input_name, p, PERIOD_LABELS[[p]]
    )
  }), collapse = "")
}

chip_html_builder <- function(cats, active_cat, input_name = "search_category") {
  if (nrow(cats) == 0) return("")

  cats_sorted <- cats[order(-cats$n), ]
  VISIBLE <- 8L
  n_total <- nrow(cats_sorted)
  has_more <- n_total > VISIBLE

  if (nzchar(active_cat) && has_more) {
    idx <- which(cats_sorted$categoria == active_cat)
    if (length(idx) > 0 && idx > VISIBLE) {
      cats_sorted <- rbind(
        cats_sorted[seq_len(VISIBLE - 1), , drop = FALSE],
        cats_sorted[idx, , drop = FALSE],
        cats_sorted[setdiff(seq_len(n_total), c(seq_len(VISIBLE - 1), idx)), , drop = FALSE]
      )
    }
  }

  chip_buttons <- paste0(vapply(seq_len(n_total), function(i) {
    cat <- cats_sorted$categoria[[i]]
    act <- if (active_cat == cat) " active" else ""
    sprintf(
      '<button class="chip%s" onclick="Shiny.setInputValue(\'%s\',\'%s\')">%s</button>',
      act, input_name, gsub("'", "\\'", cat), cat
    )
  }, ""), collapse = "")

  todos_act <- if (!nzchar(active_cat)) " active" else ""

  if (has_more) {
    hidden_n <- n_total - VISIBLE
    sprintf(
      '<div class="chip-group">
        <button class="chip%s" onclick="Shiny.setInputValue(\'%s\',\'\')">Todos</button>
        <div class="chip-wrapper">%s</div>
        <button class="chip-more" onclick="var w=this.parentElement.querySelector(\'.chip-wrapper\');if(w.classList.toggle(\'expanded\')){this.textContent=\'Ver menos\'}else{this.textContent=\'+ %d m\\u00e1s\'}">+ %d más</button>
      </div>',
      todos_act, input_name, chip_buttons, hidden_n, hidden_n
    )
  } else {
    sprintf(
      '<div class="chip-group">
        <button class="chip%s" onclick="Shiny.setInputValue(\'%s\',\'\')">Todos</button>
        <div class="chip-wrapper expanded">%s</div>
      </div>',
      todos_act, input_name, chip_buttons
    )
  }
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
    tags$link(rel = "stylesheet", href = "styles.css")
  ),

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
              onclick="Shiny.setInputValue(\'active_tab\',\'canasta\')">Mi canasta</button>
      <button class="tab-link" data-tab="explorador"
              onclick="Shiny.setInputValue(\'active_tab\',\'explorador\')">Explorador</button>
      <button class="tab-link" data-tab="insights"
              onclick="Shiny.setInputValue(\'active_tab\',\'insights\')">Insights</button>
    </nav>
  '),

  tags$main(
    conditionalPanel(
      "input.active_tab != 'explorador' && input.active_tab != 'insights'",
      uiOutput("step_content")
    ),
    conditionalPanel(
      "input.active_tab == 'explorador'",
      uiOutput("explorador_content")
    ),
    conditionalPanel(
      "input.active_tab == 'insights'",
      uiOutput("insights_content")
    )
  ),

  tags$script(HTML('
    $(document).on("shiny:connected", function() {

      Shiny.addCustomMessageHandler("highlight_tab", function(tab) {
        $(".tab-link").removeClass("active");
        $(".tab-link[data-tab=\\"" + tab + "\\""]").addClass("active");
      });

      var searchTimer = null;
      $(document).on("input", "#search_term", function() {
        var val = $(this).val();
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function() {
          Shiny.setInputValue("search_term", val);
        }, 300);
      });

      var expSearchTimer = null;
      $(document).on("input", "#exp_search_term", function() {
        var val = $(this).val();
        clearTimeout(expSearchTimer);
        expSearchTimer = setTimeout(function() {
          Shiny.setInputValue("exp_search_term", val);
        }, 300);
      });

      $(document).on("shiny:value", function(e) {
        if (e.name === "step_content") {
          setTimeout(function() {
            var el = document.getElementById("search_term");
            if (el) { el.focus(); el.selectionStart = el.selectionEnd = el.value.length; }
          }, 50);
        }
        if (e.name === "explorador_content") {
          setTimeout(function() {
            var el = document.getElementById("exp_search_term");
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

  current_step   <- reactiveVal(1)
  basket_eans    <- reactiveVal(character())
  basket_info    <- reactiveVal(list())

  observeEvent(input$active_tab, {
    session$sendCustomMessage("highlight_tab", input$active_tab)
  }, ignoreNULL = TRUE)

  period <- reactive(input$period %||% "mensual")

  latest_fecha <- reactiveVal(NULL)
  observe({ latest_fecha(q_latest_fecha(con)) })

  cutoff_fecha <- reactive({
    lf <- latest_fecha()
    if (is.null(lf)) return(NULL)
    days <- PERIOD_DAYS[[period()]] %||% 30
    target <- as.character(as.Date(lf) - days)
    q_cutoff_fecha(con, target)
  })

  categories <- reactiveVal(data.frame(categoria = character(), n = integer()))
  observe({ categories(q_categories(con)) })

  search_term_val <- reactiveVal("")
  search_cat_val  <- reactiveVal("")

  observeEvent(input$search_term, { search_term_val(input$search_term %||% "") }, ignoreNULL = FALSE)
  observeEvent(input$search_category, { search_cat_val(input$search_category %||% "") }, ignoreNULL = FALSE)

  search_results <- reactive({
    lf <- latest_fecha()
    if (is.null(lf)) return(data.frame(ean = character(), product_description = character(), marca = character(), categoria = character(), precio_actual = numeric(), variacion = numeric()))
    q_search_products(
      con, lf, cutoff_fecha(),
      search_term_val() %||% "", search_cat_val() %||% ""
    )
  })

  basket_variations <- reactive({
    eans <- basket_eans()
    lf <- latest_fecha()
    if (length(eans) == 0 || is.null(lf)) return(data.frame())
    q_basket_variations(con, eans, lf, cutoff_fecha())
  })

  basket_summary_data <- reactive({
    bv <- basket_variations()
    if (nrow(bv) == 0) return(NULL)
    vars <- na.omit(bv$variacion)
    if (length(vars) == 0) return(NULL)
    avg <- round(mean(vars), 1)
    ipc <- IPC[[period()]] %||% 0
    diff <- round(avg - ipc, 1)
    list(avg = avg, ipc = ipc, diff = diff)
  })

  observeEvent(input$add_product, {
    ean <- input$add_product
    if (is.null(ean) || !nzchar(ean) || ean %in% basket_eans()) return()
    row <- search_results()[search_results()$ean == ean, ]
    if (nrow(row) == 0) {
      row <- tryCatch(
        dbGetQuery(con, "SELECT ean, product_description, marca, categoria FROM canonical_products WHERE ean = ?", params = list(ean)),
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
    if (is.null(ean) || !nzchar(ean)) return()
    basket_eans(setdiff(basket_eans(), ean))
    info <- basket_info()
    info[[ean]] <- NULL
    basket_info(info)
  })

  observeEvent(input$go_to_step, {
    s <- as.integer(input$go_to_step)
    if (s %in% 1:3) current_step(s)
  })

  # ═════════════════════════════════════════════════════════════════════
  # MI CANASTA
  # ═════════════════════════════════════════════════════════════════════

  output$step_content <- renderUI({
    message(">>> renderUI step_content firing, step=", current_step())
    result <- tryCatch(
      switch(as.character(current_step()),
        "1" = step1_html(),
        "2" = step2_html(),
        "3" = step3_html()
      ),
      error = function(e) {
        message("step_content error: ", e$message)
        HTML(paste0('<div class="empty-state">Error: ', htmltools::htmlEscape(e$message), '</div>'))
      }
    )
    message(">>> renderUI result class: ", class(result), " null=", is.null(result), " len=", nchar(as.character(result)))
    if (is.null(result)) return(HTML('<div class="empty-state">Cargando…</div>'))
    result
  })

  step1_html <- reactive({
    sr   <- search_results()
    eans <- basket_eans()
    cats <- categories()
    pd   <- period()
    message(">>> step1: sr rows=", nrow(sr), " eans=", length(eans), " cats rows=", nrow(cats), " pd=", pd)

    chip_html <- chip_html_builder(cats, search_cat_val() %||% "", "search_category")
    period_btns <- period_buttons(pd)

    if (nrow(sr) == 0) {
      product_rows <- '<li class="empty-state">No se encontraron productos.</li>'
    } else {
      product_rows <- paste0(lapply(seq_len(nrow(sr)), function(i) {
        p <- sr[i, ]
        in_b <- p$ean %in% eans
        ean_esc <- gsub("'", "\\'", p$ean)
        action_name <- if (in_b) "remove_product" else "add_product"
        btn_label <- if (in_b) "✓ Agregado" else "+ Agregar"
        row_cls <- if (in_b) "product-row in-basket" else "product-row"
        sprintf(
          '<li class="%s">
            <div class="product-info">
              <div class="product-name">%s</div>
              <div class="product-meta">%s · %s</div>
            </div>
            %s
            <button class="product-add-btn" onclick="Shiny.setInputValue(\'%s\',\'%s\')">%s</button>
          </li>',
          row_cls, p$product_description,
          p$marca %||% "", format_price(p$precio_actual),
          variation_badge(p$variacion),
          action_name, ean_esc, btn_label
        )
      }), collapse = "")
    }

    n_eans <- length(eans)
    disabled <- if (n_eans == 0) " disabled" else ""

    s1 <- stepper_html(1)
    s2 <- search_icon_svg
    s3 <- isolate(search_term_val())
    s4 <- period_btns
    s5 <- chip_html
    s6 <- product_rows
    s7 <- n_eans
    s8 <- if (n_eans != 1) "s" else ""
    s9 <- if (n_eans != 1) "s" else ""
    s10 <- disabled
    message(">>> args: ", paste(sapply(list(s1,s2,s3,s4,s5,s6,s7,s8,s9,s10), function(x) paste0("len=",length(x),"/nch=",nchar(x)[1])), collapse=" | "))
    html_str <- tryCatch(
      sprintf(
        '<div class="step-wide">
        %s

        <div class="search-row">
          <div class="search-box">
            %s
            <input id="search_term" type="text" placeholder="Buscar por nombre, marca o categoría…" value="%s" autocomplete="off">
          </div>
          <div class="period-area">
            <div class="period-label">Variación a mostrar</div>
            <div class="period-toggle">%s</div>
          </div>
        </div>

        %s

        <ul class="product-list">%s</ul>

        <div class="selection-bar">
          <span class="selection-count">%d producto%s seleccionado%s</span>
          <button class="btn btn-primary"%s onclick="Shiny.setInputValue(\'go_to_step\',2)">Revisar canasta</button>
        </div>
      </div>',
        s1, s2, s3, s4, s5, s6, s7, s8, s9, s10
      ),
      error = function(e) {
        message(">>> sprintf ERROR: ", e$message)
        paste0('<div class="empty-state">sprintf error: ', e$message, '</div>')
      }
    )
    message(">>> html_str len=", nchar(html_str), " class=", paste(class(html_str), collapse=","))
    HTML(html_str)
  })

  step2_html <- reactive({
    eans <- basket_eans()
    info <- basket_info()
    bv   <- basket_variations()
    pd   <- period()
    summary <- basket_summary_data()

    period_btns <- period_buttons(pd)

    if (length(eans) == 0) {
      basket_html <- '<div class="empty-state">Tu canasta está vacía. Volvé al paso 1 para agregar productos.</div>'
      summary_html <- ""
    } else {
      basket_items <- paste0(lapply(eans, function(ean) {
        inf <- info[[ean]]
        vr <- if (nrow(bv) > 0) bv[bv$ean == ean, ] else data.frame()
        v <- if (nrow(vr) > 0) vr$variacion[1] else NULL
        ean_esc <- gsub("'", "\\'", ean)
        sprintf(
          '<li class="basket-item">
            <div class="basket-item-info">
              <div class="basket-item-name">%s</div>
              <div class="basket-item-cat">%s</div>
            </div>
            %s
            <button class="basket-remove" onclick="Shiny.setInputValue(\'remove_product\',\'%s\')" aria-label="Quitar">&times;</button>
          </li>',
          inf$name %||% ean, inf$category %||% "",
          variation_badge(v), ean_esc
        )
      }), collapse = "")
      basket_html <- sprintf('<ul class="basket-list">%s</ul>', basket_items)

      subt <- PERIOD_SUBTITLES[[pd]]
      if (!is.null(summary)) {
        avg_sign <- if (summary$avg >= 0) "+" else ""
        avg_color <- if (summary$avg >= 0) "color-red" else "color-green"
        ipc_sign <- if (summary$ipc >= 0) "+" else ""
        diff_sign <- if (summary$diff >= 0) "+" else ""
        diff_color <- if (summary$diff > 0) "color-red" else if (summary$diff < 0) "color-green" else ""
        diff_label <- if (summary$diff > 0) "por encima" else if (summary$diff < 0) "por debajo" else ""
        summary_html <- sprintf(
          '<div class="basket-summary">
            <div>
              <div class="summary-label">Tu inflación (%s)</div>
              <div class="summary-value %s">%s%s%%</div>
            </div>
            <div>
              <div class="summary-label">IPC oficial</div>
              <div class="summary-value">%s%s%%</div>
              <div class="summary-sub %s">%s%s pp %s</div>
            </div>
          </div>',
          subt, avg_color, avg_sign, summary$avg,
          ipc_sign, summary$ipc, diff_color, diff_sign, summary$diff, diff_label
        )
      } else {
        summary_html <- ""
      }
    }

    btn_html <- if (length(eans) > 0) {
      '<div class="btn-group">
        <button class="btn btn-secondary" onclick="Shiny.setInputValue(\'go_to_step\',1)">&larr; Agregar más</button>
        <button class="btn btn-primary btn-full" onclick="Shiny.setInputValue(\'go_to_step\',3)">Ver mi resultado</button>
      </div>'
    } else ""

    HTML(sprintf(
      '<div class="step-narrow">
        %s
        <h2 class="section-heading">Revisar tu canasta</h2>
        <div class="period-toggle" style="margin-bottom:20px">%s</div>
        %s
        %s
        %s
      </div>',
      stepper_html(2), period_btns, basket_html, summary_html, btn_html
    ))
  })

  step3_data <- reactive({
    eans <- basket_eans()
    lf <- latest_fecha()
    if (length(eans) == 0 || is.null(lf)) return(NULL)
    pd <- period()
    product_data <- q_basket_variations(con, eans, lf, cutoff_fecha()) %>% arrange(desc(variacion))
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
      return(HTML(sprintf(
        '<div class="step-narrow">
          %s
          <h2 class="section-heading">Tu resultado</h2>
          <div class="empty-state">Agregá productos a tu canasta para ver tu inflación personal.</div>
          <div class="btn-group"><button class="btn btn-secondary" onclick="Shiny.setInputValue(\'go_to_step\',1)">&larr; Agregar productos</button></div>
        </div>', stepper_html(3))))
    }

    pi_sign <- if (data$personal_inflation >= 0) "+" else ""
    pi_color <- if (data$personal_inflation > data$ipc) "color-red" else "color-green"
    ipc_sign <- if (data$ipc >= 0) "+" else ""
    diff_sign <- if (data$diff_pp >= 0) "+" else ""
    diff_color <- if (data$diff_pp > 0) "color-red" else if (data$diff_pp < 0) "color-green" else ""
    diff_label <- if (data$diff_pp > 0) "Por encima del IPC" else if (data$diff_pp < 0) "Por debajo del IPC" else "Igual al IPC"

    product_rows <- paste0(lapply(seq_len(nrow(data$products)), function(i) {
      p <- data$products[i, ]
      sprintf(
        '<li class="basket-item">
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
      '<div class="step-narrow">
        %s
        <h2 class="section-heading">Tu resultado</h2>

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

        <h3 class="section-subheading">Variación por producto</h3>
        <ul class="basket-list">%s</ul>

        <h3 class="section-subheading">Precio promedio por cadena</h3>
        <div class="chart-wrapper">%s</div>

        <div class="btn-group">
          <button class="btn btn-secondary" onclick="Shiny.setInputValue(\'go_to_step\',2)">Editar canasta</button>
        </div>
      </div>',
      stepper_html(3),
      data$period_label, pi_color, pi_sign, data$personal_inflation,
      ipc_sign, data$ipc,
      diff_color, diff_sign, data$diff_pp, diff_label,
      product_rows,
      as.character(plotOutput("cadena_chart", height = "350px"))
    ))
  })

  output$cadena_chart <- renderPlot({
    data <- step3_data()
    req(data, nrow(data$cadenas) > 0)
    df <- data$cadenas
    df$cadena <- factor(df$cadena, levels = rev(df$cadena))
    ggplot(df, aes(x = cadena, y = precio_promedio)) +
      geom_col(fill = "#c9a87c", width = 0.55) +
      geom_text(
        aes(label = paste0("$", format(round(precio_promedio), big.mark = ".", decimal.mark = ",", scientific = FALSE))),
        hjust = -0.15, color = "#e5e5e5", size = 4.5
      ) +
      coord_flip() +
      scale_y_continuous(expand = expansion(mult = c(0, 0.35))) +
      labs(x = NULL, y = NULL) +
      theme_void() +
      theme(
        plot.background  = element_rect(fill = "#161616", color = NA),
        panel.background = element_rect(fill = "#161616", color = NA),
        axis.text.y = element_text(color = "#e5e5e5", size = 13, hjust = 1, margin = margin(r = 12)),
        plot.margin = margin(12, 24, 12, 12)
      )
  }, bg = "#161616")

  outputOptions(output, "cadena_chart", suspendWhenHidden = FALSE)

  # ═════════════════════════════════════════════════════════════════════
  # EXPLORADOR
  # ═════════════════════════════════════════════════════════════════════

  exp_search_term_val <- reactiveVal("")
  exp_search_cat_val  <- reactiveVal("")
  exp_selected_ean    <- reactiveVal(NULL)

  observeEvent(input$exp_search_term, { exp_search_term_val(input$exp_search_term %||% "") }, ignoreNULL = FALSE)
  observeEvent(input$exp_search_cat, { exp_search_cat_val(input$exp_search_cat %||% "") }, ignoreNULL = FALSE)
  observeEvent(input$exp_select, { exp_selected_ean(input$exp_select) }, ignoreNULL = FALSE)

  exp_search_results <- reactive({
    lf <- latest_fecha()
    if (is.null(lf)) return(data.frame(ean = character(), product_description = character(), marca = character(), categoria = character(), precio_actual = numeric(), variacion = numeric()))
    q_search_products(
      con, lf, cutoff_fecha(),
      exp_search_term_val() %||% "", exp_search_cat_val() %||% ""
    )
  })

  exp_product_detail <- reactive({
    ean <- exp_selected_ean()
    lf <- latest_fecha()
    if (is.null(ean) || !nzchar(ean) || is.null(lf)) return(NULL)

    sr <- exp_search_results()
    row <- sr[sr$ean == ean, ]
    if (nrow(row) == 0) return(NULL)

    chain_prices <- q_product_chain_prices(con, ean, latest_fecha())

    list(
      name = row$product_description[1],
      brand = row$marca[1] %||% "",
      category = row$categoria[1] %||% "",
      variacion = row$variacion[1],
      chains = chain_prices
    )
  })

  output$explorador_content <- renderUI({
    sr   <- exp_search_results()
    cats <- categories()
    sel  <- exp_selected_ean()

    chip_html <- chip_html_builder(cats, exp_search_cat_val() %||% "", "exp_search_cat")

    n_results <- nrow(sr)
    if (n_results == 0) {
      result_rows <- '<div class="empty-state">No se encontraron productos.</div>'
    } else {
      result_rows <- paste0(lapply(seq_len(n_results), function(i) {
        p <- sr[i, ]
        ean_esc <- gsub("'", "\\'", p$ean)
        selected_cls <- if (!is.null(sel) && sel == p$ean) " selected" else ""
        sprintf(
          '<li class="product-row clickable%s" onclick="Shiny.setInputValue(\'exp_select\',\'%s\')">
            <div class="product-info">
              <div class="product-name">%s</div>
              <div class="product-meta">%s · %s</div>
            </div>
            %s
          </li>',
          selected_cls, ean_esc,
          p$product_description, p$marca %||% "", p$categoria %||% "",
          variation_badge(p$variacion)
        )
      }), collapse = "")
    }

    detail <- exp_product_detail()
    if (is.null(detail)) {
      detail_html <- '<div class="detail-card"><div class="detail-empty">Seleccioná un producto para ver su detalle</div></div>'
    } else {
      if (nrow(detail$chains) > 0) {
        chain_cells <- paste0(lapply(seq_len(nrow(detail$chains)), function(i) {
          ch <- detail$chains[i, ]
          sprintf(
            '<div class="price-cell"><div class="price-cell-cadena">%s</div><div class="price-cell-value">%s</div></div>',
            ch$cadena, format_price(ch$precio)
          )
        }), collapse = "")
        chain_html <- sprintf('<div class="price-grid">%s</div>', chain_cells)
      } else {
        chain_html <- '<div class="detail-empty">Sin datos de cadenas</div>'
      }

      ean_esc <- gsub("'", "\\'", sel %||% "")
      in_basket <- (!is.null(sel) && sel %in% basket_eans())
      add_label <- if (in_basket) "✓ En tu canasta" else "+ Agregar a canasta"
      add_action <- if (in_basket) "" else sprintf("Shiny.setInputValue('add_product','%s')", ean_esc)

      detail_html <- sprintf(
        '<div class="detail-card">
          <div class="detail-header">
            <div class="detail-name">%s</div>
            <div class="detail-meta">%s · %s</div>
          </div>
          <div class="detail-chart-placeholder">Serie de precios (próximamente)</div>
          %s
          <div class="detail-action">
            <button class="detail-action-btn" onclick="%s">%s</button>
          </div>
        </div>',
        detail$name, detail$brand, detail$category,
        chain_html, add_action, add_label
      )
    }

    HTML(sprintf(
      '<div class="exp-layout">
        <div class="search-box">
          %s
          <input id="exp_search_term" type="text" placeholder="Buscar producto, marca o categoría…" value="%s" autocomplete="off">
        </div>
        %s
        <div class="exp-columns">
          <div>
            <h3 class="section-heading">Resultados (%d productos)</h3>
            <ul class="product-list">%s</ul>
          </div>
          <div class="exp-detail">
            <h3 class="section-heading">Detalle del producto</h3>
            %s
          </div>
        </div>
      </div>',
      search_icon_svg, isolate(exp_search_term_val()),
      chip_html,
      n_results, result_rows,
      detail_html
    ))
  })

  # ═════════════════════════════════════════════════════════════════════
  # INSIGHTS
  # ═════════════════════════════════════════════════════════════════════

  output$insights_content <- renderUI({
    eans <- basket_eans()

    if (length(eans) == 0) {
      return(HTML(
        '<div class="insights-layout">
          <div class="empty-state">Agregá productos a tu canasta para ver insights personalizados.</div>
        </div>'
      ))
    }

    if (is.null(latest_fecha())) return(HTML('<div class="insights-layout"><div class="empty-state">Cargando datos…</div></div>'))
    bv <- basket_variations()
    if (nrow(bv) == 0) {
      return(HTML('<div class="insights-layout"><div class="empty-state">Sin datos disponibles.</div></div>'))
    }

    pd  <- period()
    ipc <- IPC[[pd]] %||% 0
    subt <- PERIOD_SUBTITLES[[pd]]

    vars <- na.omit(bv$variacion)
    avg_inflation <- if (length(vars) > 0) round(mean(vars), 1) else 0
    diff_pp <- round(avg_inflation - ipc, 1)

    cadenas <- q_cadena_prices(con, eans, latest_fecha())
    most_expensive <- if (nrow(cadenas) > 0) cadenas$cadena[1] else "—"

    top_product <- bv[which.max(bv$variacion), ]
    top_alert <- if (nrow(top_product) > 0 && !is.na(top_product$variacion[1])) {
      paste0(top_product$product_description[1], " +", top_product$variacion[1], "%")
    } else "—"

    diff_sign <- if (diff_pp >= 0) "+" else ""
    diff_color <- if (diff_pp > 0) "red" else if (diff_pp < 0) "green" else ""

    kpi_html <- sprintf(
      '<div class="kpi-cards">
        <div class="kpi-card">
          <div class="kpi-label">Tu inflación vs IPC</div>
          <div class="kpi-value %s">%s%s pp</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Cadena más cara</div>
          <div class="kpi-value">%s</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Mayor alerta activa</div>
          <div class="kpi-value red">%s</div>
        </div>
      </div>',
      diff_color, diff_sign, diff_pp, most_expensive, top_alert
    )

    bv_sorted <- bv[order(-bv$variacion), ]
    alerts <- bv_sorted[!is.na(bv_sorted$variacion) & bv_sorted$variacion > 0, ]
    if (nrow(alerts) > 5) alerts <- alerts[1:5, ]

    if (nrow(alerts) > 0) {
      alerts_html <- paste0(lapply(seq_len(nrow(alerts)), function(i) {
        a <- alerts[i, ]
        sprintf(
          '<div class="alert-row">
            <div class="alert-info">
              <div class="alert-name">%s</div>
              <div class="alert-detail">Subió %s%% en %s</div>
            </div>
            %s
          </div>',
          a$product_description, a$variacion, subt, variation_badge(a$variacion)
        )
      }), collapse = "")
    } else {
      alerts_html <- '<div class="empty-state">Sin alertas activas</div>'
    }

    above_ipc <- bv_sorted[!is.na(bv_sorted$variacion) & bv_sorted$variacion > ipc, ]
    if (nrow(above_ipc) > 5) above_ipc <- above_ipc[1:5, ]

    if (nrow(above_ipc) > 0) {
      vs_ipc_html <- paste0(lapply(seq_len(nrow(above_ipc)), function(i) {
        p <- above_ipc[i, ]
        pp_diff <- round(p$variacion - ipc, 1)
        sprintf(
          '<div class="vs-ipc-row">
            <div class="vs-ipc-info">
              <div class="vs-ipc-name">%s</div>
              <div class="vs-ipc-detail">IPC alimentos: %s%% · Producto: %s%%</div>
            </div>
            <span class="pp-badge">+%s pp</span>
          </div>',
          p$product_description, ipc, p$variacion, pp_diff
        )
      }), collapse = "")
    } else {
      vs_ipc_html <- '<div class="empty-state">Ningún producto supera el IPC</div>'
    }

    if (nrow(cadenas) > 0) {
      chain_rows <- paste0(lapply(seq_len(nrow(cadenas)), function(i) {
        ch <- cadenas[i, ]
        tag <- if (i == 1) {
          '<span class="chain-rank-tag expensive">más caro</span>'
        } else if (i == nrow(cadenas)) {
          '<span class="chain-rank-tag cheapest">más barato</span>'
        } else {
          '<span class="chain-rank-tag mid">medio</span>'
        }
        sprintf(
          '<div class="chain-rank-row">
            <span class="chain-rank-name">%s</span>
            %s
          </div>',
          ch$cadena, tag
        )
      }), collapse = "")
      chain_html <- sprintf(
        '<div class="chain-rank-chart">%s</div><div class="chain-rank-list">%s</div>',
        as.character(plotOutput("insights_chain_chart", height = "280px")),
        chain_rows
      )
    } else {
      chain_html <- '<div class="empty-state">Sin datos de cadenas</div>'
    }

    HTML(sprintf(
      '<div class="insights-layout">
        %s
        <div class="insights-columns">
          <div>
            <h3 class="section-heading">Alertas de subida brusca</h3>
            <div class="alert-list">%s</div>
            <h3 class="section-subheading">Más subidos vs IPC oficial</h3>
            %s
          </div>
          <div>
            <h3 class="section-heading">Cadenas por precio promedio</h3>
            %s
          </div>
        </div>
      </div>',
      kpi_html, alerts_html, vs_ipc_html, chain_html
    ))
  })

  output$insights_chain_chart <- renderPlot({
    eans <- basket_eans()
    req(length(eans) > 0, latest_fecha())
    cadenas <- q_cadena_prices(con, eans, latest_fecha())
    req(nrow(cadenas) > 0)

    df <- cadenas
    df$cadena <- factor(df$cadena, levels = rev(df$cadena))

    ggplot(df, aes(x = cadena, y = precio_promedio)) +
      geom_col(fill = "#c9a87c", width = 0.55) +
      geom_text(
        aes(label = paste0("$", format(round(precio_promedio), big.mark = ".", decimal.mark = ",", scientific = FALSE))),
        hjust = -0.15, color = "#e5e5e5", size = 4.2
      ) +
      coord_flip() +
      scale_y_continuous(expand = expansion(mult = c(0, 0.35))) +
      labs(x = NULL, y = NULL) +
      theme_void() +
      theme(
        plot.background  = element_rect(fill = "#161616", color = NA),
        panel.background = element_rect(fill = "#161616", color = NA),
        axis.text.y = element_text(color = "#e5e5e5", size = 12, hjust = 1, margin = margin(r = 10)),
        plot.margin = margin(8, 20, 8, 8)
      )
  }, bg = "#161616")

  outputOptions(output, "insights_chain_chart", suspendWhenHidden = FALSE)
}

# ═══════════════════════════════════════════════════════════════════════════

shinyApp(ui = ui, server = server)
