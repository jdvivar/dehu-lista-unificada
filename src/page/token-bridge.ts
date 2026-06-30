export function parseTokenMessage(ev: { data: any; origin: string }, expectedOrigin: string): string | null {
  if (ev.origin !== expectedOrigin) return null;
  const d = ev.data;
  if (d && d.source === "dehu-uni" && typeof d.token === "string" && d.token) return d.token;
  return null;
}

export function parseUserIdMessage(ev: { data: any; origin: string }, expectedOrigin: string): string | null {
  if (ev.origin !== expectedOrigin) return null;
  const d = ev.data;
  if (d && d.source === "dehu-uni" && typeof d.userId === "string" && d.userId) return d.userId;
  return null;
}

// Captures the live Bearer token and the user id relayed by the MAIN-world hook.
// `onToken` fires whenever a token is seen (the "logged in" signal); `onUserId`
// fires with the stable identity used for storage namespacing + encryption.
export function installTokenBridge(
  onToken?: (token: string) => void,
  onUserId?: (id: string) => void,
): () => string | null {
  let token: string | null = null;
  window.addEventListener("message", ev => {
    const t = parseTokenMessage(ev, location.origin);
    if (t) { token = t; onToken?.(t); }
    const id = parseUserIdMessage(ev, location.origin);
    if (id) onUserId?.(id);
  });
  return () => token;
}
