library(shiny)

source("global.R")
source("server.R")

ui <- htmlTemplate(
  "templates/index.html",
  document_ = TRUE
)

shinyApp(ui = ui, server = server)
