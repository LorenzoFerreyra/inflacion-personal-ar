library(shiny)
library(DBI)
library(RSQLite)
library(pool)

db_path <- "C:/Users/Lorenzo/Desktop/prices.db"

db <- dbPool(
  drv = RSQLite::SQLite(),
  dbname = db_path
)

onStop(function() {
  poolClose(db)
})

all_products <- tryCatch(
  dbGetQuery(db, "SELECT ean, product_description, marca, categoria FROM canonical_products ORDER BY product_description"),
  error = function(e) {
    message("Error cargando productos: ", e$message)
    data.frame(ean = character(0), product_description = character(0), marca = character(0), categoria = character(0))
  }
)

all_categories <- sort(unique(na.omit(all_products$categoria)))

product_choices <- if (nrow(all_products) > 0) {
  setNames(all_products$ean, paste0(all_products$product_description, " (", all_products$marca, ")"))
} else {
  character(0)
}
