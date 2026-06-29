import type { UnifiedItem } from "../types";

const fmt = (iso: string | null) => { if (!iso) return ""; const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()}`; };
// Quote on ; (our delimiter), comma (safe if reopened as CSV), quote char, or newline.
const cell = (s: string) => /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;

export function toCSV(items: UnifiedItem[]): string {
  const head = "Fecha;Tipo;Organismo;Concepto;Estado;Caduca";
  const rows = items.map(i => [fmt(i.date), i.source, i.emitter, i.concept, i.state, fmt(i.expirationDate)]
    .map(v => cell(String(v))).join(";"));
  return [head, ...rows].join("\n");
}

export function downloadCSV(items: UnifiedItem[]): void {
  const blob = new Blob([toCSV(items)], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "dehu-unificado.csv"; a.click();
  URL.revokeObjectURL(a.href);
}
