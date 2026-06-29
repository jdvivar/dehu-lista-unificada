# DEHú Unified List Extension — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Manifest V3 browser extension that shows DEHú *Notificaciones* + *Comunicaciones* in one searchable list across any date range, by scanning 30-day windows behind the scenes — rendered as a Shadow-DOM overlay on the DEHú site itself.

**Architecture:** A content script injected on `dehu.redsara.es/*` captures the live Bearer token via a MAIN-world fetch hook, performs same-origin authenticated API calls, runs a chunked-search engine, and renders a Shadow-DOM overlay UI. A thin service worker relays the toolbar-icon click. Results persist (AES-GCM encrypted) in `chrome.storage.local` for incremental re-sync. All business logic lives in pure, unit-tested modules; the page/UI layers are thin shells over them.

**Tech Stack:** TypeScript, esbuild (bundle content script + service worker to IIFE), Vitest (unit/integration), WebCrypto, `chrome.storage.local`. No runtime dependencies.

## Global Constraints

- Manifest V3. Host permissions: `https://dehu.redsara.es/*` only. Permissions: `storage`, `unlimitedStorage`, `scripting`, `activeTab`.
- **Read-only.** Only GET the listing endpoints. Never call detail/voucher/document endpoints; never trigger *comparecencia*.
- Throttle ≥ 300 ms between API requests. Gentle on the government server.
- Date query params use **`DD/MM/YYYY`** format.
- Endpoints (same host): `GET /api/v1/realized_notifications` (notificaciones, date field `finalDate[left_date]`/`finalDate[right_date]`) and `GET /api/v1/communications` (comunicaciones, date field `availabilityDate[left_date]`/`availabilityDate[right_date]`). Both return `{ count, total, limit, page, items: [...] }`.
- Encryption key is derived at runtime from the live DEHú identity and **never written to disk**. No passphrase in v1.
- UI language: Spanish. Dates shown `DD/MM/YYYY`.
- All copy and visual design follow `mockups/index.html` (the approved visual reference).
- Commit messages: **single-line subject only, no body, no `Co-Authored-By` trailer** (repo convention).

---

## File Structure

```
manifest.json                     # MV3 manifest
package.json, tsconfig.json        # toolchain
build.mjs                          # esbuild bundling script
src/
  types.ts                         # shared types (UnifiedItem, DateWindow, Executor, …)
  core/                            # PURE logic — no DOM, no chrome APIs (fully unit-tested)
    windows.ts                     # date-window generation + DD/MM/YYYY formatting
    normalize.ts                   # raw API item -> UnifiedItem; merge + dedupe + sort
    crypto.ts                      # AES-GCM encrypt/decrypt + key derivation
    engine.ts                      # chunked-search orchestration (executor injected)
  page/                            # runs in the DEHú page (content script world)
    token-hook.ts                  # MAIN-world fetch/XHR wrapper that captures the token
    executor.ts                    # real API executor (fetch); implements Executor
    storage.ts                     # chrome.storage.local wrapper (namespaced, encrypted)
    content.ts                     # entry: inject hook, mount overlay, wire openers
  ui/
    overlay.ts                     # Shadow-DOM mount + render + event wiring
    overlay.css.ts                 # styles as a string (ported from mockup)
    template.ts                    # HTML template string for the overlay
  background/
    service-worker.ts              # relays toolbar click; opens DEHú tab if needed
test/
  fixtures/                        # redacted API response fixtures (from recon)
  *.test.ts
icons/                             # 16/48/128 png
```

Pure logic in `core/` is the testable heart. `page/`, `ui/`, `background/` are thin shells verified mostly by manual load-unpacked.

---

### Task 1: Toolchain + scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `build.mjs`, `.gitignore` (append), `src/types.ts`, `vitest.config.ts`
- Create: `manifest.json` (skeleton)

**Interfaces:**
- Produces: `src/types.ts` exporting `Source`, `UnifiedItem`, `DateWindow`, `PageResult`, `Executor`, `ScanProgress` — consumed by every later task.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "dehu-unificado",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "build": "node build.mjs",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "esbuild": "^0.23.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0",
    "@types/chrome": "^0.0.268"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["chrome"],
    "skipLibCheck": true
  },
  "include": ["src", "test"]
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { environment: "node", include: ["test/**/*.test.ts"] } });
```

- [ ] **Step 4: Create `src/types.ts`**

```ts
export type Source = "notificacion" | "comunicacion";

export interface UnifiedItem {
  source: Source;
  id: string;                 // API "identifier"
  date: string;               // ISO 8601; finalDate (notif) | availabilityDate (comun)
  emitter: string;            // API "emitterEntity"
  concept: string;
  state: string;
  expirationDate: string | null;
  hasAnnexes: boolean;
  raw: unknown;               // original API item, for deep-linking / debugging
}

export interface DateWindow { start: Date; end: Date; }

export interface PageResult { total: number; items: unknown[]; }

export interface Executor {
  // Throws { status:number } on HTTP errors so the engine can react (401/429/5xx).
  fetchPage(args: { source: Source; window: DateWindow; page: number; limit: number }): Promise<PageResult>;
}

export interface ScanProgress {
  windowIndex: number; windowCount: number;
  from: string; to: string;      // current window, DD/MM/YYYY
  itemCount: number;
}
```

- [ ] **Step 5: Create `build.mjs`**

```js
import * as esbuild from "esbuild";
const common = { bundle: true, format: "iife", target: "chrome110", logLevel: "info" };
await esbuild.build({ ...common, entryPoints: ["src/page/content.ts"], outfile: "dist/content.js" });
await esbuild.build({ ...common, entryPoints: ["src/page/token-hook.ts"], outfile: "dist/token-hook.js" });
await esbuild.build({ ...common, entryPoints: ["src/background/service-worker.ts"], outfile: "dist/service-worker.js" });
console.log("build complete");
```

- [ ] **Step 6: Create `manifest.json` skeleton**

```json
{
  "manifest_version": 3,
  "name": "DEHú Unificado",
  "version": "0.1.0",
  "description": "Notificaciones y Comunicaciones de DEHú en una sola lista buscable.",
  "permissions": ["storage", "unlimitedStorage", "scripting", "activeTab"],
  "host_permissions": ["https://dehu.redsara.es/*"],
  "background": { "service_worker": "dist/service-worker.js" },
  "action": { "default_title": "Abrir DEHú Unificado" },
  "content_scripts": [
    { "matches": ["https://dehu.redsara.es/*"], "js": ["dist/content.js"], "run_at": "document_idle" }
  ],
  "web_accessible_resources": [
    { "resources": ["dist/token-hook.js"], "matches": ["https://dehu.redsara.es/*"] }
  ],
  "icons": { "16": "icons/16.png", "48": "icons/48.png", "128": "icons/128.png" }
}
```

- [ ] **Step 7: Append build output to `.gitignore`**

```
dist/
```

- [ ] **Step 8: Install and verify**

Run: `npm install && npm run typecheck`
Expected: no type errors.

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "Add toolchain, manifest skeleton, and shared types"
```

