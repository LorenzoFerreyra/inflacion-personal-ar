library(shiny)

source("global.R")
source("R/server.R")

ui <- function(request) {
  htmlTemplate(
    filename = "templates/index.html",
    document_ = TRUE
  )
}

shinyApp(ui = ui, server = server)
