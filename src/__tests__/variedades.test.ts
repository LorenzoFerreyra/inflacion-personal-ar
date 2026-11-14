import { describe, it, expect } from "vitest";
import {
  agruparVariedades,
  diferenciaNivel,
  fmtPesos,
  puntoDe,
  ultimoMesConDatos,
  type FilaVariedad,
} from "@/lib/variedades";

function fila(id: string, periodo: string, indec: number | null, mediana: number | null): FilaVariedad {
  return {
    id,
    nombre: id === "yerba_mate" ? "Yerba mate" : "Aceite de girasol",
    unidad: id === "yerba_mate" ? "500 g" : "Bot. 1,5 litros",
    sin_reglas: null,
    periodo,
    precio_indec: indec,
    var_indec: null,
    precio_p25: mediana === null ? null : mediana * 0.9,
    precio_mediana: mediana,
    precio_p75: mediana === null ? null : mediana * 1.1,
    var_super: null,
    n_productos: mediana === null ? null : 10,
    n_cadenas: mediana === null ? null : 4,
    n_pares: null,
  };
}

describe("agruparVariedades", () => {
  it("groups rows by variety, sorted by name and month", () => {
    const vs = agruparVariedades([
      fila("yerba_mate", "2026-10-01", 2720, 2546),
      fila("aceite_de_girasol", "2026-09-01", 7000, 6900),
      fila("yerba_mate", "2026-09-01", 2650, 2500),
    ]);
    expect(vs.map((v) => v.id)).toEqual(["aceite_de_girasol", "yerba_mate"]);
    expect(vs[1].puntos.map((p) => p.periodo)).toEqual(["2026-09-01", "2026-10-01"]);
    expect(vs[1]).toMatchObject({ nombre: "Yerba mate", unidad: "500 g", sin_reglas: null });
    expect(puntoDe(vs[1], "2026-10-01")?.precio_mediana).toBe(2546);
    expect(puntoDe(vs[1], "2026-05-01")).toBeNull();
  });
});

describe("diferenciaNivel", () => {
  it("is the percent gap of the supermarket median over the INDEC price", () => {
    expect(diferenciaNivel(2546, 2720)).toBe(-6);
    expect(diferenciaNivel(4200, 2212)).toBe(90);
  });

  it("is null without both prices", () => {
    expect(diferenciaNivel(null, 2720)).toBeNull();
    expect(diferenciaNivel(2546, null)).toBeNull();
  });
});

describe("ultimoMesConDatos", () => {
  it("is the latest month with INDEC and supermarket prices", () => {
    const vs = agruparVariedades([
      fila("yerba_mate", "2026-10-01", 2720, null),
      fila("yerba_mate", "2026-09-01", 2650, 2500),
      fila("aceite_de_girasol", "2026-08-01", 7000, 6900),
    ]);
    expect(ultimoMesConDatos(vs)).toBe("2026-09-01");
  });
});

describe("fmtPesos", () => {
  it("formats whole pesos", () => {
    expect(fmtPesos(2078.53)).toBe(`$ ${(2079).toLocaleString("es-AR")}`);
    expect(fmtPesos(null)).toBe("—");
  });
});
