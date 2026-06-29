import { installTokenBridge } from "./token-bridge";
import { makeExecutor } from "./executor";
import { makeStore } from "./storage";
import { mountOverlay } from "../ui/overlay";
import { runScan } from "../core/engine";
import { mergeDedupeSort } from "../core/normalize";
import { filterItems, renderRows } from "../ui/render";
import { downloadCSV } from "../ui/csv";
import type { Source, UnifiedItem } from "../types";

function injectHook() {
  const s = document.createElement("script");
  s.src = chrome.runtime.getURL("dist/token-hook.js");
  s.onload = () => s.remove();
  (document.head || document.documentElement).appendChild(s);
}

// Best-effort: the SPA's user endpoint exposes the stable identity (NIF). The exact
// path (/api/v1/user/{id}) is confirmed during manual verification; if this fails,
// identity stays null and persistence is simply disabled for the session.
async function fetchIdentity(getToken: () => string | null): Promise<string | null> {
  try {
    const res = await fetch("https://dehu.redsara.es/api/v1/user", {
      credentials: "include",
      headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
    });
    if (!res.ok) return null;
    const j = await res.json();
    return j?.person?.identifier ?? null;
  } catch { return null; }
}

const yyyymmdd = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

(async function main() {
  injectHook();
  const getToken = installTokenBridge();
  const overlay = mountOverlay();
  const executor = makeExecutor(getToken);
  const els = overlay.els;

  let all: UnifiedItem[] = [];
  let store: Awaited<ReturnType<typeof makeStore>> | null = null;
  let storageOn = true;
  let abort: AbortController | null = null;

  // default date range: last 12 months
  const today = new Date();
  const yearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
  els.to.value = yyyymmdd(today);
  els.from.value = yyyymmdd(yearAgo);

  const sourcesSelected = (): Source[] => {
    const out: Source[] = [];
    overlay.root.querySelectorAll<HTMLElement>(".toggle.on").forEach(t => {
      const s = t.dataset.source as Source | undefined;
      if (s) out.push(s);
    });
    return out.length ? out : ["notificacion", "comunicacion"];
  };
  const activeState = () =>
    (overlay.root.querySelector(".chip.on") as HTMLElement | null)?.dataset.state ?? "all";

  const apply = () => {
    const shown = filterItems(all, { query: els.search.value, sources: sourcesSelected(), state: activeState() });
    renderRows(els.rows, shown);
    els.count.textContent = all.length
      ? `Mostrando ${shown.length} de ${all.length} elementos`
      : "Sin datos todavía. Pulsa Sincronizar.";
  };

  // --- interactivity ---
  els.search.addEventListener("input", apply);
  overlay.root.querySelectorAll<HTMLElement>(".toggle").forEach(t =>
    t.addEventListener("click", () => { t.classList.toggle("on"); apply(); }));
  overlay.root.querySelectorAll<HTMLElement>(".chip").forEach(c =>
    c.addEventListener("click", () => {
      overlay.root.querySelectorAll(".chip").forEach(x => x.classList.remove("on"));
      c.classList.add("on"); apply();
    }));
  overlay.root.querySelector(".export")?.addEventListener("click", () =>
    downloadCSV(filterItems(all, { query: els.search.value, sources: sourcesSelected(), state: activeState() })));

  // --- sync ---
  els.cancel.addEventListener("click", () => abort?.abort());
  els.sync.addEventListener("click", async () => {
    abort = new AbortController();
    els.sync.disabled = true;
    els.progressbar.hidden = false;
    els.barfill.style.width = "0";
    try {
      const fresh = await runScan({
        from: new Date(els.from.value), to: new Date(els.to.value),
        sources: sourcesSelected(), executor, signal: abort.signal,
        onReauth: async () => { /* SPA auto-refreshes; getToken() returns the latest */ },
        onProgress: p => {
          els.progress.textContent = `Escaneando ventana ${p.windowIndex} de ${p.windowCount} · ${p.itemCount} elementos`;
          els.barfill.style.width = `${Math.round((p.windowIndex / p.windowCount) * 100)}%`;
        },
      });
      all = mergeDedupeSort([...all, ...fresh]); // additive: keep previously cached items
      apply();
      if (storageOn && store) await store.save(all, yyyymmdd(new Date()));
      els.progress.textContent = `Listo · ${all.length} elementos`;
    } catch (e) {
      els.progress.textContent = (e as Error).message?.match(/abort/i) ? "Cancelado." : "Error durante la sincronización.";
    } finally {
      els.sync.disabled = false;
      setTimeout(() => { els.progressbar.hidden = true; }, 2500);
    }
  });

  // --- settings menu ---
  (overlay.root.querySelector("#opt-store") as HTMLInputElement | null)?.addEventListener("change", async (e) => {
    storageOn = (e.target as HTMLInputElement).checked;
    if (!storageOn && store) await store.clear();
  });
  overlay.root.querySelector("#clear-data")?.addEventListener("click", async () => {
    if (store) await store.clear();
    all = []; apply();
    els.lastsync.textContent = "";
  });
  const clearClose = overlay.root.querySelector("#opt-clear-close") as HTMLInputElement | null;
  window.addEventListener("beforeunload", () => { if (clearClose?.checked && store) void store.clear(); });

  // --- load cached data ---
  const identity = await fetchIdentity(getToken);
  if (identity) {
    store = await makeStore(identity, chrome.storage.local);
    const cached = await store.load();
    all = cached.items;
    if (cached.lastSync) els.lastsync.textContent = `· Última sincronización: ${cached.lastSync} · solo se descargan novedades`;
  }
  apply();

  // --- toolbar-icon relay ---
  chrome.runtime.onMessage.addListener(msg => { if (msg?.type === "toggle-overlay") overlay.toggle(); });
})();
