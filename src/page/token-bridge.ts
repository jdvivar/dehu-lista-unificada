export function parseTokenMessage(ev: { data: any; origin: string }, expectedOrigin: string): string | null {
  if (ev.origin !== expectedOrigin) return null;
  const d = ev.data;
  if (d && d.source === "dehu-uni" && typeof d.token === "string" && d.token) return d.token;
  return null;
}

// Captures the live Bearer token relayed by the MAIN-world hook. `onToken` fires
// whenever a token is seen — used as the "logged in" signal to reveal the UI.
export function installTokenBridge(onToken?: (token: string) => void): () => string | null {
  let token: string | null = null;
  window.addEventListener("message", ev => {
    const t = parseTokenMessage(ev, location.origin);
    if (t) { token = t; onToken?.(t); }
  });
  return () => token;
}
