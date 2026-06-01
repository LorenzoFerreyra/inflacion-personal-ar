# Calculadora de inflación personal (Argentina)

Este proyecto es una aplicación Shiny diseñada para permitir a los usuarios calcular su propia tasa de inflación personal basada en los productos que consumen. Utiliza datos de precios reales obtenidos mediante scraping de los principales supermercados de Argentina.

La aplicación se basa en la tesis de que la inflación no es un fenómeno homogéneo, sino una experiencia socialmente diferenciada que los índices agregados oficiales tienden a invisibilizar.

## Stack

- **Lenguaje**: R
- **Framework**: Shiny
- **Base de Datos**: SQLite
- **Manejo de Datos**: `dplyr`, `DBI`, `pool`
- **Visualización**: `ggplot2`, `plotly`, `DT`
- **Gestión de Entorno**: `renv`

---

## Cómo ejecutar la aplicación localmente

Sigue estos pasos para instalar las dependencias y ejecutar la aplicación en tu máquina.

### 1. Prerrequisitos

- Tener [R](https://cran.r-project.org/) instalado en tu sistema.
- Se recomienda usar [RStudio Desktop](https://posit.co/download/rstudio-desktop/) para una mejor experiencia de desarrollo.

### 2. Configuración del rntorno con `renv`

Este proyecto utiliza `renv` para gestionar las dependencias de R, garantizando que siempre uses las versiones correctas de los paquetes.

Al abrir el proyecto en R o RStudio por primera vez, `renv` debería activarse automáticamente gracias al archivo `.Rprofile`. Si no es así, puedes activarlo manualmente.

**Instalar las dependencias:**

Abre una consola de R en el directorio del proyecto y ejecuta el siguiente comando. Esto leerá el archivo `renv.lock` e instalará todos los paquetes necesarios en una librería local para el proyecto.

```r
# Instala renv si aún no lo tienes
if (!require("renv")) install.packages("renv")

# Restaura el entorno del proyecto
Rscript -e "renv::restore()"
```

`renv` te pedirá confirmación para instalar los paquetes. Escribe `y` y presiona Enter.

### 3. Ejecutar la app

Una vez que `renv` haya terminado de instalar los paquetes, tienes dos formas de lanzar la aplicación:

**Opción A: Desde RStudio**

1.  Abre uno de los archivos `ui.R`, `server.R` o `global.R`.
2.  Haz clic en el botón **"Run App"** que aparece en la parte superior del editor.

**Opción B: Desde la consola de R**

Asegúrate de que tu directorio de trabajo es la raíz del proyecto y ejecuta:

```r
Rscript -e "shiny::runApp('.')"
```
You can verify which library R is using at any moment with:

```r
Rscript -e ".libPaths()"
```
La aplicación se abrirá en una nueva ventana o en tu navegador web predeterminado.
