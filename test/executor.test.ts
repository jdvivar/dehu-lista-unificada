import { describe, it, expect } from "vitest";
import { buildQuery } from "../src/page/executor";

const w = { start: new Date("2026-05-01T12:00:00"), end: new Date("2026-05-28T12:00:00") };

describe("buildQuery", () => {
  it("uses finalDate params + DD/MM/YYYY for notificaciones", () => {
    const q = buildQuery("notificacion", w, 2, 50);
    expect(q).toContain("/api/v1/realized_notifications?");
    expect(q).toContain("finalDate%5Bleft_date%5D=01%2F05%2F2026");
    expect(q).toContain("finalDate%5Bright_date%5D=28%2F05%2F2026");
    expect(q).toContain("page=2"); expect(q).toContain("limit=50");
  });
  it("uses availabilityDate params for comunicaciones", () => {
    const q = buildQuery("comunicacion", w, 1, 50);
    expect(q).toContain("/api/v1/communications?");
    expect(q).toContain("availabilityDate%5Bleft_date%5D=01%2F05%2F2026");
  });
});
