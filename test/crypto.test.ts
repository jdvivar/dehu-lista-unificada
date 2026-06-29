import { describe, it, expect } from "vitest";
// Node 22 and the extension runtime both expose a global `crypto` (WebCrypto).
import { deriveKey, randomSalt, encryptJSON, decryptJSON } from "../src/core/crypto";

describe("crypto", () => {
  it("round-trips an object", async () => {
    const salt = randomSalt();
    const key = await deriveKey("00000000X", salt);
    const blob = await encryptJSON(key, { hello: "world", n: 1 });
    expect(blob).not.toContain("world");                       // ciphertext, not plaintext
    expect(await decryptJSON(key, blob)).toEqual({ hello: "world", n: 1 });
  });

  it("fails to decrypt with the wrong identity", async () => {
    const salt = randomSalt();
    const blob = await encryptJSON(await deriveKey("AAA", salt), { x: 1 });
    await expect(decryptJSON(await deriveKey("BBB", salt), blob)).rejects.toThrow();
  });
});
