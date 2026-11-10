import { describe, it, expect } from "vitest";
import { calcularCanasta, fmtMes, sumarMeses, type RelativoProducto } from "@/lib/canasta";

const AGO = "2026-08-01";
const SEP = "2026-09-01";

function rel(ean: string, clase: string | null, factor: number): RelativoProducto {
  return { ean, clase_coicop: clase, l: Math.log(factor), n_cadenas: 2 };
}

describe("sumarMeses y fmtMes", () => {
  it("move across years", () => {
    expect(sumarMeses("2026-10-01", -3)).toBe("2026-07-01");
    expect(sumarMeses("2026-01-01", -1)).toBe("2025-12-01");
    expect(sumarMeses("2026-10-01", -12)).toBe("2025-10-01");
    expect(sumarMeses("2026-11-01", 2)).toBe("2027-01-01");
  });

  it("formats in Spanish", () => {
    expect(fmtMes("2026-07-01")).toBe("jul 2026");
    expect(fmtMes("2025-12-01")).toBe("dic 2025");
  });
});

describe("calcularCanasta", () => {
  const publicadas = new Set(["01.1.4", "01.1.1"]);

  it("uses the geometric mean of products and the INDEC of the same classes", () => {
    const r = calcularCanasta(
      ["leche", "pan"],
      [rel("leche", "01.1.4", 1.02), rel("pan", "01.1.1", 1.08)],
      new Map([["01.1.4", Math.log(1.01)], ["01.1.1", Math.log(1.03)]]),
      publicadas,
      AGO,
      SEP,
      SEP,
    );
    // sqrt(1.02 * 1.08) = 1.0496; sqrt(1.01 * 1.03) = 1.01995
    expect(r.canasta).toEqual({ var_pct: 5, n: 2 });
    expect(r.comparacion).toEqual({ canasta_var: 5, indec_var: 2, diferencia: 3, n: 2 });
    expect(r.motivo).toBeNull();
  });

  it("leaves out of the comparison the products of classes the INDEC does not publish", () => {
    const r = calcularCanasta(
      ["leche", "snack"],
      [rel("leche", "01.1.4", 1.02), rel("snack", "01.1.9", 1.5)],
      new Map([["01.1.4", Math.log(1.01)]]),
      publicadas,
      AGO,
      SEP,
      SEP,
    );
    expect(r.canasta?.n).toBe(2);
    expect(r.comparacion).toEqual({ canasta_var: 2, indec_var: 1, diferencia: 1, n: 1 });
    expect(r.productos.find((p) => p.ean === "snack")?.comparable).toBe(false);
  });

  it("explains when the INDEC series does not reach the month yet", () => {
    const r = calcularCanasta(
      ["leche"],
      [rel("leche", "01.1.4", 1.02)],
      new Map(),
      publicadas,
      AGO,
      SEP,
      "2026-05-01",
    );
    expect(r.canasta?.var_pct).toBe(2);
    expect(r.comparacion).toBeNull();
    expect(r.motivo).toMatch(/llega a may 2026: falta sep 2026/);
  });

  it("explains when no product is of a published class", () => {
    const r = calcularCanasta(["snack"], [rel("snack", "01.1.9", 1.1)], new Map(), publicadas, AGO, SEP, SEP);
    expect(r.comparacion).toBeNull();
    expect(r.motivo).toMatch(/publique por separado/);
  });

  it("keeps products without prices in both months, with no variation", () => {
    const r = calcularCanasta(
      ["leche", "nuevo"],
      [rel("leche", "01.1.4", 1.02)],
      new Map([["01.1.4", Math.log(1.01)]]),
      publicadas,
      AGO,
      SEP,
      SEP,
    );
    expect(r.productos.map((p) => [p.ean, p.var_pct])).toEqual([["leche", 2], ["nuevo", null]]);
    expect(r.canasta?.n).toBe(1);
  });

  it("returns no basket when no product has prices in both months", () => {
    const r = calcularCanasta(["nuevo"], [], new Map(), publicadas, AGO, SEP, SEP);
    expect(r.canasta).toBeNull();
    expect(r.motivo).toMatch(/Ningún producto/);
  });
});
