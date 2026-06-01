# ==============================================================================
# ui.R
#
# Define la interfaz de usuario (UI) de la aplicación Shiny.
# ==============================================================================

ui <- fluidPage(
  titlePanel("Calculadora de Inflación Personal"),
  sidebarLayout(
    sidebarPanel(
      width = 3,
      h4("1. Armá tu canasta"),
      p("Seleccioná los productos que consumís habitualmente."),
      selectizeInput(
        "selected_products",
        "Buscar y agregar productos:",
        choices = NULL, # Se carga desde el servidor
        multiple = TRUE,
        options = list(
          placeholder = "Escribí para buscar..."
        )
      ),
      hr(),
      h4("2. Opciones de Visualización"),
      dateRangeInput(
        "date_range",
        "Rango de fechas:",
        start = Sys.Date() - 90,
        end = Sys.Date(),
        format = "dd/mm/yyyy",
        separator = " - "
      ),
      actionButton("calculate_button", "Calcular Mi Inflación", class = "btn-primary", icon = icon("calculator"))
    ),
    mainPanel(
      width = 9,
      tabsetPanel(
        id = "main_tabs",
        type = "tabs",
        tabPanel("Mi Inflación", value = "tab_inflation", plotlyOutput("inflation_plot", height = "600px")),
        tabPanel("Precios Individuales", value = "tab_individual", plotlyOutput("individual_prices_plot", height = "600px")),
        tabPanel("Datos de la Canasta", value = "tab_data", DT::dataTableOutput("basket_data_table"))
      )
    )
  )
)
