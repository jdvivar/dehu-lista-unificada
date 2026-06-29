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
