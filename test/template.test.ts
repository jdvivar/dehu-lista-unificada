import { describe, it, expect } from "vitest";
import { overlayHTML } from "../src/ui/template";

describe("overlayHTML", () => {
  it("contains the key anchors the controller wires", () => {
    const h = overlayHTML();
    // note: #fab lives in overlay.ts (sibling of .overlay), not in this template
    for (const id of ['id="rows"', 'id="sync"', 'id="search"', 'id="from"', 'id="to"',
                      'id="gear"', 'id="menu"', 'id="progress"'])
      expect(h).toContain(id);
    expect(h).toContain("solo lectura");   // safety copy present
    expect(h).toContain("BETA");           // beta label (not "EXTENSIÓN")
    expect(h).not.toContain("EXTENSIÓN");
    expect(h).toContain("github.com/jdvivar/dehu-lista-unificada"); // GitHub + feedback links
    expect(h).toContain("Enviar comentario");
  });
});
