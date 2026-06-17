import { describe, it, expect } from "vitest";
import { PERIODS, PAGE_SIZE } from "@/lib/constants";

describe("PERIODS", () => {
  it("has all three period keys", () => {
    expect(Object.keys(PERIODS)).toEqual(["mensual", "trimestral", "interanual"]);
  });

  it("mensual = 30 days", () => {
    expect(PERIODS.mensual.dias).toBe(30);
  });

  it("trimestral = 90 days", () => {
    expect(PERIODS.trimestral.dias).toBe(90);
  });

  it("interanual = 365 days", () => {
    expect(PERIODS.interanual.dias).toBe(365);
  });

  it("each period has a label", () => {
    for (const key of Object.keys(PERIODS) as Array<keyof typeof PERIODS>) {
      expect(PERIODS[key].label).toBeTruthy();
    }
  });
});

describe("PAGE_SIZE", () => {
  it("is 30", () => {
    expect(PAGE_SIZE).toBe(30);
  });
});
