import { describe, it, expect } from "vitest";
import { normalizeNotification, normalizeCommunication, mergeDedupeSort } from "../src/core/normalize";
import notif from "./fixtures/realized_notifications.json";
import comun from "./fixtures/communications.json";

describe("normalize", () => {
  it("maps a notification, dating it by finalDate", () => {
    const u = normalizeNotification(notif.items[0]);
    expect(u).toMatchObject({ source: "notificacion", id: "ABC12345", emitter: "Agencia Tributaria",
      concept: "Requerimiento", state: "Comparecida", date: "2026-06-13T00:41:14+02:00",
      expirationDate: "2026-06-23T23:59:59+02:00", hasAnnexes: false });
  });

  it("maps a communication, dating it by availabilityDate, no expiration", () => {
    const u = normalizeCommunication(comun.items[0]);
    expect(u).toMatchObject({ source: "comunicacion", id: "COM99887", date: "2026-06-02T10:00:00+02:00",
      expirationDate: null, hasAnnexes: true });
  });

  it("merges, dedupes by source+id, sorts by date desc", () => {
    const a = normalizeNotification(notif.items[0]);
    const b = normalizeCommunication(comun.items[0]);
    const merged = mergeDedupeSort([a, b, { ...a }]);  // duplicate notif dropped
    expect(merged).toHaveLength(2);
    expect(new Date(merged[0].date) >= new Date(merged[1].date)).toBe(true);
  });
});
