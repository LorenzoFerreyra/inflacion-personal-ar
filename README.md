# Observatorio de Inflacion Personal

Seguimiento personalizado de inflacion en Argentina. Compara tu canasta real contra el IPC oficial.

## Stack

| Capa | Tecnologia | Para que |
|------|-----------|-----------|
| Framework | Next.js 16 (App Router) | Routing, SSR, API routes integradas |
| Lenguaje | TypeScript | Tipado estatico |
| Estilos | Tailwind CSS | Utility-first, dark theme con clases `bg-zinc-*` |
| Charts | Recharts | Wrapper declarativo sobre D3 para React |
| Base de datos | better-sqlite3 | Driver SQLite sincronico, corre server-side |
| Iconos | lucide-react | Iconos SVG livianos |
| Bundler | Turbopack | Bundler de Next.js en dev, reemplaza Webpack |

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

Cada grafico se envuelve en `<ResponsiveContainer>` para que escale al ancho del contenedor.

## Requisitos

- Node.js v18 o superior
- La base de datos SQLite del scraper (privado) en su ruta habitual
