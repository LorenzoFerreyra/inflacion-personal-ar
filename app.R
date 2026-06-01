# ==============================================================================
# INFLACION PERSONAL AR - SHINY APP
#
# Este es el archivo principal de la aplicación Shiny.
# Contiene tanto la UI (interfaz de usuario) como el Server (lógica).
# ==============================================================================

library(shiny)
library(DBI)
library(RSQLite)
library(dplyr)
library(ggplot2)
library(plotly)

# ==============================================================================
# CONEXION A LA BASE DE DATOS
# ==============================================================================
# Asegúrate de que la ruta a tu base de datos es correcta.
db_path <- "C:/Users/Lorenzo/Desktop/prices.db"

# Pool de conexiones para manejar concurrencia de forma segura
db <- dbPool(
  drv = RSQLite::SQLite(),
  dbname = db_path
)

# Cierra la conexión cuando la app se detiene
onStop(function() {
  poolClose(db)
})

# ==============================================================================
# DATOS INICIALES
# ==============================================================================
# Cargar productos canónicos para que el usuario pueda seleccionarlos.
# Usamos tryCatch para manejar el caso en que la tabla no exista o esté vacía.
all_products <- tryCatch({
  dbGetQuery(db, "SELECT ean, product_description, marca, categoria FROM canonical_products ORDER BY product_description")
}, error = function(e) {
  # Si hay un error (ej. la tabla no existe), devuelve un dataframe vacío.
  data.frame(
    ean = character(0),
    product_description = character(0),
    marca = character(0),
    categoria = character(0)
  )
})

# Crear una lista para el selectInput, formateada como "Descripción (Marca)"
product_choices <- setNames(all_products$ean, paste(all_products$product_description, " (", all_products$marca, ")", sep = ""))

# ==============================================================================
# UI (Interfaz de Usuario)
# ==============================================================================
ui <- fluidPage(
  titlePanel("Calculadora de inflación personal"),

  sidebarLayout(
    sidebarPanel(
      h4("1. Armá tu canasta"),
      p("Seleccioná los productos que consumís habitualmente para calcular tu índice de precios personalizado."),

      selectInput(
        "selected_products",
        "Buscar y agregar productos:",
        choices = product_choices,
        multiple = TRUE,
        selected = NULL
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

      actionButton("calculate_button", "Calcular Mi Inflación", class = "btn-primary")
    ),

    mainPanel(
      tabsetPanel(
        type = "tabs",
        tabPanel("Mi Inflación", plotlyOutput("inflation_plot")),
        tabPanel("Precios Individuales", plotlyOutput("individual_prices_plot")),
        tabPanel("Datos de la Canasta", DT::dataTableOutput("basket_data_table"))
      )
    )
  )
)

# ==============================================================================
# SERVER (Lógica de la Aplicación)
# ==============================================================================
server <- function(input, output, session) {

  # --- Reactividad para obtener datos ---

  # Datos de la canasta seleccionada, se actualiza al presionar el botón
  basket_data <- eventReactive(input$calculate_button, {
    req(input$selected_products)

    query <- "
      SELECT
        p.fecha,
        p.precio_lista,
        c.product_description,
        c.marca
      FROM price_series p
      JOIN canonical_products c ON p.ean = c.ean
      WHERE p.ean IN (?) AND p.fecha BETWEEN ? AND ?
      GROUP BY p.ean, p.fecha -- Tomamos el precio promedio si hay duplicados por cadena
    "

    # Usamos placeholders (?) para seguridad
    sql_query <- sqlInterpolate(
      db,
      query,
      .dots = list(input$selected_products, as.character(input$date_range[1]), as.character(input$date_range[2]))
    )

    dbGetQuery(db, sql_query)
  })

  # --- Salidas (Outputs) ---

  # Gráfico de inflación de la canasta
  output$inflation_plot <- renderPlotly({
    df <- basket_data()
    req(nrow(df) > 0)

    # Calcular el índice de precios de la canasta
    index_data <- df %>%
      group_by(fecha) %>%
      summarise(costo_canasta = sum(precio_lista, na.rm = TRUE)) %>%
      mutate(fecha = as.Date(fecha)) %>%
      arrange(fecha) %>%
      mutate(indice = (costo_canasta / first(costo_canasta)) * 100)

    p <- ggplot(index_data, aes(x = fecha, y = indice, group = 1)) +
      geom_line(color = "blue") +
      geom_point(color = "blue") +
      labs(
        title = "Evolución del Índice de Precios de tu Canasta",
        subtitle = "Base 100 = primer día del período seleccionado",
        x = "Fecha",
        y = "Índice de Precios"
      ) +
      theme_minimal() +
      scale_x_date(date_labels = "%d-%m-%Y")

    ggplotly(p)
  })

  # Gráfico de precios individuales
  output$individual_prices_plot <- renderPlotly({
    df <- basket_data()
    req(nrow(df) > 0)

    df_plot <- df %>%
      mutate(fecha = as.Date(fecha),
             label = paste(product_description, " (", marca, ")", sep=""))

    p <- ggplot(df_plot, aes(x = fecha, y = precio_lista, color = label, group = label)) +
      geom_line() +
      geom_point() +
      labs(
        title = "Evolución de Precios por Producto",
        x = "Fecha",
        y = "Precio de Lista ($)"
      ) +
      theme_minimal() +
      scale_x_date(date_labels = "%d-%m-%Y") +
      theme(legend.position = "bottom")

    ggplotly(p)
  })

  # Tabla de datos
  output$basket_data_table <- DT::renderDataTable({
    df <- basket_data()
    req(nrow(df) > 0)
    DT::datatable(df, options = list(pageLength = 10, language = list(url = '//cdn.datatables.net/plug-ins/1.10.19/i18n/Spanish.json')))
  })

}

# ==============================================================================
# EJECUTAR LA APLICACIÓN
# ==============================================================================
shinyApp(ui = ui, server = server)
