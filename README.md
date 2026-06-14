# Observatorio de Inflacion Personal

Seguimiento personalizado de inflacion en Argentina. Compara tu canasta real contra el IPC oficial.

## Stack

| Capa | Tecnologia | Para que |
|------|-----------|-----------|
| Framework | Next.js 16 (App Router) | Routing, SSR, API routes integradas |
| Lenguaje | TypeScript | Tipado estatico |
| Estilos | Tailwind CSS v4 | Utility-first, dark theme con clases `bg-zinc-*` |
| Charts | Recharts | Wrapper declarativo sobre D3 para React |
| Base de datos | better-sqlite3 | Driver SQLite sincronico, corre server-side |
| Iconos | lucide-react | Iconos SVG livianos |
| Bundler | Turbopack | Bundler de Next.js en dev, reemplaza Webpack |

## Estilos

### Tipografia

El sistema usa tres familias cargadas via `next/font/google`, disponibles como variables CSS en el elemento `<html>`:

| Variable CSS | Familia | Clase Tailwind | Uso |
|---|---|---|---|
| `--font-fraunces` | **Fraunces** | `font-display` | Titulos, logo, KPIs — serif variable con peso editorial |
| `--font-dm-sans` | **DM Sans** | `font-sans` (default) | Todo el UI: labels, cuerpo, navegacion |
| `--font-dm-mono` | **DM Mono** | `font-mono` | Precios, porcentajes, indices numericos |

Fraunces es una serif variable de eje optico (a mayor tamaño, el trazo se vuelve mas expressivo). Se aplica a la marca en el nav y a los valores de los KPI cards. El observatorio tiene pretension analitica/periodistica, y busca evitar ser un  dashboard de SaaS vibecodeado más.

Para numeros en tablas se agrega `font-feature-settings: "tnum"` via la clase `.tabular` (definida en `globals.css`), que fuerza numeros de ancho fijo y alinea columnas de precios correctamente.

### Paleta de colores

Base: **zinc-950** (`#09090b`) como fondo global. Monocromatica con zinc para superficies y bordes.

Acento: **amber** como unico color semantico. Se usa en tres formas:

| Token | Valor | Donde |
|---|---|---|
| `amber-300` | `#fcd34d` | Texto activo: periodo seleccionado, IPC badge, periodos |
| `amber-400` | `#fbbf24` | Dot del badge, valores IPC |
| `amber-450` | `#e0a535` | Custom token — punto medio para gradientes |
| gradiente amber | `#f5e6c8 → #d9a64e` | Clase `.text-gradient`, logo y titulos destacados |

Colores semanticos de datos:
- `red-400` — inflacion por encima del IPC, variacion positiva de precios
- `green-400` — inflacion por debajo del IPC, baja de precios

### Superficies

El sistema no usa negro puro ni blanco puro. Capas:

```
zinc-950  → fondo global
zinc-900  → inputs, nav toggle pills
zinc-800  → bordes internos, separadores
zinc-700  → bordes de componentes en hover / activos
zinc-100  → texto principal
zinc-400  → texto secundario (labels, subtitulos)
zinc-500  → texto terciario (placeholders, metadata)
zinc-600  → iconos desactivados
```

Componentes usan `bg-zinc-900/60` (con opacidad) sobre el fondo para crear depth sin romper la escala monocromatica.

### Clases utilitarias definidas en `globals.css`

| Clase | Descripcion |
|---|---|
| `.font-display` | Aplica Fraunces |
| `.tabular` | Aplica DM Mono con `tnum` para numeros alineados |
| `.text-gradient` | Gradiente amber diagonal como `background-clip: text` |
| `.glass` | Fondo semitransparente con `backdrop-blur` para overlays |
| `.animate-fade-in` | Entrada suave: opacity + translateY en 300ms |
| `.pulse-dot` | Pulso de opacidad para indicadores de estado en vivo |

## Instalacion

```bash
npm install
```

## Correr en desarrollo

```bash
npm run dev
```

Abrir http://localhost:3000 en el navegador.

## Build para produccion

```bash
npm run build
npm start
```

## Estructura del proyecto

```
src/
├── app/
│   ├── page.tsx                ← Tab "Mi canasta"
│   ├── explorador/page.tsx     ← Tab "Explorador"
│   ├── insights/page.tsx       ← Tab "Insights"
│   ├── layout.tsx              ← Layout global (nav + dark theme)
│   └── api/
│       ├── products/route.ts   ← GET /api/products
│       ├── history/route.ts    ← GET /api/history?ean=...
│       ├── chains/route.ts     ← GET /api/chains?eans=...
│       └── categories/route.ts ← GET /api/categories
├── components/
│   ├── Navigation.tsx          ← Barra de navegacion
│   ├── ProductTable.tsx        ← Tabla paginada reutilizable
│   ├── KpiCard.tsx             ← Tarjeta de indicador
│   ├── PriceChart.tsx          ← Grafico de linea (Recharts)
│   └── ChainBarChart.tsx       ← Grafico de barras por cadena
└── lib/
    ├── database.ts             ← Conexion SQLite + queries
    ├── constants.ts            ← IPC, periodos, page size
    └── types.ts                ← Interfaces TypeScript
```

## Flujo de datos

```
Browser (React)  →  fetch("/api/products?search=leche&dias=30")
                          ↓
API Route (server)  →  better-sqlite3 lee prices.db
                          ↓
                    JSON response → React renderiza tabla/chart
```

- Las queries SQL estan en `src/lib/database.ts` — un solo archivo, funciones puras.
- Las API routes estan en `src/app/api/*/route.ts` — parsean query params y llaman a database.ts.
- Los componentes (`ProductTable`, `PriceChart`, etc.) solo reciben data y renderizan.

## Charts

Recharts funciona 100% client-side. Los componentes son declarativos:

```tsx
// Linea de evolucion de precios
<LineChart data={data}>
  <XAxis dataKey="fecha" />
  <YAxis />
  <Tooltip />
  <Line dataKey="precio_promedio" stroke="#c9a87c" />
</LineChart>

// Barras horizontales por cadena
<BarChart data={data} layout="vertical">
  <XAxis type="number" />
  <YAxis type="category" dataKey="cadena" />
  <Bar dataKey="precio_promedio_canasta" fill="#4ade80" />
</BarChart>
```

## Responsiveness

Cada grafico se envuelve en `<ResponsiveContainer>` para que escale al ancho del contenedor.

## Requisitos

- Node.js v18 o superior
- La base de datos SQLite del scraper (privado) en su ruta habitual
