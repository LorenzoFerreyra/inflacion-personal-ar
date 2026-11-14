/**
 * indices.ts — Comparación de los índices propios con el IPC del INDEC.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  Qué se compara                                                      │
 * │                                                                      │
 * │  El pipeline (repo scrapers-uflo, load/coicop_pg.py) calcula un     │
 * │  índice por clase COICOP y por mes calendario, y agrega grupos y    │
 * │  divisiones con los ponderadores del INDEC para GBA. Acá se pone    │
 * │  cada serie al lado de la serie del INDEC con el mismo código, la   │
 * │  misma región y los mismos meses. Nunca contra el nivel general.    │
 * │                                                                      │
 * │  Una serie no se compara cuando:                                    │
 * │  - es una clase que el INDEC no publica (01.1.3, 01.1.9, ...);      │
 * │  - es un grupo o división que nuestros productos no cubren entero:  │
 * │    05.6 y 12.1 incluyen servicios (servicio doméstico, peluquería)  │
 * │    y 02 incluye tabaco.                                             │
 * │                                                                      │
 * │  Para el gráfico, la serie del INDEC se lleva a la misma base que   │
 * │  la nuestra (primer mes = 100). Las variaciones mensuales se        │
 * │  comparan tal como las publica el INDEC.                             │
 * └──────────────────────────────────────────────────────────────────────┘
 */

export const REGION_INDEC = "GBA";

/** Un agregado se compara solo si nuestras clases cubren todo su ponderador. */
const COBERTURA_COMPLETA = 0.999;

/**
 * Divisiones COICOP que no publicamos: el observatorio mide supermercados, y lo
 * poco que hay de estas en la góndola no alcanza para un índice que valga.
 * 06 = Salud (medicamentos y servicios médicos van por farmacia y prestadores).
 */
export const DIVISIONES_EXCLUIDAS = new Set(["06"]);

/** Grupos del INDEC con servicios que un supermercado no vende. */
const SERVICIOS: Record<string, string> = {
  "05.6": "servicio doméstico",
  "12.1": "peluquería y otros servicios de cuidado personal",
};

export type NivelCoicop = "Clase" | "Grupo" | "Division";

/** Fila de indice_clase_mensual o indice_agregado_mensual. */
export interface FilaIndicePropio {
  codigo: string;
  nombre: string;
  nivel: NivelCoicop;
  periodo: string; // AAAA-MM-01
  indice: number;
  var_mensual: number | null;
  n_pares: number | null;
  n_productos: number | null;
  n_cadenas: number | null;
  cobertura: number | null; // solo agregados
}

/** Fila de indec_ipc para la región de comparación. */
export interface FilaIndec {
  codigo: string;
  periodo: string;
  indice: number | null;
  var_mensual: number | null;
}

export interface PuntoComparado {
  periodo: string;
  propio: number;
  propio_var: number | null;
  /** Índice del INDEC llevado a nuestra base; null si falta el mes o la base. */
  indec: number | null;
  indec_var: number | null;
  n_pares: number | null;
  n_productos: number | null;
  n_cadenas: number | null;
}

export interface SerieComparada {
  codigo: string;
  nombre: string;
  nivel: NivelCoicop;
  cobertura: number | null;
  /** Si la serie del INDEC con el mismo código mide lo mismo que la nuestra. */
  comparable: boolean;
  /** Por qué no es comparable (null si lo es). */
  motivo: string | null;
  puntos: PuntoComparado[];
}

export interface ComparacionIndices {
  region: string;
  base: string | null;
  ultimoMesPropio: string | null;
  ultimoMesIndec: string | null;
  series: SerieComparada[];
}

function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

/** Por qué una serie no es comparable con la del INDEC, o null si lo es. */
export function motivoNoComparable(
  codigo: string,
  nivel: NivelCoicop,
  cobertura: number | null,
  indecPublica: boolean,
): string | null {
  if (nivel === "Clase") {
    return indecPublica
      ? null
      : "El INDEC no publica una serie mensual para esta clase: entra solo en los agregados.";
  }
  if (cobertura !== null && cobertura < COBERTURA_COMPLETA) {
    const servicio = SERVICIOS[codigo];
    const resto = servicio
      ? ` El resto incluye ${servicio}, que un supermercado no vende.`
      : " El resto son bienes o servicios que no relevamos.";
    return `Nuestros productos cubren el ${pct(cobertura)} del ponderador del INDEC para esta apertura.${resto}`;
  }
  return indecPublica ? null : "El INDEC no publica una serie mensual para esta apertura.";
}

