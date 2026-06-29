import { CSS } from "./overlay.css";
import { overlayHTML } from "./template";

const FAB_POS_KEY = "dehu-uni:fab-pos";

// Make the launcher draggable; a press that doesn't move fires onClick (opens
// the overlay), a press that moves repositions it and remembers the spot.
function makeDraggable(fab: HTMLElement, onClick: () => void) {
  try {
    const saved = localStorage.getItem(FAB_POS_KEY);
    if (saved) {
      const { left, top } = JSON.parse(saved);
      fab.style.left = left; fab.style.top = top; fab.style.right = "auto"; fab.style.bottom = "auto";
    }
  } catch { /* ignore */ }

  let dragging = false, moved = false, startX = 0, startY = 0, origX = 0, origY = 0;

  fab.addEventListener("pointerdown", (e) => {
    dragging = true; moved = false;
    const r = fab.getBoundingClientRect();
    startX = e.clientX; startY = e.clientY; origX = r.left; origY = r.top;
    fab.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  fab.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
    const left = Math.max(4, Math.min(window.innerWidth - fab.offsetWidth - 4, origX + dx));
    const top = Math.max(4, Math.min(window.innerHeight - fab.offsetHeight - 4, origY + dy));
    fab.style.left = `${left}px`; fab.style.top = `${top}px`; fab.style.right = "auto"; fab.style.bottom = "auto";
  });
  fab.addEventListener("pointerup", (e) => {
    if (!dragging) return;
    dragging = false;
    fab.releasePointerCapture(e.pointerId);
    if (moved) { try { localStorage.setItem(FAB_POS_KEY, JSON.stringify({ left: fab.style.left, top: fab.style.top })); } catch { /* ignore */ } }
    else onClick();
  });
}

export interface OverlayHandle {
  open(): void; close(): void; toggle(): void; revealLauncher(): void;
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
  let loggedIn = false; // launcher stays hidden until an auth token is captured
  const setOpen = (v: boolean) => {
    isOpen = v;
    q(".backdrop").style.display = v ? "block" : "none";
    q(".overlay").style.display = v ? "flex" : "none";
    $("fab").style.display = (!v && loggedIn) ? "flex" : "none";
    if (!v) $("menu").classList.remove("show");
  };
  const revealLauncher = () => { loggedIn = true; if (!isOpen) $("fab").style.display = "flex"; };

  const els: OverlayHandle["els"] = {
    rows: $("rows"), search: $("search") as HTMLInputElement, sync: $("sync") as HTMLButtonElement,
    from: $("from") as HTMLInputElement, to: $("to") as HTMLInputElement, progress: $("progress"),
    progressbar: $("progressbar"), barfill: $("barfill"), cancel: $("cancel"),
    gear: $("gear"), menu: $("menu"), fab: $("fab"), foot: q(".ext-foot"),
    lastsync: $("lastsync"), count: $("count"),
  };

  makeDraggable($("fab"), () => setOpen(true));
  q(".overlay .x").addEventListener("click", () => setOpen(false));
  q(".backdrop").addEventListener("click", () => setOpen(false));
  els.gear.addEventListener("click", (e) => { e.stopPropagation(); els.menu.classList.toggle("show"); });
  root.addEventListener("click", (e) => { if (!els.menu.contains(e.target as Node)) els.menu.classList.remove("show"); });

  setOpen(false);

  return { open: () => setOpen(true), close: () => setOpen(false), toggle: () => setOpen(!isOpen), revealLauncher, root, els };
}
