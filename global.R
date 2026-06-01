library(shiny)
library(DBI)
library(RSQLite)
library(pool)
library(dplyr)
library(jsonlite)

source("R/queries.R")

db_path <- "C:/Users/Lorenzo/Desktop/prices.db"

db <- dbPool(
  drv = RSQLite::SQLite(),
  dbname = db_path
)

onStop(function() {
  poolClose(db)
})
