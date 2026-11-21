import { describe, it, expect, beforeEach } from "vitest";
import {
  STORAGE_KEY,
  MAX_CANASTAS,
  MAX_RESULTADOS,
  leerCanastas,
  guardarCanasta,
  agregarResultado,
  actualizarEans,
  borrarCanasta,
  mismosEans,
  eansDesdeUrl,
  urlCompartir,
  type ResultadoGuardado,
} from "@/lib/canastasGuardadas";

class MemStore {
  data = new Map<string, string>();
  failWrites = false;
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    if (this.failWrites) throw new Error("QuotaExceeded");
    this.data.set(k, v);
  }
}

function res(var_pct: number, fecha = "2026-11-01T00:00:00.000Z"): ResultadoGuardado {
  return { fecha, periodo: "mensual", desde: "2026-09-01", hasta: "2026-10-01", var_pct, indec_var: 2.1 };
}

let store: MemStore;
beforeEach(() => {
  store = new MemStore();
});

describe("leerCanastas", () => {
  it("returns [] without storage, empty key or broken JSON", () => {
    expect(leerCanastas(null)).toEqual([]);
    expect(leerCanastas(store)).toEqual([]);
    store.data.set(STORAGE_KEY, "{nope");
    expect(leerCanastas(store)).toEqual([]);
    store.data.set(STORAGE_KEY, '{"a":1}');
    expect(leerCanastas(store)).toEqual([]);
  });

  it("drops malformed entries and keeps valid ones", () => {
    const ok = guardarCanasta(store, { nombre: "Súper", eans: ["779123"] })!;
    const raw = JSON.parse(store.data.get(STORAGE_KEY)!);
    raw.push({ id: "x", nombre: "mala", eans: ["DROP TABLE"], creada: "", resultados: [] });
    raw.push({ id: "y", nombre: "sin eans", eans: [], creada: "", resultados: [] });
    store.data.set(STORAGE_KEY, JSON.stringify(raw));
    expect(leerCanastas(store).map((c) => c.id)).toEqual([ok.id]);
  });
});

describe("guardarCanasta", () => {
  it("saves newest first, dedupes and filters invalid EANs", () => {
    guardarCanasta(store, { nombre: "Primera", eans: ["1"] });
    const c = guardarCanasta(store, {
      nombre: "  Segunda  ",
      eans: ["2", "2", "bad", "INDEC-pan"],
      resultado: res(3.4),
    })!;
    expect(c.nombre).toBe("Segunda");
    expect(c.eans).toEqual(["2", "INDEC-pan"]);
    expect(c.resultados).toHaveLength(1);
    expect(leerCanastas(store).map((x) => x.nombre)).toEqual(["Segunda", "Primera"]);
  });

  it("uses a default name and rejects empty baskets", () => {
    expect(guardarCanasta(store, { nombre: "   ", eans: ["1"] })!.nombre).toBe("Mi canasta");
    expect(guardarCanasta(store, { nombre: "x", eans: ["nope"] })).toBeNull();
  });

  it("caps the number of baskets, dropping the oldest", () => {
    for (let i = 0; i < MAX_CANASTAS + 3; i++) guardarCanasta(store, { nombre: `c${i}`, eans: ["1"] });
    const todas = leerCanastas(store);
    expect(todas).toHaveLength(MAX_CANASTAS);
    expect(todas[0].nombre).toBe(`c${MAX_CANASTAS + 2}`);
  });

  it("returns null when the write fails", () => {
    store.failWrites = true;
    expect(guardarCanasta(store, { nombre: "x", eans: ["1"] })).toBeNull();
  });
});

describe("agregarResultado / actualizarEans / borrarCanasta", () => {
  it("replaces a result for the same period and months instead of duplicating", () => {
    const c = guardarCanasta(store, { nombre: "x", eans: ["1"], resultado: res(1) })!;
    agregarResultado(store, c.id, res(2));
    expect(leerCanastas(store)[0].resultados.map((r) => r.var_pct)).toEqual([2]);
    agregarResultado(store, c.id, { ...res(5), desde: "2026-10-01", hasta: "2026-11-01" });
    expect(leerCanastas(store)[0].resultados.map((r) => r.var_pct)).toEqual([5, 2]);
  });

  it("prepends results and caps history", () => {
    const c = guardarCanasta(store, { nombre: "x", eans: ["1"] })!;
    for (let i = 0; i < MAX_RESULTADOS + 2; i++)
      agregarResultado(store, c.id, { ...res(i), desde: `m${i}` });
    const r = leerCanastas(store)[0].resultados;
    expect(r).toHaveLength(MAX_RESULTADOS);
    expect(r[0].var_pct).toBe(MAX_RESULTADOS + 1);
    expect(agregarResultado(store, "missing", res(1))).toBeNull();
  });

  it("replaces products keeping results", () => {
    const c = guardarCanasta(store, { nombre: "x", eans: ["1"], resultado: res(1) })!;
    const u = actualizarEans(store, c.id, ["1", "2"])!;
    expect(u.eans).toEqual(["1", "2"]);
    expect(u.resultados).toHaveLength(1);
  });

  it("deletes by id", () => {
    const a = guardarCanasta(store, { nombre: "a", eans: ["1"] })!;
    guardarCanasta(store, { nombre: "b", eans: ["2"] });
    expect(borrarCanasta(store, a.id).map((c) => c.nombre)).toEqual(["b"]);
    expect(leerCanastas(store)).toHaveLength(1);
  });
});

describe("helpers", () => {
  it("mismosEans ignores order", () => {
    expect(mismosEans(["1", "2"], ["2", "1"])).toBe(true);
    expect(mismosEans(["1", "2"], ["1"])).toBe(false);
    expect(mismosEans(["1", "2"], ["1", "3"])).toBe(false);
  });

  it("round-trips EANs through the share URL", () => {
    const url = urlCompartir("https://x.ar", "/", ["779", "INDEC-pan"]);
    expect(url).toBe("https://x.ar/?eans=779,INDEC-pan");
    expect(eansDesdeUrl(new URL(url).search)).toEqual(["779", "INDEC-pan"]);
    expect(eansDesdeUrl("?eans=1,1,<script>,2")).toEqual(["1", "2"]);
    expect(eansDesdeUrl("")).toEqual([]);
  });
});
