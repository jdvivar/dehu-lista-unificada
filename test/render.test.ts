import { describe, it, expect } from "vitest";
import { filterItems, deepLink } from "../src/ui/render";

const mk = (o: any) => ({ source: "notificacion", id: "x", date: "2026-06-10T00:00:00Z",
  emitter: "Agencia Tributaria", concept: "IRPF", state: "Pendiente", expirationDate: null,
  hasAnnexes: false, raw: {}, ...o });

describe("filterItems", () => {
  const items = [mk({ id: "1", emitter: "Agencia Tributaria", concept: "IRPF" }),
                 mk({ id: "2", source: "comunicacion", emitter: "Seguridad Social", concept: "Cotización", state: "Leida" })];
  it("matches query against emitter and concept, case-insensitive", () => {
    expect(filterItems(items, { query: "irpf", sources: ["notificacion","comunicacion"], state: "all" }).map(i=>i.id)).toEqual(["1"]);
    expect(filterItems(items, { query: "seguridad", sources: ["notificacion","comunicacion"], state: "all" }).map(i=>i.id)).toEqual(["2"]);
  });
  it("filters by source and state", () => {
    expect(filterItems(items, { query: "", sources: ["comunicacion"], state: "all" }).map(i=>i.id)).toEqual(["2"]);
    expect(filterItems(items, { query: "", sources: ["notificacion","comunicacion"], state: "Pendiente" }).map(i=>i.id)).toEqual(["1"]);
  });
});

describe("deepLink", () => {
  it("links a realized notification by sentReference", () => {
    expect(deepLink(mk({ source: "notificacion", raw: { sentReference: "8b4bd097deadbeef" } }), "es"))
      .toBe("https://dehu.redsara.es/es/notifications/realized/8b4bd097deadbeef");
  });
  it("links a communication by sentReference", () => {
    expect(deepLink(mk({ source: "comunicacion", raw: { sentReference: "f3e9b3396dcafe" } }), "es"))
      .toBe("https://dehu.redsara.es/es/communication-detail/f3e9b3396dcafe");
  });
  it("honors the page language instead of hardcoding /es", () => {
    expect(deepLink(mk({ source: "notificacion", raw: { sentReference: "abc" } }), "ca"))
      .toBe("https://dehu.redsara.es/ca/notifications/realized/abc");
  });
  it("falls back to the tab when sentReference is missing", () => {
    expect(deepLink(mk({ source: "notificacion", raw: {} }), "es")).toBe("https://dehu.redsara.es/es/notifications");
    expect(deepLink(mk({ source: "comunicacion", raw: {} }), "gl")).toBe("https://dehu.redsara.es/gl/communications");
  });
});
