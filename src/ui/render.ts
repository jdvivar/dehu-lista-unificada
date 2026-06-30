import type { UnifiedItem, Source } from "../types";

export function filterItems(items: UnifiedItem[],
  f: { query: string; sources: Source[]; state: string }): UnifiedItem[] {
  const q = f.query.trim().toLowerCase();
  return items.filter(i =>
    f.sources.includes(i.source) &&
    (f.state === "all" || i.state === f.state) &&
    (q === "" || `${i.emitter} ${i.concept}`.toLowerCase().includes(q)));
}

const fmt = (iso: string) => { const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()}`; };
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;" }[c]!));

const BASE = "https://dehu.redsara.es/es";
// Type-aware link to the right DEHú tab. A true per-item deep link is added once
// we confirm DEHú exposes a per-item route (see deepLink()).
export function deepLink(i: UnifiedItem): string {
  return i.source === "notificacion" ? `${BASE}/notifications` : `${BASE}/communications`;
}

export function rowHTML(i: UnifiedItem): string {
  const badge = i.source === "notificacion" ? "n" : "c";
  const label = i.source === "notificacion" ? "● Notificación" : "● Comunicación";
  return `<tr><td class="date">${fmt(i.date)}</td>
    <td><span class="badge ${badge}">${label}</span></td>
    <td class="emitter">${esc(i.emitter)}</td><td class="concept">${esc(i.concept)}</td>
    <td><span class="state">${esc(i.state)}</span></td>
    <td class="date">${i.expirationDate ? fmt(i.expirationDate) : "—"}</td>
    <td>${i.hasAnnexes ? "📎" : ""}</td>
    <td><a class="open" href="${deepLink(i)}" target="_blank" rel="noopener">Abrir en DEHú ↗</a></td></tr>`;
}

export function renderRows(tbody: HTMLElement, items: UnifiedItem[]): void {
  tbody.innerHTML = items.map(rowHTML).join("");
}
