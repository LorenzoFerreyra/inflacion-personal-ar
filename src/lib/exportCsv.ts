"use client";

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: string[][],
) {
  const escape = (v: string) =>
    v.includes(",") || v.includes('"') || v.includes("\n")
      ? `"${v.replace(/"/g, '""')}"`
      : v;

  const csv =
    "﻿" +
    [headers.map(escape).join(",")]
      .concat(rows.map((r) => r.map(escape).join(",")))
      .join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
