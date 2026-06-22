# Outlier Detection — Frontend Integration Guide

## What changed

A new column `is_outlier` was added to the `price_series` table. The ETL pipeline now automatically flags suspicious prices after each run using IQR-based statistical detection.

## Column: `is_outlier`

| Value | Meaning | Example |
|-------|---------|---------|
| `0` | Clean price | Normal product price |
| `1` | Cross-chain outlier | Supertop lists tuna at $1,399 while Disco/Jumbo/Vea all say $21 |
| `2` | Temporal outlier | A product jumps from $500 to $50,000 overnight across all chains |
| `3` | Category outlier | An electric shaver listed at $58 when the "electrodomésticos" category median is $30,000+ |

## Migration

Run this on the existing database before deploying:

```sql
ALTER TABLE price_series ADD COLUMN is_outlier INTEGER DEFAULT 0;
```

Or execute `sql/migrate_add_outlier.sql`.

## API Query Changes

### Exclude outliers from all consumer-facing queries

Add `AND is_outlier = 0` to every query that feeds the frontend. This filters out flagged prices while keeping them in the database for auditing.

**Product detail / price by chain:**
```sql
-- BEFORE
SELECT cadena, precio_promo, precio_lista
FROM price_series
WHERE ean = ? AND fecha = ?

-- AFTER
SELECT cadena, precio_promo, precio_lista
FROM price_series
WHERE ean = ? AND fecha = ? AND is_outlier = 0
```

**Price evolution (time series chart):**
```sql
-- BEFORE
SELECT fecha, precio_promo
FROM price_series
WHERE ean = ? AND cadena = ?
ORDER BY fecha

-- AFTER
SELECT fecha, precio_promo
FROM price_series
WHERE ean = ? AND cadena = ? AND is_outlier = 0
ORDER BY fecha
```

**Aggregate price (average across chains):**
```sql
-- BEFORE
SELECT fecha, AVG(precio_promo) as precio_promedio
FROM price_series
WHERE ean = ?
GROUP BY fecha

-- AFTER
SELECT fecha, AVG(precio_promo) as precio_promedio
FROM price_series
WHERE ean = ? AND is_outlier = 0
GROUP BY fecha
```

**Cheapest chain ("más barato"):**
```sql
-- BEFORE
SELECT cadena, MIN(precio_promo)
FROM price_series
WHERE ean = ? AND fecha = ?

-- AFTER
SELECT cadena, MIN(precio_promo)
FROM price_series
WHERE ean = ? AND fecha = ? AND is_outlier = 0
```

**Percentage change calculation:**
```sql
-- BEFORE
SELECT ... price change logic ...
FROM price_series
WHERE ean = ?

-- AFTER (apply to BOTH the current and previous date subqueries)
... AND is_outlier = 0
```

### Optional: expose outlier info in an admin/debug endpoint

If you want visibility into what's being filtered:

```sql
-- Count outliers by type for a date
SELECT
    is_outlier,
    COUNT(*) as count
FROM price_series
WHERE fecha = ? AND is_outlier > 0
GROUP BY is_outlier

-- List specific outliers with product info
SELECT
    ps.ean, cp.product_description, ps.cadena,
    ps.precio_promo, ps.is_outlier
FROM price_series ps
JOIN canonical_products cp ON ps.ean = cp.ean
WHERE ps.fecha = ? AND ps.is_outlier > 0
ORDER BY ps.is_outlier, ps.precio_promo DESC
```

## Performance

Add an index if outlier filtering slows down queries:

```sql
CREATE INDEX IF NOT EXISTS idx_price_series_outlier
    ON price_series(ean, fecha, is_outlier);
```

## Summary

The single rule: **add `AND is_outlier = 0` to every query that shows prices to users.** Keep all other logic unchanged. The ETL handles detection automatically on each run.
