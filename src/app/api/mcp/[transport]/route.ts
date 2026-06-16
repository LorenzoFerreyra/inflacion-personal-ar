import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import {
  getProducts,
  getProductCount,
  getCategories,
  getPriceHistory,
  getPriceHistoryByChain,
  getProductByEan,
  getPriceStats,
  getCategoryPriceHistory,
  getChainPrices,
  getLatestDate,
} from "@/lib/database";

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "search_products",
      {
        title: "Buscar productos",
        description:
          "Busca productos en supermercados argentinos por texto, categoría o EAN. " +
          "Devuelve precio actual, variación porcentual y cobertura de cadenas.",
        inputSchema: {
          search: z.string().optional().describe("Texto libre para buscar en nombre o marca"),
          category: z.string().optional().describe("Categoría exacta (usar get_categories para ver opciones)"),
          dias: z.number().int().min(1).max(365).optional().describe("Período de comparación en días (default: 30)"),
          page: z.number().int().min(1).optional().describe("Página (default: 1)"),
          pageSize: z.number().int().min(1).max(50).optional().describe("Resultados por página (default: 20, max: 50)"),
        },
      },
      async ({ search, category, dias, page, pageSize }) => {
        const opts = {
          search: search ?? "",
          category: category ?? "",
          dias: dias ?? 30,
          page: page ?? 1,
          pageSize: Math.min(pageSize ?? 20, 50),
        };
        const products = getProducts(opts);
        const total = getProductCount(opts);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ products, total, page: opts.page, pageSize: opts.pageSize }, null, 2),
            },
          ],
        };
      },
    );

    server.registerTool(
      "get_categories",
      {
        title: "Listar categorías",
        description: "Lista todas las categorías de productos disponibles con la cantidad de productos en cada una.",
        inputSchema: {},
      },
      async () => {
        const categories = getCategories();
        return {
          content: [{ type: "text" as const, text: JSON.stringify(categories, null, 2) }],
        };
      },
    );

    server.registerTool(
      "get_product_detail",
      {
        title: "Detalle de producto",
        description: "Obtiene información detallada de un producto por su código EAN, incluyendo precio actual y variación.",
        inputSchema: {
          ean: z.string().describe("Código EAN del producto"),
        },
      },
      async ({ ean }) => {
        const product = getProductByEan(ean);
        if (!product) {
          return { content: [{ type: "text" as const, text: "Producto no encontrado." }] };
        }
        const stats = getPriceStats(ean);
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ product, stats }, null, 2) }],
        };
      },
    );

    server.registerTool(
      "get_price_history",
      {
        title: "Historial de precios",
        description:
          "Devuelve la serie histórica de precios de un producto (promedio y por cadena). " +
          "Útil para analizar tendencias de inflación de un producto específico.",
        inputSchema: {
          ean: z.string().describe("Código EAN del producto"),
        },
      },
      async ({ ean }) => {
        const average = getPriceHistory(ean);
        const byChain = getPriceHistoryByChain(ean);
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ average, byChain }, null, 2) }],
        };
      },
    );

    server.registerTool(
      "get_category_price_history",
      {
        title: "Historial de precios por categoría",
        description:
          "Devuelve la serie histórica de precios promedio de una categoría completa. " +
          "Útil para analizar inflación por rubro (lácteos, bebidas, etc.).",
        inputSchema: {
          category: z.string().describe("Nombre de la categoría (usar get_categories para ver opciones)"),
        },
      },
      async ({ category }) => {
        const history = getCategoryPriceHistory(category);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(history, null, 2) }],
        };
      },
    );

    server.registerTool(
      "compare_chain_prices",
      {
        title: "Comparar precios por cadena",
        description:
          "Compara el costo total de una canasta de productos entre cadenas de supermercados. " +
          "Recibe una lista de EANs y devuelve el total por cadena, ordenado del más barato al más caro.",
        inputSchema: {
          eans: z
            .array(z.string())
            .min(1)
            .max(200)
            .describe("Lista de códigos EAN de los productos a comparar"),
        },
      },
      async ({ eans }) => {
        const prices = getChainPrices(eans);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(prices, null, 2) }],
        };
      },
    );

    server.registerTool(
      "get_latest_date",
      {
        title: "Última fecha con datos",
        description: "Devuelve la fecha más reciente con datos de precios en la base de datos.",
        inputSchema: {},
      },
      async () => {
        const date = getLatestDate();
        return {
          content: [{ type: "text" as const, text: date ?? "Sin datos" }],
        };
      },
    );
  },
  {},
  {
    basePath: "/api/mcp",
    maxDuration: 60,
  },
);

export { handler as GET, handler as POST, handler as DELETE };
