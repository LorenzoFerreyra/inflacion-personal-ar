library(DBI)
library(RSQLite)
con <- dbConnect(SQLite(), "C:/Users/Lorenzo/Documents/Desktop project versions/scrapers-uflo/data/prices.db")

cat("Current indexes:\n")
print(dbGetQuery(con, "SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='price_series'"))

cat("\nCreating indexes...\n")
dbExecute(con, "CREATE INDEX IF NOT EXISTS idx_ps_fecha_ean ON price_series(fecha, ean, precio_lista)")
dbExecute(con, "CREATE INDEX IF NOT EXISTS idx_ps_ean_fecha ON price_series(ean, fecha, precio_lista)")
cat("Done.\n")

cat("\nTiming query...\n")
t1 <- Sys.time()
r <- dbGetQuery(con, "
  WITH
  precio_actual AS (
    SELECT ean, AVG(precio_lista) AS precio_hoy
    FROM price_series
    WHERE fecha = (SELECT MAX(fecha) FROM price_series)
      AND precio_lista > 0
    GROUP BY ean
  ),
  precio_base AS (
    SELECT ean, AVG(precio_lista) AS precio_antes
    FROM price_series
    WHERE fecha = (SELECT MIN(fecha) FROM price_series WHERE fecha >= DATE('now', '-30 days'))
      AND precio_lista > 0
    GROUP BY ean
  )
  SELECT cp.ean, cp.product_description, cp.marca, cp.categoria,
    ROUND(pa.precio_hoy, 0) AS precio_actual,
    ROUND((pa.precio_hoy - pb.precio_antes) / pb.precio_antes * 100, 1) AS variacion_pct
  FROM precio_actual pa
  JOIN precio_base pb USING (ean)
  JOIN canonical_products cp USING (ean)
  ORDER BY cp.product_description
  LIMIT 30
")
t2 <- Sys.time()
cat("Query time:", round(as.numeric(t2 - t1, units = "secs"), 3), "s\n")
cat("Rows:", nrow(r), "\n")
print(head(r, 5))

dbDisconnect(con)
