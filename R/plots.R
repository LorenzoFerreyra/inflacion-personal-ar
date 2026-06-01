# ==============================================================================
# R/plots.R
#
# Funciones para generar los gráficos de la aplicación.
# ==============================================================================

#' @title Graficar Índice de Inflación
#' @description Calcula y grafica el índice de precios para una canasta de productos.
#'
#' @param df Un `data.frame` que contiene `fecha` y `precio_lista`.
#' @return Un objeto `plotly`.
plot_inflation_index <- function(df) {

  # Calcular el costo total de la canasta por día
  index_data <- df %>%
    mutate(fecha = as.Date(fecha)) %>%
    group_by(fecha) %>%
    summarise(costo_canasta = sum(precio_lista, na.rm = TRUE)) %>%
    filter(costo_canasta > 0) %>% # Excluir días sin datos
    arrange(fecha) %>%
    # Calcular el índice base 100
    mutate(indice = (costo_canasta / first(costo_canasta)) * 100)

  # Crear el gráfico con ggplot
  p <- ggplot(index_data, aes(x = fecha, y = indice, text = paste("Fecha:", format(fecha, "%d/%m/%Y"), "<br>Índice:", round(indice, 2)))) +
    geom_line(color = "#2c3e50") +
    geom_point(color = "#2c3e50", size = 2) +
    labs(
      title = "Evolución del Índice de Precios de tu Canasta",
      subtitle = "Base 100 = primer día del período seleccionado",
      x = "Fecha",
      y = "Índice de Precios"
    ) +
    theme_minimal(base_size = 14) +
    scale_x_date(date_labels = "%b %Y") +
    theme(
      plot.title = element_text(face = "bold", size = 16),
      axis.title = element_text(size = 12)
    )

  # Convertir a plotly para interactividad
  ggplotly(p, tooltip = "text")
}


#' @title Graficar Precios Individuales
#' @description Grafica la evolución de precios para cada producto en la canasta.
#'
#' @param df Un `data.frame` con `fecha`, `precio_lista`, `product_description` y `marca`.
#' @return Un objeto `plotly`.
plot_individual_prices <- function(df) {

  # Preparar los datos para el gráfico
  df_plot <- df %>%
    mutate(
      fecha = as.Date(fecha),
      label = paste0(product_description, " (", marca, ")")
    )

  # Crear el gráfico con ggplot
  p <- ggplot(df_plot, aes(x = fecha, y = precio_lista, color = label, group = label, text = paste("Producto:", label, "<br>Precio: $", round(precio_lista, 2)))) +
    geom_line(alpha = 0.8) +
    geom_point(alpha = 0.8) +
    labs(
      title = "Evolución de Precios por Producto",
      x = "Fecha",
      y = "Precio de Lista Promedio ($)"
    ) +
    theme_minimal(base_size = 14) +
    scale_x_date(date_labels = "%b %Y") +
    theme(
      plot.title = element_text(face = "bold", size = 16),
      legend.position = "none" # La leyenda interactiva de plotly es suficiente
    )

  # Convertir a plotly
  ggplotly(p, tooltip = "text")
}
