import { describe, it, expect } from "vitest";
import { chainColor, chainLabel } from "@/lib/chainColors";

describe("chainColor", () => {
  it("returns a hex color string", () => {
    const color = chainColor("carrefour");
    expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it("returns the same color for the same input", () => {
    const a = chainColor("carrefour");
    const b = chainColor("carrefour");
    expect(a).toBe(b);
  });

  it("returns different colors for different inputs", () => {
    // Not guaranteed to differ for every pair due to palette size,
    // but commonly different names should hash differently.
    const colors = new Set([
      chainColor("carrefour"),
      chainColor("dia"),
      chainColor("coto"),
      chainColor("jumbo"),
      chainColor("chango_mas"),
    ]);
    // At least some should differ; with 15 palette colors, extremely unlikely all 5 collide.
    expect(colors.size).toBeGreaterThanOrEqual(2);
  });

  it("handles empty string", () => {
    const color = chainColor("");
    expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it("handles special characters", () => {
    const color = chainColor("coto!");
    expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});

describe("chainLabel", () => {
  it("capitalizes snake_case identifiers", () => {
    expect(chainLabel("chango_mas")).toBe("Chango Mas");
  });

  it("capitalizes space-separated identifiers", () => {
    expect(chainLabel("super mami")).toBe("Super Mami");
  });

  it("capitalizes a single word", () => {
    expect(chainLabel("carrefour")).toBe("Carrefour");
  });

  it("handles mixed case input", () => {
    expect(chainLabel("cARReFOUR")).toBe("Carrefour");
  });

  it("returns consistent result (caching)", () => {
    const a = chainLabel("dia_online");
    const b = chainLabel("dia_online");
    expect(a).toBe("Dia Online");
    expect(a).toBe(b);
  });

  it("handles empty string", () => {
    expect(chainLabel("")).toBe("");
  });

  it("handles multiple underscores as a single delimiter", () => {
    // The regex splits on [\s_]+, so __ is treated as one delimiter
    expect(chainLabel("super__mami")).toBe("Super Mami");
  });

  it("handles identifiers with numbers", () => {
    expect(chainLabel("super_99")).toBe("Super 99");
  });
});
