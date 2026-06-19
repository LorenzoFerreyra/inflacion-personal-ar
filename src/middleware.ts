/**
 * middleware.ts — Rate limiting para todas las rutas de API.
 *
 * Se ejecuta antes de cada request. Aplica límites diferentes según la ruta:
 *   - /api/ipc: 10 req/min (cálculo más costoso)
 *   - /api/mcp: 30 req/min (endpoint MCP externo)
 *   - resto de /api/*: 120 req/min
 *
 * Detección de IP: solo confía en headers que son establecidos por
 * infraestructura confiable (Vercel, Cloudflare) y no por el cliente.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";

const LIMITS: Record<string, { max: number; window: number }> = {
  "/api/ipc": { max: 10, window: 60_000 },
  "/api/mcp": { max: 30, window: 60_000 },
  default: { max: 120, window: 60_000 },
};

/**
 * Extrae la IP real del cliente.
 *
 * Prioriza headers que son establecidos por infraestructura confiable
 * y NO por el cliente:
 *   - cf-connecting-ip: Cloudflare (no spoofeable)
 *   - x-real-ip: reverse proxies como nginx o Vercel (configurable)
 *
 * No se confía en x-forwarded-for porque el cliente puede enviarlo.
 * Si no se encuentra ninguna IP confiable, se devuelve undefined y se
 * rechaza el request para evitar que todos los requests anónimos
 * compartan el mismo bucket de rate limit.
 */
function getClientIp(request: NextRequest): string | undefined {
  // Cloudflare sets this header; it cannot be overridden by the client.
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp?.trim()) return cfIp.trim();

  // nginx / Vercel set x-real-ip to the downstream client IP.
  // Only trust this if you are behind a reverse proxy that sets it.
  const realIp = request.headers.get("x-real-ip");
  if (realIp?.trim()) return realIp.trim();

  return undefined;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Solo aplicar a rutas de API
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const ip = getClientIp(request);
  if (!ip) {
    // No se pudo determinar una IP confiable.
    // Rechazar para evitar que requests sin IP compartan el mismo bucket.
    return NextResponse.json(
      { error: "No se pudo identificar la IP del cliente." },
      { status: 400 },
    );
  }

  // Buscar el límite más específico
  const limitKey = Object.keys(LIMITS).find((prefix) =>
    pathname.startsWith(prefix),
  );
  const { max, window } = limitKey
    ? (LIMITS[limitKey] as { max: number; window: number })
    : LIMITS.default;

  if (!checkRateLimit(`api:${pathname}:${ip}`, max, window)) {
    return NextResponse.json(
      {
        error:
          "Demasiadas solicitudes. Por favor intente nuevamente en unos momentos.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(window / 1000)),
        },
      },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