---

### Task 2: Date-window generator (the 31-day-month fix)

**Files:**
- Create: `src/core/windows.ts`, `test/windows.test.ts`

**Interfaces:**
- Consumes: `DateWindow` from `src/types.ts`.
- Produces: `generateWindows(from: Date, to: Date, maxDays?: number): DateWindow[]` (default `maxDays=28`); `formatDDMMYYYY(d: Date): string`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { generateWindows, formatDDMMYYYY } from "../src/core/windows";

const d = (s: string) => new Date(s + "T12:00:00");

describe("generateWindows", () => {
  it("covers a range with no gaps or overlaps, newest first", () => {
    const w = generateWindows(d("2026-01-01"), d("2026-03-15"), 28);
    expect(w[0].end).toEqual(d("2026-03-15"));                       // starts at 'to'
    expect(w[w.length - 1].start).toEqual(d("2026-01-01"));          // ends at 'from'
    for (let i = 1; i < w.length; i++) {
      const gapMs = w[i - 1].start.getTime() - w[i].end.getTime();
      expect(gapMs).toBe(24 * 3600 * 1000);                          // adjacent, 1 day apart
    }
    for (const win of w) {
      const days = (win.end.getTime() - win.start.getTime()) / 86400000;
      expect(days).toBeLessThanOrEqual(28);
    }
  });

  it("handles a 31-day month within fixed windows (never a >maxDays span)", () => {
    const w = generateWindows(d("2026-07-01"), d("2026-07-31"), 28); // 31 days
    expect(w.length).toBe(2);
    for (const win of w) {
      expect((win.end.getTime() - win.start.getTime()) / 86400000).toBeLessThanOrEqual(28);
    }
  });

  it("returns a single window when range <= maxDays", () => {
    expect(generateWindows(d("2026-02-01"), d("2026-02-10"), 28)).toHaveLength(1);
  });

  it("handles a single-day range", () => {
    const w = generateWindows(d("2026-02-10"), d("2026-02-10"), 28);
    expect(w).toHaveLength(1);
    expect(w[0].start).toEqual(w[0].end);
  });

  it("swaps reversed inputs", () => {
    const w = generateWindows(d("2026-03-15"), d("2026-01-01"), 28);
    expect(w[0].end).toEqual(d("2026-03-15"));
  });
});

