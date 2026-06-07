# Observatorio de Inflacion Personal

Seguimiento personalizado de inflacion en Argentina. Compara tu canasta real contra el IPC oficial.

## Requisitos

- [Node.js](https://nodejs.org/) v18 o superior
- La base de datos SQLite del scraper UFLO en su ruta habitual

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
