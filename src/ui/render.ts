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

const HOST = "https://dehu.redsara.es";
// Per-item deep link, keyed on the 45-char sentReference. `lang` is the DEHú UI
// language segment (es/ca/gl/eu/va/en…), derived from the live page — never hardcoded:
//   notification  -> /{lang}/notifications/realized/{ref}
//   communication -> /{lang}/communication-detail/{ref}
// Falls back to the tab if sentReference is somehow absent.
export function deepLink(i: UnifiedItem, lang: string): string {
  const base = `${HOST}/${lang}`;
  const ref = (i.raw as { sentReference?: string } | null)?.sentReference;
  if (i.source === "notificacion") {
    return ref ? `${base}/notifications/realized/${encodeURIComponent(ref)}` : `${base}/notifications`;
  }
  return ref ? `${base}/communication-detail/${encodeURIComponent(ref)}` : `${base}/communications`;
}

export function rowHTML(i: UnifiedItem, lang: string): string {
  const badge = i.source === "notificacion" ? "n" : "c";
  const label = i.source === "notificacion" ? "● Notificación" : "● Comunicación";
  return `<tr><td class="date">${fmt(i.date)}</td>
    <td><span class="badge ${badge}">${label}</span></td>
    <td class="emitter">${esc(i.emitter)}</td><td class="concept">${esc(i.concept)}</td>
    <td><span class="state">${esc(i.state)}</span></td>
    <td class="date">${i.expirationDate ? fmt(i.expirationDate) : "—"}</td>
    <td>${i.hasAnnexes ? "📎" : ""}</td>
    <td><a class="open" href="${deepLink(i, lang)}" target="_blank" rel="noopener">Abrir en DEHú ↗</a></td></tr>`;
}

export function renderRows(tbody: HTMLElement, items: UnifiedItem[], lang: string): void {
  tbody.innerHTML = items.map(i => rowHTML(i, lang)).join("");
}
