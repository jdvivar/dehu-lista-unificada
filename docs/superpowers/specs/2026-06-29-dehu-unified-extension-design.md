# DEHú Unified List — Browser Extension Design

**Date:** 2026-06-29
**Status:** Design approved, pending spec review

## Problem

DEHú (`dehu.redsara.es`, the Spanish *Dirección Electrónica Habilitada única*) has two
UX problems for citizens/companies checking their electronic notifications:

1. **Split views.** *Notificaciones* and *Comunicaciones* live in separate tabs, never in
   one list.
2. **30-day search cap.** Date-range search is limited to ~30-day windows. If you don't
   know the exact dates, finding something means tedious window-by-window scanning, and
   naive month-by-month searching breaks on 31-day months.

We want a tool for **non-technical users** that shows *Notificaciones* + *Comunicaciones*
in **one unified, fully-searchable list** spanning an arbitrary date range, by automating
the 30-day-window scanning behind the scenes.

## Why a browser extension (not Electron, not a CLI, not a web page)

The hard constraint is reusing the **authenticated DEHú session**, which is established
with a digital certificate or Cl@ve. That session cannot be delegated:

- A separate **web page** can't read DEHú's session/token (same-origin policy). Ruled out.
- A **CLI** is too technical for the target users. Ruled out.
- **Electron** works but, distributed unsigned via GitHub/brew, forces non-tech users
  through Gatekeeper/SmartScreen warnings — defeating the audience. It also can't reuse the
  existing browser login (it would re-host it).
- A **browser extension** wins: one-click store install (no code-signing), it runs *inside*
  the already-authenticated session, and the task (read the site's own JSON API, show a
  list) is squarely within extension capabilities. Its one real limitation — unattended
  background runs — is irrelevant because this tool is **on-demand**.

**Distribution:** Chrome Web Store (covers Chrome/Edge/Brave) + Firefox AMO. Source on
GitHub. Safari is out of scope.

## Reconnaissance findings (captured 2026-06-29 from the live site)

Auth and endpoints were confirmed by recording (structure-only, values masked) the real
network traffic of a logged-in session.

- **Auth = Bearer token (JWT).** Every `/api/v1/*` call carries `Authorization: Bearer …`.
  The token + `refreshToken` + `refreshTokenExpiration` come from `GET /api/v1/user/{id}`.
  The browser does **not** attach this automatically — the Angular app adds it via an HTTP
  interceptor. **Implication:** our executor must obtain the token itself.
- **Notificaciones endpoint:** `GET /api/v1/realized_notifications`
  - Date filter: `finalDate[left_date]`, `finalDate[right_date]` — format **`DD/MM/YYYY`**.
  - Other params: `emitterEntityCode, state, publicId, titularNif, bondType,
    vinculoReceptor, postalDelivery, expirationDate[left_date]/[right_date], page, limit`.
  - Response envelope: `{ count, total, limit, page, items: [...] }`.
  - Item fields: `identifier, emitterEntity, emitterSourceEntity, vinculoReceptor,
    nifTitular, sentReference, state, concept, postalDelivery, availabilityDate,
    expirationDate, finalDate, bondType, hasAnnexes, notificationPriority, assuranceLevel`.
- **Comunicaciones endpoint:** `GET /api/v1/communications`
  - Date filter: `availabilityDate[left_date]`, `availabilityDate[right_date]` — `DD/MM/YYYY`.
  - Same `{ count, total, limit, page, items: [...] }` envelope.
- **Pagination:** `page` (1-based) + `limit` (UI uses 10; probe whether 50/100 is accepted).
  `total` signals when to stop.
- **30-day limit:** the UI self-clamps to a 30-day window; whether the **server** rejects a
  wider range is **unconfirmed** and will be probed at runtime (see engine).

## Architecture

Four components:

1. **Content script** (only on `dehu.redsara.es`). Injects a **page-context (MAIN world)
   hook** that wraps `fetch`/`XHR` to capture the live `Authorization: Bearer` header (and
   observe token refreshes). Performs the authenticated API calls (same-origin → cookies
   auto-attach, no CORS) using the captured token, on command from the app page.
