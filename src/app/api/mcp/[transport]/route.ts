import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import {
  getProducts,
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
          "Busca productos en supermercados argentinos por texto, categoria o EAN. " +
          "Devuelve precio actual, variacion porcentual y cobertura de cadenas.",
        inputSchema: {
          search: z
            .string()
            .optional()
            .describe("Texto libre para buscar en nombre o marca"),
          category: z
            .string()
            .optional()
            .describe(
              "Categoria exacta (usar get_categories para ver opciones)",
            ),
          dias: z
            .number()
            .int()
            .min(1)
            .max(365)
            .optional()
            .describe("Periodo de comparacion en dias (default: 30)"),
          page: z
            .number()
            .int()
            .min(1)
            .optional()
            .describe("Pagina (default: 1)"),
          pageSize: z
            .number()
            .int()
            .min(1)
            .max(50)
            .optional()
            .describe("Resultados por pagina (default: 20, max: 50)"),
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
        const { products, total } = getProducts(opts);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { products, total, page: opts.page, pageSize: opts.pageSize },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    server.registerTool(
      "get_categories",
      {
        title: "Listar categorias",
        description:
          "Lista todas las categorias de productos disponibles con la cantidad de productos en cada una.",
        inputSchema: {},
      },
      async () => {
        const categories = getCategories();
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(categories, null, 2),
            },
          ],
        };
      },
    );

    server.registerTool(
      "get_product_detail",
      {
        title: "Detalle de producto",
        description:
          "Obtiene informacion detallada de un producto por su codigo EAN, incluyendo precio actual y variacion.",
        inputSchema: {
          ean: z.string().describe("Codigo EAN del producto"),
        },
      },
      async ({ ean }) => {
        const product = getProductByEan(ean);
        if (!product) {
          return {
            content: [
              { type: "text" as const, text: "Producto no encontrado." },
            ],
          };
        }
        const stats = getPriceStats(ean);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ product, stats }, null, 2),
            },
          ],
        };
      },
    );

    server.registerTool(
      "get_price_history",
      {
        title: "Historial de precios",
        description:
          "Devuelve la serie historica de precios de un producto (promedio y por cadena). " +
          "Util para analizar tendencias de inflacion de un producto especifico.",
        inputSchema: {
          ean: z.string().describe("Codigo EAN del producto"),
        },
      },
      async ({ ean }) => {
        const average = getPriceHistory(ean);
        const byChain = getPriceHistoryByChain(ean);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ average, byChain }, null, 2),
            },
          ],
        };
      },
    );

    server.registerTool(
      "get_category_price_history",
      {
        title: "Historial de precios por categoria",
        description:
          "Devuelve la serie historica de precios promedio de una categoria completa. " +
          "Util para analizar inflacion por rubro (lacteos, bebidas, etc.).",
        inputSchema: {
          category: z
            .string()
            .describe(
              "Nombre de la categoria (usar get_categories para ver opciones)",
            ),
        },
      },
      async ({ category }) => {
        const history = getCategoryPriceHistory(category);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(history, null, 2) },
          ],
        };
      },
    );

    server.registerTool(
      "compare_chain_prices",
      {
        title: "Comparar precios por cadena",
        description:
          "Compara el costo total de una canasta de productos entre cadenas de supermercados. " +
          "Recibe una lista de EANs y devuelve el total por cadena, ordenado del mas barato al mas caro.",
        inputSchema: {
          eans: z
            .array(z.string())
            .min(1)
            .max(200)
            .describe("Lista de codigos EAN de los productos a comparar"),
        },
      },
      async ({ eans }) => {
        const prices = getChainPrices(eans);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(prices, null, 2) },
          ],
        };
      },
    );

    server.registerTool(
      "get_latest_date",
      {
        title: "Ultima fecha con datos",
        description:
          "Devuelve la fecha mas reciente con datos de precios en la base de datos.",
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

/**
 * Optional API key authentication for the MCP endpoint.
 *
 * If MCP_API_KEY is set in the environment, requests must include
 * it via the Authorization header (Bearer <key>) or the
 * x-api-key header. If not set, the endpoint is open (useful for
 * local development or personal deployments behind a firewall).
 */
function checkAuth(request: NextRequest): boolean {
  const requiredKey = process.env.MCP_API_KEY;
  if (!requiredKey) return true; // Auth not configured — open access

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7) === requiredKey;
  }

  const apiKeyHeader = request.headers.get("x-api-key");
  if (apiKeyHeader) {
    return apiKeyHeader === requiredKey;
  }

  return false;
}

function createAuthHandler(
  innerHandler: (
    req: NextRequest,
    ctx: { params: Promise<{ transport: string }> },
  ) => Promise<Response>,
) {
  return async function (
    req: NextRequest,
    ctx: { params: Promise<{ transport: string }> },
  ): Promise<Response> {
    if (!checkAuth(req)) {
      return NextResponse.json(
        {
          error:
            "No autorizado. Inclui MCP_API_KEY en el header Authorization o x-api-key.",
        },
        { status: 401 },
      );
    }
    return innerHandler(req, ctx);
  };
}

const authHandler = createAuthHandler(
  handler as unknown as (
    req: NextRequest,
    ctx: { params: Promise<{ transport: string }> },
  ) => Promise<Response>,
);

export { authHandler as GET, authHandler as POST, authHandler as DELETE };
