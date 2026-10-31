import { describe, it, expect, vi } from "vitest";

/**
 * Tests del algoritmo de recomendación con la capa de datos mockeada.
 * Cubre el manejo de productos casi iguales: por cada keyword se elige
 * la variante más barata por cadena, nunca se suman variantes.
 */

vi.mock("@/lib/database", () => ({
  getLatestDate: () => "2026-07-11",
  getProducts: ({ eans }: { eans: string[] }) => ({
    products: eans.map((ean) => ({
      ean,
      product_description: `Producto ${ean}`,
      marca: "Marca",
      categoria: "Almacén",
      precio_actual: 0,
      variacion_pct: null,
      cobertura_cadenas: 1,
      image_url: null,
    })),
    total: eans.length,
  }),
  // arroz: variantes A1 (cara) y A2 (barata). aceite: variante B1.
  // coto tiene todo; dia tiene solo la variante cara de arroz; extra no tiene arroz.
  getLatestChainPricesByEan: () => [
    { ean: "A1", cadena: "coto", precio: 2000 },
    { ean: "A2", cadena: "coto", precio: 1500 },
    { ean: "B1", cadena: "coto", precio: 3000 },
    { ean: "A1", cadena: "dia", precio: 1800 },
    { ean: "B1", cadena: "dia", precio: 2500 },
    { ean: "B1", cadena: "extra", precio: 1000 },
  ],
  getBranches: () => [
    {
      cadena: "coto",
      formato: "super",
      direccion: "Av. Rivadavia 5000",
      latitud: -34.62,
      longitud: -58.43,
      provincia: "CABA",
      localidad: "Caballito",
    },
    {
      cadena: "dia",
      formato: "super",
      direccion: "Av. San Martín 3000",
      latitud: -34.6,
      longitud: -58.47,
      provincia: "CABA",
      localidad: "Paternal",
    },
    // extra no tiene sucursales con coordenadas
    {
      cadena: "extra",
      formato: "super",
      direccion: "Sin geo",
      latitud: null,
      longitud: null,
      provincia: "CABA",
      localidad: "Otro",
    },
  ],
}));

import { recommend, haversineKm } from "@/lib/chat/recommend";

const PEDIDO = [
  { keyword: "arroz", eans: ["A1", "A2"] },
  { keyword: "aceite", eans: ["B1"] },
];

describe("recommend — variantes casi iguales", () => {
  it("elige la variante más barata de cada keyword por cadena", async () => {
    const rec = await recommend(PEDIDO);
    const coto = rec.cadenas.find((c) => c.cadena === "coto")!;
    const arroz = coto.productos.find((p) => p.keyword === "arroz")!;
    // coto tiene A1 ($2000) y A2 ($1500): debe elegir A2
    expect(arroz.ean).toBe("A2");
    expect(arroz.precio).toBe(1500);
    // total = arroz barato + aceite, NO la suma de las tres filas
    expect(coto.total_precio).toBe(1500 + 3000);
  });

  it("faltantes son keywords sin ninguna variante, no EANs", async () => {
    const rec = await recommend(PEDIDO);
    const extra = rec.cadenas.find((c) => c.cadena === "extra")!;
    expect(extra.faltantes).toEqual(["arroz"]);
    expect(extra.productos.map((p) => p.keyword)).toEqual(["aceite"]);
  });

  it("una cadena con una sola variante de la keyword no registra faltante", async () => {
    const rec = await recommend(PEDIDO);
    const dia = rec.cadenas.find((c) => c.cadena === "dia")!;
    expect(dia.faltantes).toEqual([]);
    expect(dia.total_precio).toBe(1800 + 2500);
  });

  it("rankea primero por cobertura de keywords, después por score", async () => {
    const rec = await recommend(PEDIDO);
    // coto ($4500) y dia ($4300) cubren 2 keywords; extra solo 1
    expect(rec.cadenas.map((c) => c.cadena)).toEqual(["dia", "coto", "extra"]);
  });

  it("sin ubicación no hay sucursal cercana y se rankea solo por precio", async () => {
    const rec = await recommend(PEDIDO);
    expect(rec.cadenas.every((c) => c.sucursal_cercana === null)).toBe(true);
    expect(rec.fecha_precios).toBe("2026-07-11");
  });

  it("con ubicación asigna la sucursal más cercana y respeta el radio", async () => {
    // Usuario en Caballito: coto a ~0km, dia a ~4km
    const rec = await recommend(PEDIDO, -34.62, -58.43, "distance", 2);
    const coto = rec.cadenas.find((c) => c.cadena === "coto")!;
    expect(coto.sucursal_cercana?.direccion).toBe("Av. Rivadavia 5000");
    expect(coto.sucursal_cercana?.distancia_km).toBeLessThan(1);
    // dia queda fuera del radio de 2km y tiene coordenadas → se descarta
    expect(rec.cadenas.find((c) => c.cadena === "dia")).toBeUndefined();
    // extra no tiene geo → sigue como candidata rankeada por precio
    expect(rec.cadenas.find((c) => c.cadena === "extra")).toBeDefined();
  });

  it("pedido vacío devuelve sin cadenas", async () => {
    expect((await recommend([])).cadenas).toEqual([]);
    expect((await recommend([{ keyword: "arroz", eans: [] }])).cadenas).toEqual([]);
  });
});

describe("haversineKm", () => {
  it("Obelisco a Caballito ~5km", async () => {
    const d = haversineKm(-34.6037, -58.3816, -34.6187, -58.4409);
    expect(d).toBeGreaterThan(4);
    expect(d).toBeLessThan(7);
  });
});
