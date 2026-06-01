ui <- fluidPage(
  titlePanel("Buscador de Productos"),
  sidebarLayout(
    sidebarPanel(
      width = 3,
      selectInput(
        "selected_category",
        "Categoría:",
        choices = c("Todas" = "", all_categories),
        selected = ""
      ),
      selectizeInput(
        "selected_products",
        "Buscar productos:",
        choices = NULL,
        multiple = TRUE,
        options = list(placeholder = "Escribí para buscar...")
      )
    ),
    mainPanel(
      width = 9,
      DT::dataTableOutput("results_table")
    )
  )
)
