library(shiny)

ui <- fluidPage(
  titlePanel("Inflación personal AR"),
  sidebarLayout(
    sidebarPanel(
      numericInput("monto", "Monto inicial (ARS)", value = 100000, min = 0, step = 1000),
      numericInput("inflacion", "Inflación mensual (%)", value = 5, min = 0, step = 0.1),
      sliderInput("meses", "Meses", min = 1, max = 60, value = 12)
    ),
    mainPanel(
      h4("Monto ajustado"),
      textOutput("resultado")
    )
  )
)

server <- function(input, output) {
  output$resultado <- renderText({
    ajustado <- input$monto * (1 + input$inflacion / 100)^input$meses
    format(round(ajustado, 2), big.mark = ".", decimal.mark = ",", scientific = FALSE)
  })
}

shinyApp(ui = ui, server = server)
