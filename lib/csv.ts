// Helper minimalista para exportar arrays de objetos a CSV
// Comilla campos con coma, comillas o saltos de línea

export function toCSV<T extends Record<string, unknown>>(
  rows: T[],
  columns: { key: keyof T; label: string }[]
): string {
  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = columns.map((c) => escape(c.label)).join(",");
  const body = rows
    .map((r) => columns.map((c) => escape(r[c.key])).join(","))
    .join("\n");
  return `${header}\n${body}`;
}

export function descargarCSV(nombre: string, contenido: string) {
  const blob = new Blob([`﻿${contenido}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre.endsWith(".csv") ? nombre : `${nombre}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
