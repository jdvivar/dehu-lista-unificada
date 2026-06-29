import { describe, it, expect } from "vitest";
import { toCSV } from "../src/ui/csv";

describe("toCSV", () => {
  it("emits a header and quotes fields containing separators", () => {
    const csv = toCSV([{ source: "notificacion", id: "1", date: "2026-06-10T00:00:00Z",
      emitter: 'Agencia, Tributaria', concept: "IRPF", state: "Pendiente", expirationDate: null,
      hasAnnexes: false, raw: {} } as any]);
    const lines = csv.trim().split("\n");
    expect(lines[0]).toBe("Fecha;Tipo;Organismo;Concepto;Estado;Caduca");
    expect(lines[1]).toContain('"Agencia, Tributaria"');
  });
});
