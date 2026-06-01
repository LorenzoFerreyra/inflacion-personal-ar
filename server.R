source("R/queries.R")

server <- function(input, output, session) {
  filtered_choices <- reactive({
    if (input$selected_category == "") {
      product_choices
    } else {
      rows <- all_products$categoria == input$selected_category & !is.na(all_products$categoria)
      subset <- all_products[rows, ]
      if (nrow(subset) > 0) {
        setNames(subset$ean, paste0(subset$product_description, " (", subset$marca, ")"))
      } else {
        character(0)
      }
    }
  })

  observe({
    updateSelectizeInput(
      session,
      "selected_products",
      choices = filtered_choices(),
      server = TRUE
    )
  })

  output$results_table <- DT::renderDataTable({
    validate(need(input$selected_products, "Seleccioná al menos un producto."))

    df <- fetch_price_data(pool = db, eans = input$selected_products)

    DT::datatable(
      df,
      rownames = FALSE,
      filter = "top",
      options = list(
        pageLength = 20,
        language = list(url = "//cdn.datatables.net/plug-ins/1.10.19/i18n/Spanish.json")
      )
    )
  })
}
