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
