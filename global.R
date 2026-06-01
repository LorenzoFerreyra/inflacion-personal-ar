# ==============================================================================
# global.R
#
# Carga de librerías, conexión a la base de datos y carga de datos iniciales.
# Este código se ejecuta una sola vez al iniciar la aplicación.
# ==============================================================================

library(shiny)
library(DBI)
library(RSQLite)
library(dplyr)
library(ggplot2)
library(plotly)
library(pool)

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
# DEPRECATED: No se cargan todos los productos al inicio por performance.
all_products <- data.frame()

# Crear una lista nombrada para el selectInput, formateada como "Descripción (Marca)"
# Esto es más eficiente que hacerlo reactivamente.
# DEPRECATED: Se movió a server-side selectize para performance.
# product_choices <- if (nrow(all_products) > 0) {
#   setNames(all_products$ean, paste(all_products$product_description, " (", all_products$marca, ")", sep = ""))
# } else {
#   character(0)
# }
