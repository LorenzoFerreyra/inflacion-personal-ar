import { describe, it, expect } from "vitest";
import { matchTier } from "@/lib/chat/search-products";

describe("matchTier (re-ranking del buscador del chat)", () => {
  it("prioriza el producto que es lo pedido", () => {
    expect(matchTier("azúcar ledesma 1 kg", "azucar")).toBe(0);
    expect(matchTier("yerba mate amanda 500 gr", "yerba")).toBe(0);
    expect(matchTier("carne picada común x kg", "carne picada")).toBe(0);
  });

  it("palabra completa en el medio es tier 1", () => {
    expect(matchTier("galletitas de arroz gallo", "arroz")).toBe(1);
  });

  it("parte de otra palabra es tier 2", () => {
    expect(matchTier("bizcochos 9 de oro azucarados 210 g", "azúcar")).toBe(2);
  });

  it("tolera plural y singular", () => {
    expect(matchTier("huevo blanco x 12", "huevos")).toBe(0);
    expect(matchTier("tomate perita lata", "tomates")).toBe(0);
    expect(matchTier("limones x kg", "limón")).toBe(0);
    expect(matchTier("fideos tirabuzón", "fideo")).toBe(0);
  });
});
