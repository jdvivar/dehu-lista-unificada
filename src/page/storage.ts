import type { UnifiedItem } from "../types";
import { deriveKey, randomSalt, encryptJSON, decryptJSON } from "../core/crypto";

export interface StoreMeta {
  lastSync: string;      // YYYY-MM-DD of the last successful sync
  coveredFrom: string;   // oldest date scanned (YYYY-MM-DD)
  coveredTo: string;     // newest date scanned (YYYY-MM-DD)
}

async function nsHash(identity: string): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(identity));
  return [...new Uint8Array(h)].slice(0, 8).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function makeStore(identity: string, area: chrome.storage.StorageArea) {
  const ns = await nsHash(identity);
  const kBlob = `dehu:${ns}:blob`, kSalt = `dehu:${ns}:salt`, kMeta = `dehu:${ns}:meta`;

  async function getKey(): Promise<CryptoKey> {
    const got = await area.get([kSalt]);
    let salt: Uint8Array;
    if (got[kSalt]) salt = Uint8Array.from(got[kSalt]);
    else { salt = randomSalt(); await area.set({ [kSalt]: [...salt] }); }
    return deriveKey(identity, salt);
  }

  return {
    async load(): Promise<{ items: UnifiedItem[]; meta: StoreMeta | null }> {
      const got = await area.get([kBlob, kMeta]);
      const meta = (got[kMeta] as StoreMeta) ?? null;
      if (!got[kBlob]) return { items: [], meta };
      try {
        const items = await decryptJSON<UnifiedItem[]>(await getKey(), got[kBlob]);
        return { items, meta };
      } catch { return { items: [], meta: null }; }
    },
    async save(items: UnifiedItem[], meta: StoreMeta): Promise<void> {
      const blob = await encryptJSON(await getKey(), items);
      await area.set({ [kBlob]: blob, [kMeta]: meta });
    },
    async clear(): Promise<void> { await area.remove([kBlob, kSalt, kMeta]); },
  };
}
