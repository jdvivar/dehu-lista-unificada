import { installTokenBridge } from "./token-bridge";
import { makeExecutor } from "./executor";
import { makeStore } from "./storage";
import { mountOverlay } from "../ui/overlay";
import { runScan } from "../core/engine";
import { computeFetchRanges } from "../core/incremental";
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

const yyyymmdd = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// --- runs at document_start: install the token hook + bridge before the SPA boots ---
injectHook();
let overlay: ReturnType<typeof mountOverlay> | null = null;
let loggedIn = false; // sticky once an auth token is seen this page-load

// Public / login routes never show the launcher, even if a stale token lingers.
const isPublicRoute = () => /\/(public|login)(\/|$)/.test(location.pathname);
const refreshLauncher = () => overlay?.setLauncher(loggedIn && !isPublicRoute());

let capturedUserId: string | null = null;
let identityHandler: ((id: string) => void) | null = null;
const getToken = installTokenBridge(
  () => { loggedIn = true; refreshLauncher(); },
  (id) => { capturedUserId = id; identityHandler?.(id); },
);

// --- the UI + wiring, mounted once the DOM is ready ---
function start() {
  const ov = mountOverlay();
  overlay = ov;
  refreshLauncher(); // reflect current logged-in + route state (token may have arrived pre-mount)
  // SPA route changes aren't observable from the isolated world, so poll the URL.
  let lastHref = location.href;
  setInterval(() => { if (location.href !== lastHref) { lastHref = location.href; refreshLauncher(); } }, 600);
  window.addEventListener("popstate", refreshLauncher);
  const els = ov.els;
  const executor = makeExecutor(getToken);

  let all: UnifiedItem[] = [];
  let store: Awaited<ReturnType<typeof makeStore>> | null = null;
  let storageOn = true;
  let abort: AbortController | null = null;
  let coveredFrom: string | null = null; // oldest date scanned (YYYY-MM-DD)
  let coveredTo: string | null = null;   // newest date scanned (YYYY-MM-DD)

  const today = new Date();
  const yearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
  els.to.value = yyyymmdd(today);
  els.from.value = yyyymmdd(yearAgo);

  const sourcesSelected = (): Source[] => {
    const out: Source[] = [];
    ov.root.querySelectorAll<HTMLElement>(".toggle.on").forEach(t => {
      const s = t.dataset.source as Source | undefined;
      if (s) out.push(s);
    });
    return out.length ? out : ["notificacion", "comunicacion"];
  };
  const activeState = () =>
    (ov.root.querySelector(".chip.on") as HTMLElement | null)?.dataset.state ?? "all";

  const apply = () => {
    const shown = filterItems(all, { query: els.search.value, sources: sourcesSelected(), state: activeState() });
    renderRows(els.rows, shown);
    els.count.textContent = all.length
      ? `Mostrando ${shown.length} de ${all.length} elementos`
      : "Sin datos todavía. Inicia sesión y pulsa Sincronizar.";
  };

  els.search.addEventListener("input", apply);
  ov.root.querySelectorAll<HTMLElement>(".toggle").forEach(t =>
    t.addEventListener("click", () => { t.classList.toggle("on"); apply(); }));
  ov.root.querySelectorAll<HTMLElement>(".chip").forEach(c =>
    c.addEventListener("click", () => {
      ov.root.querySelectorAll(".chip").forEach(x => x.classList.remove("on"));
      c.classList.add("on"); apply();
    }));
  ov.root.querySelector(".export")?.addEventListener("click", () =>
    downloadCSV(filterItems(all, { query: els.search.value, sources: sourcesSelected(), state: activeState() })));

  els.cancel.addEventListener("click", () => abort?.abort());
  els.sync.addEventListener("click", async () => {
    abort = new AbortController();
    els.sync.disabled = true;
    els.progressbar.hidden = false;
    els.barfill.style.width = "0";
    const from = new Date(els.from.value), to = new Date(els.to.value);
    const before = all.length;
    try {
      // Only fetch what isn't already cached: the recent doubt window + any backfill.
      const ranges = computeFetchRanges(from, to,
        coveredFrom ? new Date(coveredFrom) : null, coveredTo ? new Date(coveredTo) : null, 30);
      let fresh: UnifiedItem[] = [];
      for (let i = 0; i < ranges.length; i++) {
        const r = ranges[i];
        const part = await runScan({
          from: r.from, to: r.to, sources: sourcesSelected(), executor, maxDays: 30, signal: abort.signal,
          onReauth: async () => { /* SPA auto-refreshes; getToken() returns the latest */ },
          onProgress: p => {
            els.progress.textContent = `Escaneando ${i + 1}/${ranges.length} · ventana ${p.windowIndex}/${p.windowCount} · ${fresh.length + p.itemCount} encontrados`;
            els.barfill.style.width = `${Math.round((p.windowIndex / p.windowCount) * 100)}%`;
          },
        });
        fresh = fresh.concat(part);
      }
      all = mergeDedupeSort([...all, ...fresh]);
      // widen the covered range to include what we just scanned
      coveredFrom = yyyymmdd(coveredFrom ? new Date(Math.min(new Date(coveredFrom).getTime(), from.getTime())) : from);
      coveredTo = yyyymmdd(coveredTo ? new Date(Math.max(new Date(coveredTo).getTime(), to.getTime())) : to);
      apply();
      const lastSync = yyyymmdd(new Date());
      if (storageOn && store) await store.save(all, { lastSync, coveredFrom, coveredTo });
      els.lastsync.textContent = `· Última sincronización: ${lastSync} · solo se descargan novedades`;
      els.progress.textContent = `Listo · ${all.length} elementos (${all.length - before} nuevos)`;
    } catch (e) {
      els.progress.textContent = (e as Error).message?.match(/abort/i) ? "Cancelado." : "Error durante la sincronización.";
    } finally {
      els.sync.disabled = false;
      setTimeout(() => { els.progressbar.hidden = true; }, 2500);
    }
  });

  (ov.root.querySelector("#opt-store") as HTMLInputElement | null)?.addEventListener("change", async (e) => {
    storageOn = (e.target as HTMLInputElement).checked;
    if (!storageOn && store) await store.clear();
  });
  ov.root.querySelector("#clear-data")?.addEventListener("click", async () => {
    if (store) await store.clear();
    all = []; apply();
    els.lastsync.textContent = "";
  });
  const clearClose = ov.root.querySelector("#opt-clear-close") as HTMLInputElement | null;
  window.addEventListener("beforeunload", () => { if (clearClose?.checked && store) void store.clear(); });

  // set up encrypted local storage once the user id is captured from the SPA's request
  let identityResolved = false;
  const setupStore = async (id: string) => {
    store = await makeStore(id, chrome.storage.local);
    const cached = await store.load();
    if (cached.items.length) all = mergeDedupeSort([...all, ...cached.items]);
    if (cached.meta) {
      coveredFrom = cached.meta.coveredFrom;
      coveredTo = cached.meta.coveredTo;
      els.lastsync.textContent = `· Última sincronización: ${cached.meta.lastSync} · solo se descargan novedades`;
    }
    apply();
  };
  identityHandler = (id) => { if (identityResolved) return; identityResolved = true; void setupStore(id); };
  if (capturedUserId) identityHandler(capturedUserId);
  apply();

  chrome.runtime.onMessage.addListener(msg => { if (msg?.type === "toggle-overlay") ov.toggle(); });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
else start();
