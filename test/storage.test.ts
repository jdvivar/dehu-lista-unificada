import { describe, it, expect } from "vitest";
// Node 22 and the extension runtime both expose a global `crypto` (WebCrypto).
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
    await store.save(items, { lastSync: "2026-06-30", coveredFrom: "2025-06-30", coveredTo: "2026-06-30" });
    const blob = JSON.stringify(area._data);
    expect(blob).not.toContain("N1");                 // stored encrypted
    const loaded = await store.load();
    expect(loaded.items[0].id).toBe("N1");
    expect(loaded.meta?.lastSync).toBe("2026-06-30");
    expect(loaded.meta?.coveredFrom).toBe("2025-06-30");
  });

  it("clear leaves no residue", async () => {
    const area = fakeArea();
    const store = await makeStore("00000000X", area);
    await store.save([] as any, { lastSync: "2026-06-30", coveredFrom: "2026-06-30", coveredTo: "2026-06-30" });
    await store.clear();
    expect(Object.keys(area._data)).toHaveLength(0);
  });
});
