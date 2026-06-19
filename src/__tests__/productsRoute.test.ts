import { describe, it, expect } from "vitest";
import { parseEans, clampInt } from "@/lib/shared";

/**
 * Tests for the parameter parsing logic used by /api/products.
 * Validates clamping and sanitization using the real shared functions.
 */

describe("products route parameter parsing", () => {
  describe("dias", () => {
    it("defaults to 30", () => {
      expect(clampInt(null, 1, 365, 30)).toBe(30);
    });

    it("clamps zero to minimum 1", () => {
      expect(clampInt("0", 1, 365, 30)).toBe(1);
    });

    it("clamps negative values to 1", () => {
      expect(clampInt("-10", 1, 365, 30)).toBe(1);
    });

    it("clamps to maximum 365", () => {
      expect(clampInt("999", 1, 365, 30)).toBe(365);
    });

    it("parses valid number", () => {
      expect(clampInt("90", 1, 365, 30)).toBe(90);
    });

    it("falls back to 30 on garbage input", () => {
      expect(clampInt("abc", 1, 365, 30)).toBe(30);
    });
  });

  describe("page", () => {
    it("defaults to 1", () => {
      expect(clampInt(null, 1, Infinity, 1)).toBe(1);
    });

    it("clamps to minimum 1", () => {
      expect(clampInt("0", 1, Infinity, 1)).toBe(1);
      expect(clampInt("-5", 1, Infinity, 1)).toBe(1);
    });

    it("parses valid page", () => {
      expect(clampInt("3", 1, Infinity, 1)).toBe(3);
    });
  });

  describe("pageSize", () => {
    it("defaults to 30", () => {
      expect(clampInt(null, 1, 200, 30)).toBe(30);
    });

    it("clamps zero to minimum 1", () => {
      expect(clampInt("0", 1, 200, 30)).toBe(1);
    });

    it("clamps to maximum 200", () => {
      expect(clampInt("500", 1, 200, 30)).toBe(200);
    });
  });

  describe("eans", () => {
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

    it("rejects EANs longer than 14 digits", () => {
      expect(parseEans("123456789012345")).toEqual([]);
    });

    it("accepts 13-digit EANs", () => {
      expect(parseEans("7790580601003")).toEqual(["7790580601003"]);
    });

    it("limits to 200 EANs", () => {
      const manyEans = Array.from({ length: 250 }, (_, i) =>
        String(i + 1),
      ).join(",");
      expect(parseEans(manyEans).length).toBe(200);
    });
  });
});
