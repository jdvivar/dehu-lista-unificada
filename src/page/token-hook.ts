// Injected into the page's MAIN world via a <script src> (web_accessible_resource).
// Wraps fetch + XHR to (a) capture the Bearer token the DEHú SPA sends, and (b) learn
// the user id from the SPA's own /api/v1/user/{id} request. Relays both to the content
// script via postMessage. Read-only: it never blocks or alters requests.
(() => {
  const post = (msg: Record<string, string>) => {
    try { window.postMessage({ source: "dehu-uni", ...msg }, location.origin); } catch { /* ignore */ }
  };
  const grabAuth = (v: string | null) => {
    if (!v) return;
    const m = v.match(/^Bearer\s+(.+)/i);
    if (m) post({ token: m[1] });
  };
  const grabId = (url: string | URL | null | undefined) => {
    if (!url) return;
    const m = String(url).match(/\/api\/v1\/user\/([^/?#]+)/);
    if (m) post({ userId: m[1] });
  };

  const origFetch = window.fetch;
  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    try {
      grabId(input instanceof Request ? input.url : (input as string | URL));
      const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
      grabAuth(headers.get("authorization"));
    } catch { /* ignore */ }
    return origFetch(input, init);
  };

  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, method: string, url: string | URL, ...rest: unknown[]) {
    try { grabId(url); } catch { /* ignore */ }
    return (origOpen as (...a: unknown[]) => void).call(this, method, url, ...rest);
  } as typeof XMLHttpRequest.prototype.open;

  const origSet = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.setRequestHeader = function (this: XMLHttpRequest, name: string, value: string) {
    if (name.toLowerCase() === "authorization") grabAuth(value);
    return origSet.call(this, name, value);
  };
})();
