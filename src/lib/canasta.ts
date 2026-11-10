/**
 * canasta.ts — Inflación de una canasta propia, comparable con el INDEC.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  Cómo se calcula                                                    │
 * │                                                                      │
 * │  1. Precio mensual de cada producto en cada cadena: promedio de los │
 * │     días del mes (igual que el índice por clase del pipeline).      │
 * │  2. Relativo de cada producto entre el mes inicial y el final, solo │
 * │     en cadenas con precio en los dos meses; las cadenas pesan igual.│
 * │  3. Canasta: media geométrica de los productos (todos pesan igual). │
 * │                                                                      │
 * │  Comparación con el INDEC: para los productos cuya clase COICOP     │
 * │  publica el INDEC, la misma media geométrica pero con la variación  │
 * │  de su clase en el INDEC (GBA, mismos meses). Es lo que habría      │
 * │  marcado el INDEC para una canasta con la misma composición. La     │
 * │  diferencia se calcula sobre esos mismos productos.                 │
 * └──────────────────────────────────────────────────────────────────────┘
 */

/** Relativos fuera de este rango se descartan, como en el pipeline. */
export const RELATIVO_MIN = 0.5;
export const RELATIVO_MAX = 2.0;

/** Relativo de un producto entre los dos meses (ya promediado entre cadenas). */
export interface RelativoProducto {
  ean: string;
  clase_coicop: string | null;
  /** Logaritmo del relativo: ln(precio final / precio inicial). */
  l: number;
  n_cadenas: number;
}

export interface ProductoCanasta {
  ean: string;
  clase_coicop: string | null;
  var_pct: number | null;
  n_cadenas: number;
  /** El INDEC publica la clase del producto: entra en la comparación. */
  comparable: boolean;
}

export interface ResultadoCanasta {
  desde: string;
  hasta: string;
  productos: ProductoCanasta[];
  canasta: { var_pct: number; n: number } | null;
  comparacion: {
    canasta_var: number;
    indec_var: number;
    diferencia: number;
    n: number;
  } | null;
  /** Por qué no hay canasta o comparación (null si hay ambas). */
  motivo: string | null;
}

/** Respuesta de /api/canasta. */
export type RespuestaCanasta =
  | ({ disponible: true } & ResultadoCanasta)
  | { disponible: false; motivo: string };

/** Suma (o resta) meses a un período AAAA-MM-01. */
export function sumarMeses(periodo: string, meses: number): string {
  const [y, m] = periodo.split("-").map(Number);
  const total = y * 12 + (m - 1) + meses;
  const mes = (total % 12) + 1;
  return `${Math.floor(total / 12)}-${String(mes).padStart(2, "0")}-01`;
}

/** "2026-07-01" -> "jul 2026". */
export function fmtMes(periodo: string): string {
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const [y, m] = periodo.split("-").map(Number);
  return `${meses[m - 1]} ${y}`;
}

function aPct(l: number): number {
  return Math.round((Math.exp(l) - 1) * 1000) / 10;
}

function media(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/**
 * @param eans      productos de la canasta, en el orden elegido
 * @param relativos relativos de los productos con precio en los dos meses
 * @param indecLn   ln(I_hasta / I_desde) del INDEC por clase, solo las que publica con los dos meses
 * @param indecPublica clases para las que el INDEC publica serie (aunque falten meses)
 */
export function calcularCanasta(
  eans: string[],
  relativos: RelativoProducto[],
  indecLn: Map<string, number>,
  indecPublica: Set<string>,
  desde: string,
  hasta: string,
  ultimoMesIndec: string | null,
): ResultadoCanasta {
  const porEan = new Map(relativos.map((r) => [r.ean, r]));
  const productos: ProductoCanasta[] = eans.map((ean) => {
    const r = porEan.get(ean);
    return {
      ean,
      clase_coicop: r?.clase_coicop ?? null,
      var_pct: r ? aPct(r.l) : null,
      n_cadenas: r?.n_cadenas ?? 0,
      comparable: !!r?.clase_coicop && indecLn.has(r.clase_coicop),
    };
  });

  const conDatos = eans.map((e) => porEan.get(e)).filter((r): r is RelativoProducto => !!r);
  if (conDatos.length === 0) {
    return {
      desde, hasta, productos, canasta: null, comparacion: null,
      motivo: `Ningún producto de tu canasta tiene precios en ${fmtMes(desde)} y en ${fmtMes(hasta)}.`,
    };
  }
  const canasta = { var_pct: aPct(media(conDatos.map((r) => r.l))), n: conDatos.length };

  const comparables = conDatos.filter((r) => r.clase_coicop && indecLn.has(r.clase_coicop));
  if (comparables.length === 0) {
    const conClasePublicada = conDatos.some((r) => r.clase_coicop && indecPublica.has(r.clase_coicop));
    const motivo =
      conClasePublicada && (!ultimoMesIndec || ultimoMesIndec < hasta)
        ? `La serie del INDEC cargada llega a ${ultimoMesIndec ? fmtMes(ultimoMesIndec) : "ningún mes"}: falta ${fmtMes(hasta)} para comparar.`
        : "Ningún producto de tu canasta es de una clase que el INDEC publique por separado.";
    return { desde, hasta, productos, canasta, comparacion: null, motivo };
  }

  const canastaVar = aPct(media(comparables.map((r) => r.l)));
  const indecVar = aPct(media(comparables.map((r) => indecLn.get(r.clase_coicop!)!)));
  return {
    desde,
    hasta,
    productos,
    canasta,
    comparacion: {
      canasta_var: canastaVar,
      indec_var: indecVar,
      diferencia: Math.round((canastaVar - indecVar) * 10) / 10,
      n: comparables.length,
    },
    motivo: null,
  };
}
