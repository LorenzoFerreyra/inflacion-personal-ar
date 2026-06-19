import { describe, it, expect, vi, beforeEach } from "vitest";
import { downloadCsv } from "@/lib/exportCsv";

describe("downloadCsv", () => {
  let clickedDownload: string | undefined;

  beforeEach(() => {
    clickedDownload = undefined;

    const revokeObjectURL = vi.fn();
    const createObjectURL = vi.fn(() => "blob:mock-url");
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });

    vi.spyOn(document, "createElement").mockReturnValue({
      set href(_v: string) {},
      set download(v: string) {
        clickedDownload = v;
      },
      click: vi.fn(),
    } as unknown as HTMLAnchorElement);
  });

  it("sets the download filename", () => {
    downloadCsv("test.csv", ["A"], [["1"]]);
    expect(clickedDownload).toBe("test.csv");
  });

  it("creates a blob URL and revokes it", () => {
    downloadCsv("test.csv", ["A"], [["1"]]);
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("creates a Blob with csv content type", () => {
    downloadCsv("test.csv", ["Col1"], [["val1"]]);
    const blob = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as Blob;
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("text/csv;charset=utf-8;");
  });

  it("escapes values with commas", async () => {
    downloadCsv("test.csv", ["Name"], [["hello, world"]]);
    const blob = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as Blob;
    const text = await blob.text();
    expect(text).toContain('"hello, world"');
  });

  it("escapes values with double quotes", async () => {
    downloadCsv("test.csv", ["Name"], [['say "hi"']]);
    const blob = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as Blob;
    const text = await blob.text();
    expect(text).toContain('"say ""hi"""');
  });

  it("escapes values with newlines", async () => {
    downloadCsv("test.csv", ["Name"], [["line1\nline2"]]);
    const blob = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as Blob;
    const text = await blob.text();
    expect(text).toContain('"line1\nline2"');
  });

  it("does not escape plain values", async () => {
    downloadCsv("test.csv", ["A", "B"], [["simple", "text"]]);
    const blob = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as Blob;
    const text = await blob.text();
    expect(text).toContain("simple,text");
  });

  it("uses CRLF line endings", async () => {
    downloadCsv("test.csv", ["A"], [["1"], ["2"]]);
    const blob = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as Blob;
    const text = await blob.text();
    const lines = text.split("\r\n");
    expect(lines.length).toBeGreaterThanOrEqual(3);
  });

  it("includes BOM for Excel compatibility", async () => {
    downloadCsv("test.csv", ["A"], [["1"]]);
    const blob = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as Blob;
    const text = await blob.text();
    expect(text.charCodeAt(0)).toBe(0xfeff);
  });
});
