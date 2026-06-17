import { describe, it, expect } from "vitest";

/**
 * Tests for the parameter parsing logic used by /api/products.
 * Extracted here to validate clamping and sanitization without needing
 * the database or Next.js request objects.
 */

function parseDias(raw: string | null): number {
  return Math.min(365, Math.max(1, parseInt(raw ?? "30", 10) || 30));
}

function parsePage(raw: string | null): number {
  return Math.max(1, parseInt(raw ?? "1", 10) || 1);
}

function parsePageSize(raw: string | null): number {
  return Math.min(200, Math.max(1, parseInt(raw ?? "30", 10) || 30));
}

function parseEans(raw: string | null): string[] | undefined {
  if (!raw) return undefined;
  return raw
    .split(",")
    .map((e) => e.trim())
    .filter((e) => /^\d{1,14}$/.test(e))
    .slice(0, 200);
}

describe("products route parameter parsing", () => {
  describe("dias", () => {
    it("defaults to 30", () => {
      expect(parseDias(null)).toBe(30);
    });

    it("treats 0 as invalid and falls back to 30", () => {
      expect(parseDias("0")).toBe(30);
    });

    it("clamps negative values to 1", () => {
      expect(parseDias("-10")).toBe(1);
    });

    it("clamps to maximum 365", () => {
      expect(parseDias("999")).toBe(365);
    });

    it("parses valid number", () => {
      expect(parseDias("90")).toBe(90);
    });

    it("falls back to 30 on garbage input", () => {
      expect(parseDias("abc")).toBe(30);
    });
  });

  describe("page", () => {
    it("defaults to 1", () => {
      expect(parsePage(null)).toBe(1);
    });

    it("clamps to minimum 1", () => {
      expect(parsePage("0")).toBe(1);
      expect(parsePage("-5")).toBe(1);
    });

    it("parses valid page", () => {
      expect(parsePage("3")).toBe(3);
    });
  });

  describe("pageSize", () => {
    it("defaults to 30", () => {
      expect(parsePageSize(null)).toBe(30);
    });

    it("treats 0 as invalid and falls back to 30", () => {
      expect(parsePageSize("0")).toBe(30);
    });

    it("clamps to maximum 200", () => {
      expect(parsePageSize("500")).toBe(200);
    });
  });

  describe("eans", () => {
    it("returns undefined when null", () => {
      expect(parseEans(null)).toBeUndefined();
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

    it("rejects EANs longer than 14 digits", () => {
      expect(parseEans("123456789012345")).toEqual([]);
    });

    it("accepts 13-digit EANs", () => {
      expect(parseEans("7790580601003")).toEqual(["7790580601003"]);
    });

    it("limits to 200 EANs", () => {
      const manyEans = Array.from({ length: 250 }, (_, i) => String(i + 1)).join(",");
      expect(parseEans(manyEans)!.length).toBe(200);
    });
  });
});
