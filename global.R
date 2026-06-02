library(shiny)
library(DBI)
library(RSQLite)
library(dplyr)
library(ggplot2)
library(jsonlite)

DB_PATH <- "C:/Users/Lorenzo/Desktop/prices.db"

IPC <- list(
  mensual = 8.8,
  trimestral = 26.5,
  interanual = 118.4
)

PERIOD_DAYS <- list(
  mensual = 30,
  trimestral = 90,
  interanual = 365
)

PERIOD_LABELS <- list(
  mensual = "30 días",
  trimestral = "90 días",
  interanual = "365 días"
)
