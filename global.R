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
# Cargar productos canónicos para que el usuario pueda seleccionarlos.
# Usamos tryCatch para manejar el caso en que la tabla no exista o esté vacía.
all_products <- tryCatch({
  dbGetQuery(db, "SELECT ean, product_description, marca, categoria FROM canonical_products ORDER BY product_description")
}, error = function(e) {
  # Si hay un error (ej. la tabla no existe), devuelve un dataframe vacío.
  # Esto previene que la app crashee si la DB no está lista.
  message("Error al cargar productos canónicos: ", e$message)
  data.frame(
    ean = character(0),
    product_description = character(0),
    marca = character(0),
    categoria = character(0)
  )
})

# Crear una lista nombrada para el selectInput, formateada como "Descripción (Marca)"
# Esto es más eficiente que hacerlo reactivamente.
product_choices <- if (nrow(all_products) > 0) {
  setNames(all_products$ean, paste(all_products$product_description, " (", all_products$marca, ")", sep = ""))
} else {
  character(0)
}
