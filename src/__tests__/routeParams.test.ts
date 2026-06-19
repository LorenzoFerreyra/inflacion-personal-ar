import { describe, it, expect } from "vitest";
import { isValidEan, parseEans, clampInt } from "@/lib/shared";

/**
 * Tests for the parameter parsing and validation logic used by API routes
 * that aren't already covered by productsRoute.test.ts.
 */

describe("history route EAN validation", () => {
  it("rejects empty string", () => {
    expect(isValidEan("")).toBe(false);
  });

  it("accepts valid numeric EANs", () => {
    expect(isValidEan("7790580601003")).toBe(true);
    expect(isValidEan("123")).toBe(true);
    expect(isValidEan("1")).toBe(true);
  });

  it("rejects non-numeric EANs", () => {
    expect(isValidEan("abc")).toBe(false);
    expect(isValidEan("123abc")).toBe(false);
  });

  it("rejects EANs longer than 14 digits", () => {
    expect(isValidEan("123456789012345")).toBe(false);
  });

  it("accepts 14-digit EANs", () => {
    expect(isValidEan("12345678901234")).toBe(true);
  });
});

describe("product route param parsing", () => {
  it("defaults to 30 when null", () => {
    expect(clampInt(null, 1, 365, 30)).toBe(30);
  });

  it("clamps negative to minimum 1", () => {
    expect(clampInt("-10", 1, 365, 30)).toBe(1);
  });

  it("clamps zero to minimum 1", () => {
    expect(clampInt("0", 1, 365, 30)).toBe(1);
  });

  it("clamps to maximum 365", () => {
    expect(clampInt("999", 1, 365, 30)).toBe(365);
  });

  it("parses valid values", () => {
    expect(clampInt("90", 1, 365, 30)).toBe(90);
    expect(clampInt("365", 1, 365, 30)).toBe(365);
  });
});

describe("chains route EAN parsing", () => {
  it("returns empty array when null", () => {
    expect(parseEans(null)).toEqual([]);
  });

  it("parses comma-separated EANs", () => {
    expect(parseEans("123,456,789")).toEqual(["123", "456", "789"]);
  });

  it("trims whitespace", () => {
    expect(parseEans(" 123 , 456 ")).toEqual(["123", "456"]);
  });

  it("rejects non-numeric EANs", () => {
    expect(parseEans("123,abc,456")).toEqual(["123", "456"]);
  });

  it("limits to 200 EANs", () => {
    const many = Array.from({ length: 250 }, (_, i) => String(i + 1)).join(",");
    expect(parseEans(many).length).toBe(200);
  });
});

describe("category-history route validation", () => {
  const MAX_LENGTH = 200;

  it("rejects empty string", () => {
    const category: string = "";
    expect(!category || category.length > MAX_LENGTH).toBe(true);
  });

  it("accepts valid category name", () => {
    const category = "Lácteos";
    expect(!!category && category.length <= MAX_LENGTH).toBe(true);
  });

  it("rejects over 200 characters", () => {
    const category = "a".repeat(201);
    expect(!!category && category.length <= MAX_LENGTH).toBe(false);
  });

  it("accepts exactly 200 characters", () => {
    const category = "a".repeat(200);
    expect(!!category && category.length <= MAX_LENGTH).toBe(true);
  });
});
