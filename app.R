library(shiny)
library(DBI)
library(RSQLite)
library(dplyr)
library(ggplot2)
library(jsonlite)

source("global.R")
source("R/queries.R")
source("R/server.R")

ui <- function(request) {
  htmlTemplate("templates/index.html", document_ = TRUE)
}

shinyApp(ui = ui, server = server)