2. **App page** — a full extension page opened as its own tab
   (`chrome-extension://…/app.html`). The brain + UI: owns the chunked-search
   orchestration, results, the unified list, search/filter, export, IndexedDB. Survives as
   long as the tab is open (no MV3 service-worker timeout).
3. **Service worker (background)** — thin wiring only: opens the app page on toolbar click,
   relays messages. No long-running work by design.
4. **Storage** — IndexedDB in the app page, keyed by item `id`, caching results so
   re-opening is instant and re-sync only re-fetches recent windows.

**Data flow (on-demand):** user logs into DEHú normally → opens the app tab → clicks
**Sync** → app page drives the content script through 30-day(ish) windows for both sources
→ results stream back, normalized/merged/deduped/persisted → unified searchable list renders.

**Fallback:** if same-origin execution from the content script is blocked, fetch from the
app page using `host_permissions` + the captured token (same design, different executor).

## The chunked-search engine

**Window generation** (kills the 31-day-month bug): walk the user's full range in **fixed
N-day windows by date arithmetic**, never by calendar month, so month length is irrelevant.
`N` defaults to a safe **28 days**. On first sync, **probe** with one wide window (e.g. 90
days): if the server accepts it, raise `N` (faster scan); if it 4xx's, fall back to 28. No
gaps, no overlaps.

**Scan loop:**
1. For each window, for each selected source, page through (`page=1,2,…` until
   `collected ≥ total`), with a **~300 ms throttle** between calls (gentle on a gov server).
2. Normalize each item to a unified record:
   `{ source: 'notificacion'|'comunicacion', id: identifier, date, emitter: emitterEntity,
   concept, state, expirationDate, hasAnnexes, raw }`
   where `date` = `finalDate` (notificaciones) or `availabilityDate` (comunicaciones).
3. **Merge** both streams, **dedupe** by `(source, id)`, **sort by date desc**.

**Result:** the full range is pulled **once**; thereafter all search/filter/sort is
**client-side and instant**.

**Resilience:** checkpoint after each completed window (resume/cancel a long scan); on
**401** mid-scan, re-read the freshly-refreshed token from the page hook and retry; on
**429/5xx**, exponential backoff; if a window is rejected for size, shrink `N` and retry.
Progress UI: "window X of N · M items so far," cancellable.

## Unified-list UI

Single full-tab page:

- **Control bar:** date-range picker (default last 12 months), source toggles
  (Notificaciones / Comunicaciones / both), **Sync** button, live progress.
- **Search/filter (client-side, instant):** free-text over `concept` + `emitter`; chips for
  source, state, and date sort.
- **List rows:** date · source badge · emitter · concept · state · expiration · 📎 annex flag.
- **Export:** CSV of the current filtered view.

## Scope & safety (hard constraints)

- **Read-only metadata + search.** The app only calls the **listing** endpoints, throttled,
  on the user's **own** data.
- **No legal acts.** Opening a *pending* notification on DEHú is a legally-binding act
  (*comparecencia* / acuse de recibo). The app **never** triggers acceptance. Row clicks
  **deep-link to the official DEHú page** to perform any actual legal act.
- **No credential handling.** The user authenticates on DEHú themselves; we only reuse the
  token the live session already sends.

## Testing

- **Unit:** window generator (leap years, DST, single-day, reversed range, 31-day month);
  normalize/merge/dedupe — using the **captured response shapes as fixtures**.
- **Integration:** mock executor replaying recorded fixtures — pagination stop conditions,
  token refresh on 401, backoff.
- **Manual:** load-unpacked against the live site. No automated E2E (auth + legal effects).

## Out of scope (for now)

- Unattended/scheduled background checks and notifications (would require Electron/service).
- Re-implementing notification detail view, document/annex download, or comparecencia.
- Safari support.
- Empowerment/successions (apoderamiento/sucesiones) flows seen in the API.

## Open questions (resolve during implementation)

- Exact server-enforced maximum window size (probe at runtime).
- Maximum accepted `limit` per page (probe; default 10).
- Where the SPA holds the token (in-memory vs storage) — determines whether the MAIN-world
  fetch hook is strictly required or storage reads suffice.
