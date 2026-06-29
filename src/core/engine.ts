import type { Executor, Source, UnifiedItem, ScanProgress, DateWindow } from "../types";
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

  async function fetchWithRetry(s: Source, window: DateWindow, page: number, reauthed = false): Promise<any> {
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
