# DEHú Unificado

> ⚠️ **Beta.** This extension is under active development and releases are pre-releases until verified against the live site. Use at your own discretion.

A browser extension that shows your **DEHú** (*Dirección Electrónica Habilitada única*) **Notificaciones** and **Comunicaciones** in a **single, fully-searchable list** across any date range — working around two painful limitations of the official site:

1. Notificaciones and Comunicaciones live in separate tabs, never together.
2. Date-range search is capped at ~30-day windows.

The extension scans those 30-day windows for you behind the scenes and merges everything into one list you can search instantly.

## Privacy & safety

- **Read-only.** It only *reads* the listing endpoints of your own account. It never opens a notification or triggers a *comparecencia* (a legally-binding act). Every row links out to the official DEHú page to perform any legal action yourself.
- **Your data stays on your machine.** Fetched metadata is cached locally in the browser, **encrypted at rest** (AES-GCM, key derived from your live DEHú session). Nothing is ever sent anywhere else.
- **You control storage.** Toggle local storage off, clear it on demand, or auto-clear on close — handy on shared computers. (On a shared computer, prefer turning storage off; the encryption is not a substitute for that.)
- This is an **unofficial** tool, not affiliated with or endorsed by the Spanish government.

## Install

**From a release (recommended once available):** download `dehu-unificado.zip` from the [Releases](https://github.com/jdvivar/dehu-lista-unificada/releases) page, unzip it, then in your browser go to the extensions page → enable *Developer mode* → *Load unpacked* → select the unzipped folder.

**From source (development):**
```bash
npm install
npm run build      # bundles into dist/
```
Then load the repository root as an unpacked extension (`chrome://extensions` → Developer mode → Load unpacked).

## How it works

A content script on `dehu.redsara.es` captures your session's auth token (from the requests the site already makes), then replays the listing API across consecutive date windows, normalises and de-duplicates the results, and renders them in a Shadow-DOM overlay injected on the page. A thin service worker opens the overlay from the toolbar icon.

## Development

```bash
npm test           # unit + integration tests (Vitest)
npm run typecheck  # TypeScript, no emit
npm run build      # esbuild bundle
npm run package    # build + produce dehu-unificado.zip
```

Releases are automated with [release-please](https://github.com/googleapis/release-please) using [Conventional Commits](https://www.conventionalcommits.org); merging the release PR tags a (beta) release and a GitHub Action attaches the built `.zip`.

## License

[GPL-3.0-or-later](./LICENSE).
