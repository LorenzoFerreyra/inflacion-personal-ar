"use client";

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: string[][],
) {
  const sanitize = (v: string) =>
    /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;

  const escape = (v: string) => {
    const safe = sanitize(v);
    return safe.includes(",") || safe.includes('"') || safe.includes("\n")
      ? `"${safe.replace(/"/g, '""')}"`
      : safe;
  };

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
