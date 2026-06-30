import { describe, it, expect } from "vitest";
import { parseTokenMessage, parseUserIdMessage } from "../src/page/token-bridge";

describe("parseTokenMessage", () => {
  it("extracts a token from a well-formed message", () => {
    expect(parseTokenMessage({ data: { source: "dehu-uni", token: "abc" }, origin: "https://dehu.redsara.es" },
      "https://dehu.redsara.es")).toBe("abc");
  });
  it("ignores foreign origins and shapes", () => {
    expect(parseTokenMessage({ data: { source: "evil", token: "x" }, origin: "https://evil.com" },
      "https://dehu.redsara.es")).toBeNull();
    expect(parseTokenMessage({ data: { source: "dehu-uni", token: "x" }, origin: "https://evil.com" },
      "https://dehu.redsara.es")).toBeNull();
  });
});

describe("parseUserIdMessage", () => {
  it("extracts a user id from a same-origin message", () => {
    expect(parseUserIdMessage({ data: { source: "dehu-uni", userId: "NTE5OTc2ODNM" }, origin: "https://dehu.redsara.es" },
      "https://dehu.redsara.es")).toBe("NTE5OTc2ODNM");
  });
  it("ignores foreign origins and token-only messages", () => {
    expect(parseUserIdMessage({ data: { source: "dehu-uni", userId: "x" }, origin: "https://evil.com" },
      "https://dehu.redsara.es")).toBeNull();
    expect(parseUserIdMessage({ data: { source: "dehu-uni", token: "x" }, origin: "https://dehu.redsara.es" },
      "https://dehu.redsara.es")).toBeNull();
  });
});