/**
 * Índice del INDEC en nuestra base: 100 · I(t) / I(base).
 * Vacío si el INDEC no tiene el mes base, porque sin él no hay forma de alinear.
 */
export function rebasar(indec: FilaIndec[], base: string): Map<string, number> {
  const fila = indec.find((f) => f.periodo === base && f.indice !== null);
  const out = new Map<string, number>();
  if (!fila || !fila.indice) return out;
  for (const f of indec) {
    if (f.indice !== null && f.periodo >= base) {
      out.set(f.periodo, (100 * f.indice) / fila.indice);
    }
  }
  return out;
}

/**
 * Arma cada serie propia con su par del INDEC (mismo código, misma región).
 *
 * @param indec      serie del INDEC desde nuestro mes base
 * @param publicadas códigos con serie del INDEC en la región, en cualquier mes:
 *                   que falten los meses recientes no cambia que la serie exista
 */
export function compararIndices(
  propios: FilaIndicePropio[],
  indec: FilaIndec[],
  publicadas: Set<string>,
  ultimoMesIndec: string | null,
  region = REGION_INDEC,
): ComparacionIndices {
  const indecPorCodigo = new Map<string, FilaIndec[]>();
  for (const f of indec) {
    const lista = indecPorCodigo.get(f.codigo) ?? [];
    lista.push(f);
    indecPorCodigo.set(f.codigo, lista);
  }

  const propiosPorCodigo = new Map<string, FilaIndicePropio[]>();
  for (const f of propios) {
    const lista = propiosPorCodigo.get(f.codigo) ?? [];
    lista.push(f);
    propiosPorCodigo.set(f.codigo, lista);
  }

  const series: SerieComparada[] = [];
  for (const [codigo, filas] of propiosPorCodigo) {
    if (DIVISIONES_EXCLUIDAS.has(codigo.split(".")[0])) continue;
    // Sin ninguna variación mensual todavía no hay nada que mostrar.
    if (!filas.some((f) => f.var_mensual !== null)) continue;
    filas.sort((a, b) => a.periodo.localeCompare(b.periodo));
    const primera = filas[0];
    const indecSerie = indecPorCodigo.get(codigo) ?? [];
    const motivo = motivoNoComparable(codigo, primera.nivel, primera.cobertura, publicadas.has(codigo));
    const comparable = motivo === null;
    const rebasado = comparable ? rebasar(indecSerie, primera.periodo) : new Map<string, number>();
    const varIndec = new Map(indecSerie.map((f) => [f.periodo, f.var_mensual]));

    series.push({
      codigo,
      nombre: primera.nombre,
      nivel: primera.nivel,
      cobertura: primera.cobertura,
      comparable,
      motivo,
      puntos: filas.map((f) => ({
        periodo: f.periodo,
        propio: f.indice,
        propio_var: f.var_mensual,
        indec: rebasado.get(f.periodo) ?? null,
        indec_var: comparable ? (varIndec.get(f.periodo) ?? null) : null,
        n_pares: f.n_pares,
        n_productos: f.n_productos,
        n_cadenas: f.n_cadenas,
      })),
    });
  }

  series.sort((a, b) => a.codigo.localeCompare(b.codigo));
  const periodos = series.flatMap((x) => x.puntos.map((p) => p.periodo)).sort();
  return {
    region,
    base: periodos[0] ?? null,
    ultimoMesPropio: periodos.at(-1) ?? null,
    ultimoMesIndec,
    series,
  };
}

/** Último mes con variación propia y del INDEC, o null si no hay ninguno. */
export function ultimoMesEnComun(serie: SerieComparada): PuntoComparado | null {
  for (let i = serie.puntos.length - 1; i >= 0; i--) {
    const p = serie.puntos[i];
    if (p.propio_var !== null && p.indec_var !== null) return p;
  }
  return null;
}

/**
 * Mes para el resumen: el último en que alguna serie comparable tiene
 * variación propia y del INDEC. Todas las filas del resumen usan ese mismo mes.
 */
export function mesDeComparacion(data: ComparacionIndices): string | null {
  let mes: string | null = null;
  for (const s of data.series) {
    if (!s.comparable) continue;
    const p = ultimoMesEnComun(s);
    if (p && (mes === null || p.periodo > mes)) mes = p.periodo;
  }
  return mes;
}

/** Diferencia en puntos porcentuales, redondeada a un decimal. */
export function diferenciaPp(propio: number, indec: number): number {
  return Math.round((propio - indec) * 10) / 10;
}