describe("formatDDMMYYYY", () => {
  it("formats with zero padding", () => {
    expect(formatDDMMYYYY(d("2026-03-05"))).toBe("05/03/2026");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/windows.test.ts`
Expected: FAIL — cannot find module `../src/core/windows`.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { DateWindow } from "../types";

const DAY = 86400000;
const atNoon = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);

export function generateWindows(from: Date, to: Date, maxDays = 28): DateWindow[] {
  let lo = atNoon(from), hi = atNoon(to);
  if (lo > hi) [lo, hi] = [hi, lo];
  const windows: DateWindow[] = [];
  let end = hi;
  while (end >= lo) {
    // window spans (maxDays-1) days inclusive, so end-start <= maxDays-1 days
    let start = atNoon(new Date(end.getTime() - (maxDays - 1) * DAY));
    if (start < lo) start = lo;
    windows.push({ start, end });
    end = atNoon(new Date(start.getTime() - DAY)); // next window ends the day before
  }
  return windows;
}

export function formatDDMMYYYY(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}
```

Note: using local-noon anchors avoids DST/timezone off-by-one when subtracting whole days.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/windows.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/core/windows.ts test/windows.test.ts && git commit -m "Add date-window generator with fixed-span windows"
```

---

### Task 3: Item normalizer + merge/dedupe

**Files:**
- Create: `src/core/normalize.ts`, `test/normalize.test.ts`, `test/fixtures/realized_notifications.json`, `test/fixtures/communications.json`

**Interfaces:**
- Consumes: `UnifiedItem`, `Source` from types.
- Produces: `normalizeNotification(raw): UnifiedItem`, `normalizeCommunication(raw): UnifiedItem`, `mergeDedupeSort(items: UnifiedItem[]): UnifiedItem[]`.

- [ ] **Step 1: Create fixtures from the recon capture shapes**

`test/fixtures/realized_notifications.json`:
```json
{ "count": 1, "total": 1, "limit": 10, "page": 1, "items": [
  { "identifier": "ABC12345", "emitterEntity": "Agencia Tributaria", "concept": "Requerimiento",
    "state": "Comparecida", "nifTitular": "00000000X", "availabilityDate": "2026-06-13T00:39:58+02:00",
    "expirationDate": "2026-06-23T23:59:59+02:00", "finalDate": "2026-06-13T00:41:14+02:00",
    "bondType": "TITULAR", "hasAnnexes": false, "notificationPriority": "NORMAL", "assuranceLevel": "1" } ] }
```

`test/fixtures/communications.json`:
```json
{ "count": 1, "total": 1, "limit": 10, "page": 1, "items": [
  { "identifier": "COM99887", "emitterEntity": "Seguridad Social", "concept": "Variación de datos",
    "state": "Leida", "titularNif": "00000000X", "availabilityDate": "2026-06-02T10:00:00+02:00",
    "bondType": "TITULAR", "hasAnnexes": true } ] }
```

- [ ] **Step 2: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { normalizeNotification, normalizeCommunication, mergeDedupeSort } from "../src/core/normalize";
import notif from "./fixtures/realized_notifications.json";
import comun from "./fixtures/communications.json";

describe("normalize", () => {
  it("maps a notification, dating it by finalDate", () => {
    const u = normalizeNotification(notif.items[0]);
    expect(u).toMatchObject({ source: "notificacion", id: "ABC12345", emitter: "Agencia Tributaria",
      concept: "Requerimiento", state: "Comparecida", date: "2026-06-13T00:41:14+02:00",
      expirationDate: "2026-06-23T23:59:59+02:00", hasAnnexes: false });
  });

  it("maps a communication, dating it by availabilityDate, no expiration", () => {
    const u = normalizeCommunication(comun.items[0]);
    expect(u).toMatchObject({ source: "comunicacion", id: "COM99887", date: "2026-06-02T10:00:00+02:00",
      expirationDate: null, hasAnnexes: true });
  });

  it("merges, dedupes by source+id, sorts by date desc", () => {
    const a = normalizeNotification(notif.items[0]);
    const b = normalizeCommunication(comun.items[0]);
    const merged = mergeDedupeSort([a, b, { ...a }]);  // duplicate notif dropped
    expect(merged).toHaveLength(2);
    expect(new Date(merged[0].date) >= new Date(merged[1].date)).toBe(true);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run test/normalize.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Write minimal implementation**

```ts
import type { UnifiedItem } from "../types";

export function normalizeNotification(r: any): UnifiedItem {
  return { source: "notificacion", id: String(r.identifier), date: r.finalDate ?? r.availabilityDate,
    emitter: r.emitterEntity ?? "", concept: r.concept ?? "", state: r.state ?? "",
    expirationDate: r.expirationDate ?? null, hasAnnexes: !!r.hasAnnexes, raw: r };
}

export function normalizeCommunication(r: any): UnifiedItem {
  return { source: "comunicacion", id: String(r.identifier), date: r.availabilityDate,
    emitter: r.emitterEntity ?? "", concept: r.concept ?? "", state: r.state ?? "",
    expirationDate: r.expirationDate ?? null, hasAnnexes: !!r.hasAnnexes, raw: r };
}

export function mergeDedupeSort(items: UnifiedItem[]): UnifiedItem[] {
  const seen = new Map<string, UnifiedItem>();
  for (const it of items) seen.set(`${it.source}:${it.id}`, it);
  return [...seen.values()].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run test/normalize.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/core/normalize.ts test/normalize.test.ts test/fixtures && git commit -m "Add item normalizer and merge/dedupe/sort"
```

---

### Task 4: Crypto module (AES-GCM + key derivation)

**Files:**
- Create: `src/core/crypto.ts`, `test/crypto.test.ts`

**Interfaces:**
- Produces: `deriveKey(identity: string, salt: Uint8Array): Promise<CryptoKey>`, `randomSalt(): Uint8Array`, `encryptJSON(key, obj): Promise<string>` (base64 `iv.ct`), `decryptJSON<T>(key, blob): Promise<T>`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { webcrypto } from "node:crypto";
// @ts-expect-error expose WebCrypto for the module under test in Node
globalThis.crypto = webcrypto;
import { deriveKey, randomSalt, encryptJSON, decryptJSON } from "../src/core/crypto";

describe("crypto", () => {
  it("round-trips an object", async () => {
    const salt = randomSalt();
    const key = await deriveKey("00000000X", salt);
    const blob = await encryptJSON(key, { hello: "world", n: 1 });
    expect(blob).not.toContain("world");                       // ciphertext, not plaintext
    expect(await decryptJSON(key, blob)).toEqual({ hello: "world", n: 1 });
  });

  it("fails to decrypt with the wrong identity", async () => {
    const salt = randomSalt();
    const blob = await encryptJSON(await deriveKey("AAA", salt), { x: 1 });
    await expect(decryptJSON(await deriveKey("BBB", salt), blob)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/crypto.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
const enc = new TextEncoder();
const dec = new TextDecoder();
const b64 = (b: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b)));
const unb64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));

export function randomSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

export async function deriveKey(identity: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", enc.encode(identity), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 150000, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function encryptJSON(key: CryptoKey, obj: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(obj)));
  return `${b64(iv.buffer)}.${b64(ct)}`;
}

export async function decryptJSON<T>(key: CryptoKey, blob: string): Promise<T> {
  const [iv, ct] = blob.split(".");
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv) }, key, unb64(ct));
  return JSON.parse(dec.decode(pt)) as T;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/crypto.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/crypto.ts test/crypto.test.ts && git commit -m "Add AES-GCM crypto with identity-derived key"
```

---

### Task 5: Scan engine (chunked search orchestration)

**Files:**
- Create: `src/core/engine.ts`, `test/engine.test.ts`

**Interfaces:**
- Consumes: `Executor`, `DateWindow`, `UnifiedItem`, `Source`, `ScanProgress`; `generateWindows`; `normalizeNotification`/`normalizeCommunication`/`mergeDedupeSort`.
- Produces:
```ts
runScan(opts: {
  from: Date; to: Date; sources: Source[]; maxDays?: number; limit?: number;
  executor: Executor;
  onProgress?: (p: ScanProgress) => void;
  sleep?: (ms: number) => Promise<void>;     // injectable; default real setTimeout
  signal?: AbortSignal;
  onReauth?: () => Promise<void>;             // called on 401 before one retry
}): Promise<UnifiedItem[]>
```

- [ ] **Step 1: Write the failing test (pagination, throttle, 401-retry, 429-backoff, cancel)**

```ts
import { describe, it, expect, vi } from "vitest";
import { runScan } from "../src/core/engine";
import type { Executor, PageResult } from "../src/types";

const noSleep = () => Promise.resolve();
const d = (s: string) => new Date(s + "T12:00:00");

function execFrom(pages: Record<string, PageResult[]>): Executor {
  const calls: Record<string, number> = {};
  return { async fetchPage({ source }) {
    calls[source] = (calls[source] ?? 0);
    const arr = pages[source] ?? [{ total: 0, items: [] }];
    return arr[Math.min(calls[source]++, arr.length - 1)];
  } };
}

describe("runScan", () => {
  it("paginates until total is reached and merges sources", async () => {
    const exec = execFrom({
      notificacion: [
        { total: 2, items: [{ identifier: "N1", finalDate: "2026-06-10T00:00:00+02:00" }] },
        { total: 2, items: [{ identifier: "N2", finalDate: "2026-06-11T00:00:00+02:00" }] },
      ],
      comunicacion: [{ total: 0, items: [] }],
    });
    const out = await runScan({ from: d("2026-06-01"), to: d("2026-06-15"),
      sources: ["notificacion", "comunicacion"], executor: exec, sleep: noSleep, limit: 1 });
    expect(out.map(i => i.id).sort()).toEqual(["N1", "N2"]);
  });

  it("re-auths once on 401 then succeeds", async () => {
    let first = true;
    const exec: Executor = { async fetchPage() {
      if (first) { first = false; throw { status: 401 }; }
      return { total: 0, items: [] };
    } };
    const onReauth = vi.fn(async () => {});
    await runScan({ from: d("2026-06-01"), to: d("2026-06-10"), sources: ["notificacion"],
      executor: exec, sleep: noSleep, onReauth });
    expect(onReauth).toHaveBeenCalledOnce();
  });

  it("aborts when the signal fires", async () => {
    const ac = new AbortController(); ac.abort();
    const exec: Executor = { async fetchPage() { return { total: 0, items: [] }; } };
    await expect(runScan({ from: d("2026-06-01"), to: d("2026-06-10"), sources: ["notificacion"],
      executor: exec, sleep: noSleep, signal: ac.signal })).rejects.toThrow(/abort/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/engine.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { Executor, Source, UnifiedItem, ScanProgress } from "../types";
import { generateWindows } from "./windows";
import { normalizeNotification, normalizeCommunication, mergeDedupeSort } from "./normalize";

const realSleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export async function runScan(opts: {
  from: Date; to: Date; sources: Source[]; maxDays?: number; limit?: number;
  executor: Executor; onProgress?: (p: ScanProgress) => void;
  sleep?: (ms: number) => Promise<void>; signal?: AbortSignal; onReauth?: () => Promise<void>;
}): Promise<UnifiedItem[]> {
  const { executor, sources, onProgress, signal, onReauth } = opts;
  const sleep = opts.sleep ?? realSleep;
  const limit = opts.limit ?? 50;
  const windows = generateWindows(opts.from, opts.to, opts.maxDays ?? 28);
  const collected: UnifiedItem[] = [];

  const guard = () => { if (signal?.aborted) throw new Error("Scan aborted"); };
  const normalize = (s: Source, raw: unknown) =>
    s === "notificacion" ? normalizeNotification(raw) : normalizeCommunication(raw);

  async function fetchWithRetry(s: Source, window: any, page: number, reauthed = false): Promise<any> {
    try { return await executor.fetchPage({ source: s, window, page, limit }); }
    catch (e: any) {
      if (e?.status === 401 && !reauthed && onReauth) { await onReauth(); return fetchWithRetry(s, window, page, true); }
      if (e?.status === 429 || (e?.status >= 500 && e?.status < 600)) {
        await sleep(1000); return fetchWithRetry(s, window, page, reauthed);
      }
      throw e;
    }
  }

  for (let wi = 0; wi < windows.length; wi++) {
    const window = windows[wi];
    for (const s of sources) {
      let page = 1, total = Infinity, got = 0;
      while (got < total) {
        guard();
        const res = await fetchWithRetry(s, window, page);
        total = res.total;
        for (const raw of res.items) collected.push(normalize(s, raw));
        got += res.items.length;
        if (res.items.length === 0) break;
        page++;
        await sleep(300); // polite throttle
      }
    }
    onProgress?.({ windowIndex: wi + 1, windowCount: windows.length,
      from: window.start.toISOString(), to: window.end.toISOString(), itemCount: collected.length });
  }
  return mergeDedupeSort(collected);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/engine.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/engine.ts test/engine.test.ts && git commit -m "Add chunked-search scan engine with retry/backoff/cancel"
```

---

### Task 6: API executor + URL building

**Files:**
- Create: `src/page/executor.ts`, `test/executor.test.ts`

**Interfaces:**
- Consumes: `Executor`, `PageResult`, `DateWindow`, `Source`; `formatDDMMYYYY`.
- Produces: `buildQuery(source, window, page, limit): string`; `makeExecutor(getToken: () => string | null): Executor`.

- [ ] **Step 1: Write the failing test (pure URL building)**

```ts
import { describe, it, expect } from "vitest";
import { buildQuery } from "../src/page/executor";

const w = { start: new Date("2026-05-01T12:00:00"), end: new Date("2026-05-28T12:00:00") };

describe("buildQuery", () => {
  it("uses finalDate params + DD/MM/YYYY for notificaciones", () => {
    const q = buildQuery("notificacion", w, 2, 50);
    expect(q).toContain("/api/v1/realized_notifications?");
    expect(q).toContain("finalDate%5Bleft_date%5D=01%2F05%2F2026");
    expect(q).toContain("finalDate%5Bright_date%5D=28%2F05%2F2026");
    expect(q).toContain("page=2"); expect(q).toContain("limit=50");
  });
  it("uses availabilityDate params for comunicaciones", () => {
    const q = buildQuery("comunicacion", w, 1, 50);
    expect(q).toContain("/api/v1/communications?");
    expect(q).toContain("availabilityDate%5Bleft_date%5D=01%2F05%2F2026");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/executor.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { Executor, PageResult, Source, DateWindow } from "../types";
import { formatDDMMYYYY } from "../core/windows";

const BASE = "https://dehu.redsara.es";

export function buildQuery(source: Source, window: DateWindow, page: number, limit: number): string {
  const left = formatDDMMYYYY(window.start), right = formatDDMMYYYY(window.end);
  const p = new URLSearchParams();
  if (source === "notificacion") {
    p.set("finalDate[left_date]", left); p.set("finalDate[right_date]", right);
  } else {
    p.set("availabilityDate[left_date]", left); p.set("availabilityDate[right_date]", right);
  }
  p.set("page", String(page)); p.set("limit", String(limit));
  const path = source === "notificacion" ? "/api/v1/realized_notifications" : "/api/v1/communications";
  return `${BASE}${path}?${p.toString()}`;
}

export function makeExecutor(getToken: () => string | null): Executor {
  return { async fetchPage({ source, window, page, limit }): Promise<PageResult> {
    const token = getToken();
    const res = await fetch(buildQuery(source, window, page, limit), {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw { status: res.status };
    const json = await res.json();
    return { total: json.total ?? json.count ?? 0, items: json.items ?? [] };
  } };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/executor.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/page/executor.ts test/executor.test.ts && git commit -m "Add API executor and DD/MM/YYYY query builder"
```

---

### Task 7: Storage layer (namespaced, encrypted, incremental)

**Files:**
- Create: `src/page/storage.ts`, `test/storage.test.ts`

**Interfaces:**
- Consumes: `UnifiedItem`; `deriveKey`/`randomSalt`/`encryptJSON`/`decryptJSON`.
- Produces a `makeStore(identity: string, area: chrome.storage.StorageArea)` returning:
  `load(): Promise<{ items: UnifiedItem[]; lastSync: string | null }>`, `save(items, lastSync): Promise<void>`, `clear(): Promise<void>`.
  Namespacing: a stable hash of `identity` prefixes keys so users on one profile don't collide.

- [ ] **Step 1: Write the failing test (with a fake storage area)**

```ts
import { describe, it, expect } from "vitest";
import { webcrypto } from "node:crypto";
// @ts-expect-error
globalThis.crypto = webcrypto;
import { makeStore } from "../src/page/storage";

function fakeArea() {
  const data: Record<string, any> = {};
  return { async get(keys: string[]) { const o: any = {}; for (const k of keys) if (k in data) o[k] = data[k]; return o; },
    async set(obj: any) { Object.assign(data, obj); },
    async remove(keys: string[]) { for (const k of keys) delete data[k]; },
    _data: data } as any;
}

describe("storage", () => {
  it("round-trips items encrypted, isolating by identity", async () => {
    const area = fakeArea();
    const store = await makeStore("00000000X", area);
    const items = [{ source: "notificacion", id: "N1", date: "2026-06-10T00:00:00Z", emitter: "X",
      concept: "c", state: "s", expirationDate: null, hasAnnexes: false, raw: {} }] as any;
    await store.save(items, "2026-06-30");
    const blob = JSON.stringify(area._data);
    expect(blob).not.toContain("N1");                 // stored encrypted
    const loaded = await store.load();
    expect(loaded.items[0].id).toBe("N1");
    expect(loaded.lastSync).toBe("2026-06-30");
  });

  it("clear leaves no residue", async () => {
    const area = fakeArea();
    const store = await makeStore("00000000X", area);
    await store.save([] as any, "2026-06-30");
    await store.clear();
    expect(Object.keys(area._data)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/storage.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { UnifiedItem } from "../types";
import { deriveKey, randomSalt, encryptJSON, decryptJSON } from "../core/crypto";

async function nsHash(identity: string): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(identity));
  return [...new Uint8Array(h)].slice(0, 8).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function makeStore(identity: string, area: chrome.storage.StorageArea) {
  const ns = await nsHash(identity);
  const kBlob = `dehu:${ns}:blob`, kSalt = `dehu:${ns}:salt`, kSync = `dehu:${ns}:sync`;

  async function getKey(): Promise<CryptoKey> {
    const got = await area.get([kSalt]);
    let salt: Uint8Array;
    if (got[kSalt]) salt = Uint8Array.from(got[kSalt]);
    else { salt = randomSalt(); await area.set({ [kSalt]: [...salt] }); }
    return deriveKey(identity, salt);
  }

  return {
    async load(): Promise<{ items: UnifiedItem[]; lastSync: string | null }> {
      const got = await area.get([kBlob, kSync]);
      if (!got[kBlob]) return { items: [], lastSync: got[kSync] ?? null };
      try {
        const items = await decryptJSON<UnifiedItem[]>(await getKey(), got[kBlob]);
        return { items, lastSync: got[kSync] ?? null };
      } catch { return { items: [], lastSync: null }; }
    },
    async save(items: UnifiedItem[], lastSync: string): Promise<void> {
      const blob = await encryptJSON(await getKey(), items);
      await area.set({ [kBlob]: blob, [kSync]: lastSync });
    },
    async clear(): Promise<void> { await area.remove([kBlob, kSalt, kSync]); },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/storage.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/page/storage.ts test/storage.test.ts && git commit -m "Add encrypted, namespaced chrome.storage layer"
```

---

### Task 8: MAIN-world token hook + content-script capture

**Files:**
- Create: `src/page/token-hook.ts` (runs in MAIN world), `src/page/token-bridge.ts` (content-script side)
- Test: `test/token-bridge.test.ts`

**Interfaces:**
- `token-hook.ts`: self-installing; wraps `window.fetch` + `XMLHttpRequest.setRequestHeader` to read any `Authorization: Bearer …` and `window.postMessage({ source: "dehu-uni", token }, location.origin)`.
- `token-bridge.ts`: Produces `installTokenBridge(): () => string | null` — listens for those messages, stores the latest token, returns a getter. **Pure-ish:** the message parsing is unit-tested.

- [ ] **Step 1: Write the failing test for the bridge parser**

```ts
import { describe, it, expect } from "vitest";
import { parseTokenMessage } from "../src/page/token-bridge";

describe("parseTokenMessage", () => {
  it("extracts a token from a well-formed message", () => {
    expect(parseTokenMessage({ data: { source: "dehu-uni", token: "abc" }, origin: "https://dehu.redsara.es" },
      "https://dehu.redsara.es")).toBe("abc");
  });
  it("ignores foreign origins and shapes", () => {
    expect(parseTokenMessage({ data: { source: "evil", token: "x" }, origin: "https://evil.com" },
      "https://dehu.redsara.es")).toBeNull();
    expect(parseTokenMessage({ data: { source: "dehu-uni", token: "x" }, origin: "https://evil.com" },
      "https://dehu.redsara.es")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/token-bridge.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/page/token-bridge.ts`**

```ts
export function parseTokenMessage(ev: { data: any; origin: string }, expectedOrigin: string): string | null {
  if (ev.origin !== expectedOrigin) return null;
  const d = ev.data;
  if (d && d.source === "dehu-uni" && typeof d.token === "string" && d.token) return d.token;
  return null;
}

export function installTokenBridge(): () => string | null {
  let token: string | null = null;
  window.addEventListener("message", ev => {
    const t = parseTokenMessage(ev, location.origin);
    if (t) token = t;
  });
  return () => token;
}
```

- [ ] **Step 4: Implement `src/page/token-hook.ts` (MAIN world)**

```ts
// Injected into the page's MAIN world via a <script src> (web_accessible_resource).
(() => {
  const post = (token: string) => { try { window.postMessage({ source: "dehu-uni", token }, location.origin); } catch {} };
  const grab = (v: unknown) => { if (typeof v === "string" && /^Bearer\s+(.+)/i.test(v)) post(RegExp.$1); };

  const origFetch = window.fetch;
  window.fetch = function (input: any, init?: any) {
    try {
      const h = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
      const a = h.get("authorization"); if (a) grab(a);
    } catch {}
    return origFetch.apply(this, arguments as any);
  };

  const origSet = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.setRequestHeader = function (name: string, value: string) {
    if (String(name).toLowerCase() === "authorization") grab(value);
    return origSet.apply(this, arguments as any);
  };
})();
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run test/token-bridge.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/page/token-hook.ts src/page/token-bridge.ts test/token-bridge.test.ts && git commit -m "Add MAIN-world token hook and content-script bridge"
```

---

### Task 9: Service worker (toolbar click relay)

**Files:**
- Create: `src/background/service-worker.ts`

**Interfaces:**
- Consumes: `chrome.action`, `chrome.tabs`. Sends `{ type: "toggle-overlay" }` to the active DEHú tab; if the active tab is not DEHú, opens `https://dehu.redsara.es/es/home-view` in a new tab.

- [ ] **Step 1: Implement (verified manually; no unit test — pure chrome glue)**

```ts
const DEHU = "https://dehu.redsara.es/";
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id && tab.url?.startsWith(DEHU)) {
    chrome.tabs.sendMessage(tab.id, { type: "toggle-overlay" });
  } else {
    await chrome.tabs.create({ url: "https://dehu.redsara.es/es/home-view" });
  }
});
```

- [ ] **Step 2: Build and confirm it bundles**

Run: `npm run build`
Expected: `dist/service-worker.js` produced, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/background/service-worker.ts && git commit -m "Add service worker that relays the toolbar click"
```

---

### Task 10: Overlay UI (Shadow DOM mount, ported from mockup)

**Files:**
- Create: `src/ui/overlay.css.ts`, `src/ui/template.ts`, `src/ui/overlay.ts`
- Test: `test/template.test.ts`

**Interfaces:**
- `overlay.css.ts`: `export const CSS: string` — the styles from `mockups/index.html` (the `.overlay`, `.ext-bar`, `.control`, `.toolbar`, table, `.menu`, `.ext-foot`, `.fab` rules), scoped class names unchanged (Shadow DOM isolates them). **Drop the faux `.site`/`.browserbar` rules — those were mockup-only.** Rename the menu-state class to `.show` (never `.open`, to avoid the row-link `.open{opacity:0}` collision found during design).
- `template.ts`: `export function overlayHTML(): string` — the overlay markup from the mockup (ext-bar with gear + ✕ + menu, control bar, progress, toolbar, table, footer), with an empty `<tbody id="rows">`.
- `overlay.ts`: Produces `mountOverlay(): OverlayHandle` where
```ts
interface OverlayHandle {
  open(): void; close(): void; toggle(): void;
  root: ShadowRoot;
  els: { rows: HTMLElement; search: HTMLInputElement; sync: HTMLButtonElement;
         from: HTMLInputElement; to: HTMLInputElement; progress: HTMLElement;
         gear: HTMLElement; menu: HTMLElement; fab: HTMLElement; foot: HTMLElement; };
}
```

- [ ] **Step 1: Write the failing test for the template**

```ts
import { describe, it, expect } from "vitest";
import { overlayHTML } from "../src/ui/template";

describe("overlayHTML", () => {
  it("contains the key anchors the controller wires", () => {
    const h = overlayHTML();
    for (const id of ['id="rows"', 'id="sync"', 'id="search"', 'id="from"', 'id="to"',
                      'id="gear"', 'id="menu"', 'id="progress"', 'id="fab"'])
      expect(h).toContain(id);
    expect(h).toContain("solo lectura");   // safety copy present
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/template.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `template.ts` and `overlay.css.ts`**

Port markup/styles from `mockups/index.html`. `template.ts` returns the overlay HTML (ext-bar → scroll(control, progress, toolbar, count, table, safety) → footer) with stable `id`s matching the test. `overlay.css.ts` exports the mockup CSS string minus the `.site`/`.browserbar` rules, with `.menu.show` instead of `.menu.open`.

- [ ] **Step 4: Implement `overlay.ts`**

```ts
import { CSS } from "./overlay.css";
import { overlayHTML } from "./template";

export interface OverlayHandle { /* as declared in Interfaces */ open(): void; close(): void;
  toggle(): void; root: ShadowRoot; els: Record<string, any>; }

export function mountOverlay(): OverlayHandle {
  const host = document.createElement("div");
  host.id = "dehu-uni-host";
  document.documentElement.appendChild(host);
  const root = host.attachShadow({ mode: "open" });
  const style = document.createElement("style"); style.textContent = CSS; root.appendChild(style);
  const wrap = document.createElement("div"); wrap.innerHTML =
    `<div class="backdrop"></div><div class="overlay">${overlayHTML()}</div>
     <button class="fab" id="fab">⬡ Ver lista unificada</button>`;
  root.appendChild(wrap);

  const $ = (id: string) => root.getElementById(id) as any;
  const q = (s: string) => root.querySelector(s) as any;
  let isOpen = false;
  const setOpen = (v: boolean) => { isOpen = v;
    q(".backdrop").style.display = v ? "block" : "none";
    q(".overlay").style.display = v ? "flex" : "none";
    $("fab").style.display = v ? "none" : "flex";
    if (!v) $("menu").classList.remove("show");
  };
  setOpen(false);

  const els = { rows: $("rows"), search: $("search"), sync: $("sync"), from: $("from"), to: $("to"),
    progress: $("progress"), gear: $("gear"), menu: $("menu"), fab: $("fab"), foot: q(".ext-foot") };

  $("fab").addEventListener("click", () => setOpen(true));
  q(".overlay .x").addEventListener("click", () => setOpen(false));
  q(".backdrop").addEventListener("click", () => setOpen(false));
  els.gear.addEventListener("click", (e: Event) => { e.stopPropagation(); els.menu.classList.toggle("show"); });
  root.addEventListener("click", (e: Event) => { if (!els.menu.contains(e.target as Node)) els.menu.classList.remove("show"); });

  return { open: () => setOpen(true), close: () => setOpen(false),
    toggle: () => setOpen(!isOpen), root, els };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run test/template.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/ui && git commit -m "Add Shadow-DOM overlay UI ported from the mockup"
```

---

### Task 11: List rendering + client-side search/filter

**Files:**
- Create: `src/ui/render.ts`, `test/render.test.ts`

**Interfaces:**
- Consumes: `UnifiedItem`.
- Produces: `filterItems(items, { query, sources, state }): UnifiedItem[]`; `renderRows(tbody: HTMLElement, items: UnifiedItem[]): void`; `rowHTML(item): string` (read-only row; the open link points to `https://dehu.redsara.es/es/notifications`).

- [ ] **Step 1: Write the failing test (pure filter)**

```ts
import { describe, it, expect } from "vitest";
import { filterItems } from "../src/ui/render";

const mk = (o: any) => ({ source: "notificacion", id: "x", date: "2026-06-10T00:00:00Z",
  emitter: "Agencia Tributaria", concept: "IRPF", state: "Pendiente", expirationDate: null,
  hasAnnexes: false, raw: {}, ...o });

describe("filterItems", () => {
  const items = [mk({ id: "1", emitter: "Agencia Tributaria", concept: "IRPF" }),
                 mk({ id: "2", source: "comunicacion", emitter: "Seguridad Social", concept: "Cotización", state: "Leida" })];
  it("matches query against emitter and concept, case-insensitive", () => {
    expect(filterItems(items, { query: "irpf", sources: ["notificacion","comunicacion"], state: "all" }).map(i=>i.id)).toEqual(["1"]);
    expect(filterItems(items, { query: "seguridad", sources: ["notificacion","comunicacion"], state: "all" }).map(i=>i.id)).toEqual(["2"]);
  });
  it("filters by source and state", () => {
    expect(filterItems(items, { query: "", sources: ["comunicacion"], state: "all" }).map(i=>i.id)).toEqual(["2"]);
    expect(filterItems(items, { query: "", sources: ["notificacion","comunicacion"], state: "Pendiente" }).map(i=>i.id)).toEqual(["1"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — Run: `npx vitest run test/render.test.ts`; Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

```ts
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

export function rowHTML(i: UnifiedItem): string {
  const badge = i.source === "notificacion" ? "n" : "c";
  const label = i.source === "notificacion" ? "● Notificación" : "● Comunicación";
  return `<tr><td class="date">${fmt(i.date)}</td>
    <td><span class="badge ${badge}">${label}</span></td>
    <td class="emitter">${esc(i.emitter)}</td><td class="concept">${esc(i.concept)}</td>
    <td><span class="state">${esc(i.state)}</span></td>
    <td class="date">${i.expirationDate ? fmt(i.expirationDate) : "—"}</td>
    <td>${i.hasAnnexes ? "📎" : ""}</td>
    <td><a class="open" href="https://dehu.redsara.es/es/notifications" target="_blank" rel="noopener">Abrir en DEHú ↗</a></td></tr>`;
}

export function renderRows(tbody: HTMLElement, items: UnifiedItem[]): void {
  tbody.innerHTML = items.map(rowHTML).join("");
}
```

- [ ] **Step 4: Run test to verify it passes** — Run: `npx vitest run test/render.test.ts`; Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/render.ts test/render.test.ts && git commit -m "Add list rendering and client-side filtering"
```

---

### Task 12: CSV export

**Files:**
- Create: `src/ui/csv.ts`, `test/csv.test.ts`

**Interfaces:**
- Produces: `toCSV(items: UnifiedItem[]): string`; `downloadCSV(items): void` (creates a Blob + anchor click).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { toCSV } from "../src/ui/csv";

describe("toCSV", () => {
  it("emits a header and quotes fields containing separators", () => {
    const csv = toCSV([{ source: "notificacion", id: "1", date: "2026-06-10T00:00:00Z",
      emitter: 'Agencia, Tributaria', concept: "IRPF", state: "Pendiente", expirationDate: null,
      hasAnnexes: false, raw: {} } as any]);
    const lines = csv.trim().split("\n");
    expect(lines[0]).toBe("Fecha;Tipo;Organismo;Concepto;Estado;Caduca");
    expect(lines[1]).toContain('"Agencia, Tributaria"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — Run: `npx vitest run test/csv.test.ts`; Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { UnifiedItem } from "../types";

const fmt = (iso: string | null) => { if (!iso) return ""; const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()}`; };
const cell = (s: string) => /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;

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
```

- [ ] **Step 4: Run test to verify it passes** — Run: `npx vitest run test/csv.test.ts`; Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/csv.ts test/csv.test.ts && git commit -m "Add CSV export"
```

---

### Task 13: Content-script wiring (tie it all together)

**Files:**
- Create: `src/page/content.ts`
- Modify: none (entry point only)

**Interfaces:**
- Consumes everything: `installTokenBridge`, `makeExecutor`, `makeStore`, `mountOverlay`, `runScan`, `filterItems`/`renderRows`, `downloadCSV`, identity capture.
- Injects `token-hook.js` (web-accessible) into the page MAIN world, mounts the overlay, wires Sync → runScan, progress, search/filter chips, settings menu (storage opt-in default on, "borrar al cerrar", "borrar datos guardados"), footer last-sync, incremental sync, and listens for the SW `toggle-overlay` message.

- [ ] **Step 1: Implement `content.ts`**

```ts
import { installTokenBridge } from "./token-bridge";
import { makeExecutor } from "./executor";
import { makeStore } from "./storage";
import { mountOverlay } from "../ui/overlay";
import { runScan } from "../core/engine";
import { filterItems, renderRows } from "../ui/render";
import { downloadCSV } from "../ui/csv";
import type { Source, UnifiedItem } from "../types";

function injectHook() {
  const s = document.createElement("script");
  s.src = chrome.runtime.getURL("dist/token-hook.js");
  s.onload = () => s.remove();
  (document.head || document.documentElement).appendChild(s);
}

async function fetchIdentity(getToken: () => string | null): Promise<string | null> {
  // The SPA already loaded /api/v1/user/{id}; read identity from the user endpoint via same-origin fetch.
  // Fallback: null -> storage disabled until identity is known.
  try {
    const res = await fetch("https://dehu.redsara.es/api/v1/user", { credentials: "include",
      headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {} });
    if (!res.ok) return null;
    const j = await res.json();
    return j?.person?.identifier ?? null;
  } catch { return null; }
}

(async function main() {
  injectHook();
  const getToken = installTokenBridge();
  const overlay = mountOverlay();
  const executor = makeExecutor(getToken);

  let all: UnifiedItem[] = [];
  let store: Awaited<ReturnType<typeof makeStore>> | null = null;
  let storageOn = true;
  let abort: AbortController | null = null;

  const sourcesSelected = (): Source[] => {
    const out: Source[] = [];
    overlay.root.querySelectorAll<HTMLElement>(".toggle.on .dot").forEach(d =>
      out.push(d.classList.contains("n") ? "notificacion" : "comunicacion"));
    return out.length ? out : ["notificacion", "comunicacion"];
  };

  const apply = () => {
    const query = overlay.els.search.value;
    const state = (overlay.root.querySelector(".chip.on") as HTMLElement)?.dataset.state ?? "all";
    renderRows(overlay.els.rows, filterItems(all, { query, sources: ["notificacion","comunicacion"], state }));
  };
  overlay.els.search.addEventListener("input", apply);

  // load cached data on mount
  const identity = await fetchIdentity(getToken);
  if (identity) {
    store = await makeStore(identity, chrome.storage.local);
    const cached = await store.load();
    all = cached.items;
    if (cached.lastSync) overlay.els.foot.textContent =
      `🔒 Datos cifrados con tu identidad de DEHú · Última sincronización: ${cached.lastSync}`;
    apply();
  }

  overlay.els.sync.addEventListener("click", async () => {
    abort = new AbortController();
    const from = new Date(overlay.els.from.value), to = new Date(overlay.els.to.value);
    const items = await runScan({ from, to, sources: sourcesSelected(), executor,
      signal: abort.signal,
      onReauth: async () => { /* token refreshed by SPA; getToken() returns latest */ },
      onProgress: p => { overlay.els.progress.textContent =
        `Escaneando ventana ${p.windowIndex} de ${p.windowCount} · ${p.itemCount} elementos`; } });
    all = items;
    apply();
    if (storageOn && store) { const now = new Date().toISOString().slice(0,10); await store.save(all, now); }
  });

  overlay.root.querySelector(".export")?.addEventListener("click", () => downloadCSV(all));

  // settings menu
  overlay.root.querySelector<HTMLInputElement>("#opt-store")?.addEventListener("change", e => {
    storageOn = (e.target as HTMLInputElement).checked;
    if (!storageOn && store) store.clear();
  });
  overlay.root.querySelector(".danger")?.addEventListener("click", async () => { if (store) await store.clear(); all = []; apply(); });

  chrome.runtime.onMessage.addListener(msg => { if (msg?.type === "toggle-overlay") overlay.toggle(); });
})();
```

- [ ] **Step 2: Build and typecheck**

Run: `npm run build && npm run typecheck`
Expected: `dist/content.js`, `dist/token-hook.js`, `dist/service-worker.js` produced; no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/page/content.ts && git commit -m "Wire content script: hook, overlay, scan, persistence, settings"
```

---

### Task 14: Icons, manifest finalization, and manual verification

**Files:**
- Create: `icons/16.png`, `icons/48.png`, `icons/128.png` (simple violet hexagon placeholder)
- Modify: `manifest.json` (confirm `web_accessible_resources` includes `dist/token-hook.js`)

- [ ] **Step 1: Add placeholder icons** (any 16/48/128 png; violet hexagon to match the brand).

- [ ] **Step 2: Full build** — Run: `npm run build`; Expected: clean `dist/`.

- [ ] **Step 3: Manual load-unpacked verification (record results)**

1. Chrome → `chrome://extensions` → Developer mode → Load unpacked → select repo root.
2. Log into `dehu.redsara.es` with certificate/Cl@ve.
3. Click the toolbar icon → overlay opens. Also confirm the on-page floating button opens it.
4. Set a date range spanning several months → **Sincronizar** → progress advances window-by-window; unified list fills with both Notificaciones and Comunicaciones.
5. **Probe the 30-day limit:** temporarily set `maxDays` high (e.g. 90) and watch the Network tab — confirm whether the server 4xx's a wide window. Record the real maximum; set the default `maxDays` accordingly (≤ confirmed max, with margin).
6. Search/filter/sort work instantly; CSV exports; row "Abrir en DEHú ↗" deep-links.
7. Reload the page → cached list appears without re-scanning; footer shows last-sync.
8. ⚙ → uncheck "Guardar datos" and "Borrar datos guardados" → reload → cache gone.

- [ ] **Step 4: Run full test suite** — Run: `npm test`; Expected: all tasks' tests PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "Add icons and finalize manifest; manual verification notes"
```

---

### Task 15: Store packaging (Chrome Web Store + Firefox AMO)

**Files:**
- Create: `scripts/package.mjs` (zips the extension), `STORE.md` (listing copy + privacy note)

- [ ] **Step 1: Implement `scripts/package.mjs`** — produce `web-ext-artifacts/dehu-unificado.zip` containing `manifest.json`, `dist/`, `icons/` (exclude `src/`, `test/`, `recon/`, `mockups/`, `node_modules/`).

- [ ] **Step 2: Write `STORE.md`** — Spanish listing description, the read-only/legal-act disclaimer, the privacy note (only the user's own DEHú data, stored locally and encrypted, never transmitted anywhere).

- [ ] **Step 3: Build the package** — Run: `node scripts/package.mjs`; Expected: zip produced.

- [ ] **Step 4: Commit**

```bash
git add scripts/package.mjs STORE.md && git commit -m "Add store packaging script and listing copy"
```

---

## Self-Review

**Spec coverage:** ✅ Extension shape (Tasks 1, 9, 14) · Bearer-token capture (Task 8) · same-origin executor + DD/MM/YYYY + both endpoints (Task 6) · chunked engine with fixed windows, throttle, 401/429/5xx, cancel (Tasks 2, 5) · 31-day-month fix (Task 2) · normalize/merge/dedupe (Task 3) · overlay + Shadow DOM + two openers + ✕/backdrop (Tasks 9, 10, 13) · search/filter/sort (Task 11) · CSV (Task 12) · settings menu + footer (Tasks 10, 13) · persistence: chrome.storage.local, namespaced, incremental, AES-GCM, identity-derived key, opt-in/borrar controls, no passphrase (Tasks 4, 7, 13) · read-only/deep-link safety (Tasks 6, 11) · testing across unit/integration/persistence (Tasks 2–8, 11, 12) + manual (Task 14) · store distribution (Task 15).

**Open items deferred to runtime (per spec):** the exact server-max window size and max `limit` are confirmed in Task 14 step 3, then the `maxDays`/`limit` defaults are set. Token storage location (in-memory vs web storage) is moot — the MAIN-world hook (Task 8) captures it from outgoing requests regardless.

**Placeholder scan:** no TBD/TODO; every code step has real code; manual-only steps (Tasks 9, 14) are explicitly justified as chrome-API glue / live-site checks rather than skipped tests.

**Type consistency:** `Executor.fetchPage`, `UnifiedItem`, `DateWindow`, `ScanProgress`, `Source` are defined in Task 1 and used unchanged throughout; `runScan` options and `makeStore`/`makeExecutor`/`mountOverlay` signatures match their consumers in Task 13.
