import { CSS } from "./overlay.css";
import { overlayHTML } from "./template";

export interface OverlayHandle {
  open(): void; close(): void; toggle(): void;
  root: ShadowRoot;
  els: {
    rows: HTMLElement; search: HTMLInputElement; sync: HTMLButtonElement;
    from: HTMLInputElement; to: HTMLInputElement; progress: HTMLElement;
    progressbar: HTMLElement; barfill: HTMLElement; cancel: HTMLElement;
    gear: HTMLElement; menu: HTMLElement; fab: HTMLElement; foot: HTMLElement;
    lastsync: HTMLElement; count: HTMLElement;
  };
}

export function mountOverlay(): OverlayHandle {
  const host = document.createElement("div");
  host.id = "dehu-uni-host";
  document.documentElement.appendChild(host);
  const root = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = CSS;
  root.appendChild(style);

  const wrap = document.createElement("div");
  wrap.innerHTML =
    `<div class="backdrop"></div><div class="overlay">${overlayHTML()}</div>` +
    `<button class="fab" id="fab">⬡ Ver lista unificada</button>`;
  root.appendChild(wrap);

  const $ = (id: string) => root.getElementById(id) as HTMLElement;
  const q = (s: string) => root.querySelector(s) as HTMLElement;

  let isOpen = false;
  const setOpen = (v: boolean) => {
    isOpen = v;
    q(".backdrop").style.display = v ? "block" : "none";
    q(".overlay").style.display = v ? "flex" : "none";
    $("fab").style.display = v ? "none" : "flex";
    if (!v) $("menu").classList.remove("show");
  };

  const els: OverlayHandle["els"] = {
    rows: $("rows"), search: $("search") as HTMLInputElement, sync: $("sync") as HTMLButtonElement,
    from: $("from") as HTMLInputElement, to: $("to") as HTMLInputElement, progress: $("progress"),
    progressbar: $("progressbar"), barfill: $("barfill"), cancel: $("cancel"),
    gear: $("gear"), menu: $("menu"), fab: $("fab"), foot: q(".ext-foot"),
    lastsync: $("lastsync"), count: $("count"),
  };

  $("fab").addEventListener("click", () => setOpen(true));
  q(".overlay .x").addEventListener("click", () => setOpen(false));
  q(".backdrop").addEventListener("click", () => setOpen(false));
  els.gear.addEventListener("click", (e) => { e.stopPropagation(); els.menu.classList.toggle("show"); });
  root.addEventListener("click", (e) => { if (!els.menu.contains(e.target as Node)) els.menu.classList.remove("show"); });

  setOpen(false);

  return { open: () => setOpen(true), close: () => setOpen(false), toggle: () => setOpen(!isOpen), root, els };
}
