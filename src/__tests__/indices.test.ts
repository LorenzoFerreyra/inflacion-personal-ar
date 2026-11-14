import { describe, it, expect } from "vitest";
import {
  compararIndices,
  diferenciaPp,
  mesDeComparacion,
  motivoNoComparable,
  rebasar,
  ultimoMesEnComun,
  type FilaIndec,
  type FilaIndicePropio,
} from "@/lib/indices";

function propio(
  codigo: string,
  periodo: string,
  indice: number,
  var_mensual: number | null,
  extra: Partial<FilaIndicePropio> = {},
): FilaIndicePropio {
  return {
    codigo,
    nombre: `Serie ${codigo}`,
    nivel: codigo.split(".").length === 3 ? "Clase" : codigo.includes(".") ? "Grupo" : "Division",
    periodo,
    indice,
    var_mensual,
    n_pares: 100,
    n_productos: 50,
    n_cadenas: 5,
    cobertura: codigo.split(".").length === 3 ? null : 1,
    ...extra,
  };
}

const JUL = "2026-07-01";
const AGO = "2026-08-01";
const SEP = "2026-09-01";

describe("motivoNoComparable", () => {
  it("compares a class the INDEC publishes", () => {
    expect(motivoNoComparable("01.1.4", "Clase", null, true)).toBeNull();
  });

  it("rejects a class the INDEC does not publish", () => {
    expect(motivoNoComparable("01.1.9", "Clase", null, false)).toMatch(/no publica/);
  });

  it("rejects groups with services the supermarket does not sell", () => {
    const motivo = motivoNoComparable("05.6", "Grupo", 0.456, true);
    expect(motivo).toMatch(/46%/);
    expect(motivo).toMatch(/servicio doméstico/);
    expect(motivoNoComparable("12.1", "Grupo", 0.699, true)).toMatch(/peluquería/);
  });

  it("rejects divisions we only partly cover", () => {
    expect(motivoNoComparable("02", "Division", 0.434, true)).toMatch(/43%/);
  });

  it("compares a fully covered aggregate", () => {
    expect(motivoNoComparable("01", "Division", 1, true)).toBeNull();
    expect(motivoNoComparable("01.1", "Grupo", 0.9999, true)).toBeNull();
  });
});

describe("rebasar", () => {
  const indec: FilaIndec[] = [
    { codigo: "01", periodo: "2026-06-01", indice: 90, var_mensual: 2 },
    { codigo: "01", periodo: JUL, indice: 120, var_mensual: 2 },
    { codigo: "01", periodo: AGO, indice: 123, var_mensual: 2.5 },
  ];

  it("takes our first month as 100 and drops earlier months", () => {
    const r = rebasar(indec, JUL);
    expect(r.get(JUL)).toBe(100);
    expect(r.get(AGO)).toBeCloseTo(102.5);
    expect(r.has("2026-06-01")).toBe(false);
  });

  it("returns nothing when the INDEC lacks the base month", () => {
    expect(rebasar(indec, SEP).size).toBe(0);
  });
});

describe("compararIndices", () => {
  const propios = [
    propio("01", AGO, 101, 1),
    propio("01", JUL, 100, null),
    propio("01.1.9", JUL, 100, null),
    propio("01.1.9", AGO, 102, 2),
  ];
  const indec: FilaIndec[] = [
    { codigo: "01", periodo: JUL, indice: 200, var_mensual: 1.5 },
    { codigo: "01", periodo: AGO, indice: 204, var_mensual: 2 },
  ];

  it("pairs each series with the INDEC series of the same code", () => {
    const c = compararIndices(propios, indec, new Set(["01"]), AGO);
    expect(c.base).toBe(JUL);
    expect(c.ultimoMesPropio).toBe(AGO);
    expect(c.series.map((s) => s.codigo)).toEqual(["01", "01.1.9"]);

    const div = c.series[0];
    expect(div.comparable).toBe(true);
    expect(div.puntos.map((p) => p.periodo)).toEqual([JUL, AGO]);
    expect(div.puntos[1]).toMatchObject({ propio: 101, propio_var: 1, indec_var: 2 });
    expect(div.puntos[1].indec).toBeCloseTo(102);
  });

  it("never pairs a class the INDEC does not publish", () => {
    const clase = compararIndices(propios, indec, new Set(["01"]), AGO).series[1];
    expect(clase.comparable).toBe(false);
    expect(clase.puntos.every((p) => p.indec === null && p.indec_var === null)).toBe(true);
  });

  it("does not compare a covered-in-part aggregate even if the INDEC publishes it", () => {
    const c = compararIndices(
      [propio("05.6", JUL, 100, null, { cobertura: 0.456 }), propio("05.6", AGO, 101, 1, { cobertura: 0.456 })],
      [{ codigo: "05.6", periodo: AGO, indice: 1, var_mensual: 3 }],
      new Set(["05.6"]),
      AGO,
    );
    expect(c.series[0].comparable).toBe(false);
    expect(c.series[0].puntos[1].indec_var).toBeNull();
  });

  it("leaves out Salud and series without any monthly variation", () => {
    const c = compararIndices(
      [
        ...propios,
        propio("06", JUL, 100, null),
        propio("06", AGO, 103, 3),
        propio("06.1.1", AGO, 100, null),
        propio("09", AGO, 100, null),
      ],
      indec,
      new Set(["01", "06", "09"]),
      AGO,
    );
    expect(c.series.map((s) => s.codigo)).toEqual(["01", "01.1.9"]);
  });

  it("keeps a published series comparable when its recent months are missing", () => {
    // La serie cargada llega a mayo y la nuestra empieza en julio: el INDEC
    // publica la apertura, solo que todavía no hay meses en común.
    const c = compararIndices(propios, [], new Set(["01"]), "2026-05-01");
    expect(c.series[0]).toMatchObject({ codigo: "01", comparable: true, motivo: null });
    expect(c.series.every((s) => s.puntos.every((p) => p.indec_var === null))).toBe(true);
    expect(mesDeComparacion(c)).toBeNull();
  });
});

describe("ultimoMesEnComun y mesDeComparacion", () => {
  it("use the latest month with both variations", () => {
    const c = compararIndices(
      [propio("01", JUL, 100, null), propio("01", AGO, 101, 1), propio("01", SEP, 102, 1)],
      [
        { codigo: "01", periodo: JUL, indice: 100, var_mensual: 2 },
        { codigo: "01", periodo: AGO, indice: 102, var_mensual: 2 },
      ],
      new Set(["01"]),
      AGO,
    );
    expect(ultimoMesEnComun(c.series[0])?.periodo).toBe(AGO);
    expect(mesDeComparacion(c)).toBe(AGO);
  });
});

describe("diferenciaPp", () => {
  it("rounds to one decimal", () => {
    expect(diferenciaPp(0.77, 1.4)).toBe(-0.6);
    expect(diferenciaPp(2.26, 1)).toBe(1.3);
  });
});
