// Injected into the page's MAIN world via a <script src> (web_accessible_resource).
// Wraps fetch + XHR to capture the Bearer token the DEHú SPA sends, and relays it
// to the content script via postMessage. Read-only: it never blocks or alters requests.
(() => {
  const post = (token: string) => {
    try { window.postMessage({ source: "dehu-uni", token }, location.origin); } catch { /* ignore */ }
  };
  const grab = (v: string | null) => {
    if (!v) return;
    const m = v.match(/^Bearer\s+(.+)/i);
    if (m) post(m[1]);
  };

  const origFetch = window.fetch;
  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    try {
      const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
      grab(headers.get("authorization"));
    } catch { /* ignore */ }
    return origFetch(input, init);
  };

  const origSet = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.setRequestHeader = function (this: XMLHttpRequest, name: string, value: string) {
    if (name.toLowerCase() === "authorization") grab(value);
    return origSet.call(this, name, value);
  };
})();
