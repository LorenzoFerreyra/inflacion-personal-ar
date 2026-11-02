import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getIpc,
  subtractMonths,
  variationsFromIndex,
  type IndecRow,
} from "@/lib/ipc";

const SERIES: IndecRow[] = [
  { periodo: "202609", valor: 130 },
  { periodo: "202608", valor: 125 },
  { periodo: "202606", valor: 120 },
  { periodo: "202509", valor: 100 },
];

function mockFetch(body: unknown, status = 200) {
  const fn = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("subtractMonths", () => {
  it("stays inside the year", () => {
    expect(subtractMonths("202609", 3)).toBe("202606");
  });

  it("crosses the year boundary", () => {
    expect(subtractMonths("202601", 1)).toBe("202512");
    expect(subtractMonths("202603", 12)).toBe("202503");
  });
});

describe("variationsFromIndex", () => {
  it("compares the latest month against 1, 3 and 12 months back", () => {
    expect(variationsFromIndex(SERIES)).toEqual({
      mensual: 4,
      trimestral: 8.3,
      interanual: 30,
    });
  });

  it("ignores null values and uses the latest published month", () => {
    const values = variationsFromIndex([
      { periodo: "202610", valor: null },
      ...SERIES,
    ]);
    expect(values.mensual).toBe(4);
  });

  it("accepts repeated rows with the same value", () => {
    expect(() => variationsFromIndex([...SERIES, ...SERIES])).not.toThrow();
  });

  it("rejects a mix of series instead of picking one", () => {
    expect(() =>
      variationsFromIndex([...SERIES, { periodo: "202609", valor: 131 }]),
    ).toThrow(/más de una serie/);
  });

  it("rejects an empty series", () => {
    expect(() => variationsFromIndex([])).toThrow(/vacía/);
  });

  it("rejects a series missing a base month", () => {
    expect(() => variationsFromIndex(SERIES.slice(0, 3))).toThrow(/falta la base/);
  });
});

describe("getIpc", () => {
  const cache = globalThis as unknown as { __ipcCacheV3: unknown };

  beforeEach(() => {
    cache.__ipcCacheV3 = undefined;
    vi.stubEnv("INDEC_API_TOKEN", "test-token");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("requests the general index with the bearer token", async () => {
    const fetchMock = mockFetch(SERIES);

    await expect(getIpc()).resolves.toEqual({
      mensual: 4,
      trimestral: 8.3,
      interanual: 30,
    });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    const params = new URL(url).searchParams;
    expect(url).toContain("https://api.indec.gob.ar/v1/ipc_nacional?");
    expect(params.get("descripcion")).toBe("ilike.*nivel general*");
    expect(params.get("region")).toBe("ilike.*nacional*");
    expect(init.headers).toEqual({ Authorization: "Bearer test-token" });
  });

  it("serves the cache without calling the API again", async () => {
    const fetchMock = mockFetch(SERIES);
    await getIpc();
    await getIpc();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fails without a token and without calling the API", async () => {
    vi.stubEnv("INDEC_API_TOKEN", "");
    const fetchMock = mockFetch(SERIES);
    await expect(getIpc()).rejects.toThrow(/INDEC_API_TOKEN/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails on an API error when there is nothing cached", async () => {
    mockFetch({ code: "PGRST301" }, 401);
    await expect(getIpc()).rejects.toThrow(/HTTP 401/);
  });

  it("keeps serving the last good value when the API fails", async () => {
    vi.useFakeTimers();
    mockFetch(SERIES);
    const values = await getIpc();

    vi.advanceTimersByTime(7 * 60 * 60 * 1000);
    mockFetch({}, 503);
    await expect(getIpc()).resolves.toEqual(values);
  });
});
