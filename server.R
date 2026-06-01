# ==============================================================================
# server.R
#
# Contiene la lógica del servidor de la aplicación Shiny.
# ==============================================================================

# Cargar funciones auxiliares
source("R/queries.R")
source("R/plots.R")

server <- function(input, output, session) {
  # --- Server-side Selectize para productos ---
  updateSelectizeInput(
    session,
    "selected_products",
    server = TRUE,
    choices = function() {
      # Esta función se ejecuta cuando el usuario busca.
      # 'session$userData$selectize$selected_products$search' contiene el texto.
      search_term <- session$userData$selectize$selected_products$search

      # Evitar búsquedas vacías o muy cortas
      if (nchar(search_term) < 3) {
        return(NULL)
      }

      # Llamar a una función que busca productos en la DB
      search_products(db, search_term)
    }
  )

  # --- Reactividad para obtener datos ---

  # Datos de la canasta seleccionada. Se actualiza solo al presionar el botón.
  # Usamos eventReactive para controlar cuándo se ejecuta la consulta a la DB.
  basket_data <- eventReactive(input$calculate_button, {
    # Validar que haya productos seleccionados
    validate(
      need(input$selected_products, "Por favor, seleccioná al menos un producto para tu canasta.")
    )

    # Mostrar un feedback visual mientras se cargan los datos
    showNotification("Consultando precios...", type = "message", duration = 2)

    # Llamar a la función que consulta la base de datos
    fetch_price_data(
      pool = db,
      eans = input$selected_products,
      start_date = input$date_range[1],
      end_date = input$date_range[2]
    )
  })

  # --- Salidas (Outputs) ---

  # Gráfico de inflación de la canasta
  output$inflation_plot <- renderPlotly({
    df <- basket_data()

    # Validar que la consulta devolvió datos
    validate(
      need(nrow(df) > 0, "No se encontraron datos de precios para los productos y fechas seleccionados.")
    )

    # Generar el gráfico de índice de inflación
    plot_inflation_index(df)
  })

  # Gráfico de precios individuales
  output$individual_prices_plot <- renderPlotly({
    df <- basket_data()

    validate(
      need(nrow(df) > 0, "No se encontraron datos de precios para los productos y fechas seleccionados.")
    )

    # Generar el gráfico de evolución de precios
    plot_individual_prices(df)
  })

  # Tabla de datos crudos
  output$basket_data_table <- DT::renderDataTable({
    df <- basket_data()

    validate(
      need(nrow(df) > 0, "No se encontraron datos de precios para los productos y fechas seleccionados.")
    )

    # Formatear la tabla para mostrar
    DT::datatable(
      df,
      rownames = FALSE,
      filter = "top",
      options = list(
        pageLength = 15,
        language = list(url = "//cdn.datatables.net/plug-ins/1.10.19/i18n/Spanish.json"),
        autoWidth = TRUE
      )
    )
  })
}
