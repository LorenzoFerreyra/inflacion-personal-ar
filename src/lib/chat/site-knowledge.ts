/**
 * site-knowledge.ts — "Autoconocimiento" del asistente: qué es el
 * observatorio, qué hay en cada sección y cómo se calculan los datos.
 *
 * La parte fija vive acá (mantenerla alineada con las páginas cuando
 * cambien); la parte dinámica (fecha de precios, cadenas relevadas) se
 * lee de la base en cada consulta, con cache corto.
 */

import { getBranches, getChainList, getLatestDate } from "@/lib/database";
import { chainLabel } from "@/lib/chainColors";

export const SITE_SECTIONS: { ruta: string; nombre: string; descripcion: string }[] = [
  {
    ruta: "/",
    nombre: "Mi canasta",
    descripcion:
      "Armás tu canasta personal buscando productos y haciendo click en la tabla; después la revisás y ves cuánto subió en el período elegido comparada con lo que habría marcado el IPC del INDEC para una canasta con la misma composición por clase.",
  },
  {
    ruta: "/productos",
    nombre: "Productos",
    descripcion:
      "Todo el relevamiento, producto por producto, con buscador y filtros por cadena y categoría. Pestaña Detalle: al elegir un producto muestra su historial, en qué cadena conviene comprarlo y un botón para empezar una canasta con él. Pestaña Comparar (/productos?vista=comparar): la evolución de hasta 4 productos en un mismo gráfico.",
  },
  {
    ruta: "/indices",
    nombre: "Índices",
    descripcion:
      "Índice de precios de supermercados por clase COICOP (ej. 01.1.4 Leche, lácteos y huevos) comparado con la misma clase del IPC del INDEC para GBA.",
  },
  {
    ruta: "/variedades",
    nombre: "Precios INDEC",
    descripcion:
      "Precio promedio que publica el INDEC (GBA) para 59 productos, comparado con los mismos productos en los supermercados relevados.",
  },
  {
    ruta: "/cobertura",
    nombre: "Cobertura",
    descripcion:
      "Mapa de sucursales cuyas góndolas se relevan y la lista de cadenas cubiertas.",
  },
  {
    ruta: "/metodologia",
    nombre: "Metodología",
    descripcion: "Cómo se obtienen los precios y cómo se calculan índices y variaciones.",
  },
  {
    ruta: "/sobre-mi",
    nombre: "Acerca de",
    descripcion:
      "Quién hizo el proyecto (Lorenzo, proyecto personal) y cómo contactarlo por GitHub para sugerencias o errores.",
  },
];

const METODOLOGIA = `- Los precios se relevan todos los días de los portales públicos de precios de las cadenas (regulación de transparencia de precios). Son precios de góndola/lista, no incluyen promociones bancarias ni descuentos por cantidad.
- Cada producto se asigna a una clase COICOP del INDEC por su nombre, con reglas revisadas a mano; lo que no se reconoce queda sin clasificar y no entra en los índices.
- Índice por clase: precio de lista promedio mensual de cada producto en cada cadena, sin atípicos; cada producto se compara consigo mismo en la misma cadena mes a mes (variaciones de más del doble o menos de la mitad se descartan como errores de carga); media geométrica por cadena (mínimo 30 productos comparables) y todas las cadenas pesan igual; grupos y divisiones con ponderadores del INDEC para GBA.
- En Disco, Jumbo y Vea parte del catálogo tiene precios inválidos: de esas cadenas solo entra el precio que coincide (entre la mitad y el doble) con el de otras cadenas.
- Cada índice se compara con la serie del INDEC del mismo código, región GBA, mismos meses; nunca contra el nivel general (que incluye alquileres, transporte y servicios).
- Variación por producto (Productos): precio más reciente vs. inicio del período (30, 90 o 365 días); solo si ese inicio es posterior al 1/7/2026, porque hasta junio tres cadenas publicaban precios en otra escala.
- El observatorio no reemplaza las mediciones oficiales: solo mide precios de góndola en cadenas seleccionadas.`;

const CACHE_MS = 10 * 60_000;
let cache: { at: number; text: string } | null = null;

/** Datos vivos del relevamiento (fecha y cadenas), cacheados 10 minutos. */
async function liveStats(): Promise<string> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.text;
  try {
    const [fecha, todas, sucursales] = await Promise.all([
      getLatestDate(),
      getChainList(),
      getBranches(),
    ]);
    // "Indec" es la serie de precios oficiales, no un supermercado.
    const cadenas = todas.filter((c) => c.toLowerCase() !== "indec").map(chainLabel);

    // Cobertura por provincia (lo mismo que muestra el mapa de /cobertura).
    const porProvincia = new Map<string, { n: number; cadenas: Set<string> }>();
    for (const s of sucursales) {
      const prov = s.provincia?.trim() || "Sin provincia";
      const entry = porProvincia.get(prov) ?? { n: 0, cadenas: new Set<string>() };
      entry.n++;
      entry.cadenas.add(chainLabel(s.cadena === "super_top" ? "supertop" : s.cadena));
      porProvincia.set(prov, entry);
    }
    const cobertura = [...porProvincia.entries()]
      .sort((a, b) => b[1].n - a[1].n)
      .map(([prov, e]) => `  - ${prov}: ${e.n} sucursales (${[...e.cadenas].join(", ")})`)
      .join("\n");

    const text = [
      `- Última fecha con precios: ${fecha ?? "desconocida"}.`,
      `- Cadenas relevadas (${cadenas.length}): ${cadenas.join(", ")}.`,
      `- Sucursales relevadas: ${sucursales.length}. Por provincia:`,
      cobertura,
      "- Fuera de esas zonas no hay sucursales relevadas: la recomendación de dónde comprar solo funciona cerca de ellas.",
    ].join("\n");
    cache = { at: Date.now(), text };
    return text;
  } catch {
    return "- (No se pudieron leer las estadísticas del relevamiento en este momento.)";
  }
}

/** Bloque de conocimiento del sitio para inyectar al modelo. */
export async function buildSiteKnowledge(paginaActual?: string): Promise<string> {
  const secciones = SITE_SECTIONS.map(
    (s) => `- [${s.nombre}](${s.ruta}): ${s.descripcion}`,
  ).join("\n");
  const actual = paginaActual
    ? SITE_SECTIONS.find((s) => s.ruta === paginaActual) ??
      SITE_SECTIONS.find((s) => s.ruta !== "/" && paginaActual.startsWith(s.ruta))
    : undefined;

  return [
    "SOBRE EL SITIO (Observatorio de inflación personal, Argentina):",
    "Releva precios diarios de supermercados argentinos, permite armar una canasta personal y compararla con el IPC del INDEC, explorar historiales de precios por producto y cadena, ver cobertura de sucursales, y (este asistente) recomendar dónde comprar más barato según la zona del usuario.",
    "",
    "Secciones:",
    secciones,
    "",
    "Metodología:",
    METODOLOGIA,
    "",
    "Datos actuales del relevamiento:",
    await liveStats(),
    "",
    actual
      ? `El usuario está ahora en la sección "${actual.nombre}" (${actual.ruta}).`
      : "No sabemos en qué sección está el usuario.",
  ].join("\n");
}
