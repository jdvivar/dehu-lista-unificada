// Generates a README banner screenshot from the REAL overlay CSS + markup (with
// fake data), so the image always matches the shipped UI. Writes screenshot.html;
// the screenshot itself is captured by Playwright (see npm run screenshot).
import * as esbuild from "esbuild";
import { writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = process.cwd();
const entry = `
import { CSS } from ${JSON.stringify(root + "/src/ui/overlay.css.ts")};
import { overlayHTML } from ${JSON.stringify(root + "/src/ui/template.ts")};
import { rowHTML } from ${JSON.stringify(root + "/src/ui/render.ts")};
export { CSS, overlayHTML, rowHTML };
`;
const outDir = join(tmpdir(), "dehu-shot");
mkdirSync(outDir, { recursive: true });
const bundle = join(outDir, "mods.mjs");
await esbuild.build({ stdin: { contents: entry, resolveDir: root, loader: "ts" }, bundle: true, format: "esm", outfile: bundle });
const { CSS, overlayHTML, rowHTML } = await import("file://" + bundle);

const item = (o) => ({ source: "notificacion", id: "x", date: "2026-06-10T09:00:00+02:00",
  emitter: "Organismo", concept: "Asunto", state: "Comparecida", expirationDate: null,
  hasAnnexes: false, raw: { sentReference: "x" }, ...o });

const fake = [
  item({ source: "notificacion", date: "2026-06-13T00:41:00+02:00", emitter: "Agencia Estatal de Administración Tributaria", concept: "Requerimiento de documentación — IRPF 2024", state: "Pendiente", expirationDate: "2026-06-23T23:59:59+02:00", hasAnnexes: true }),
  item({ source: "comunicacion", date: "2026-06-02T10:00:00+02:00", emitter: "Tesorería General de la Seguridad Social", concept: "Comunicación de variación de datos de cotización", state: "Leída" }),
  item({ source: "notificacion", date: "2026-05-21T12:30:00+02:00", emitter: "Dirección General de Tráfico", concept: "Notificación de sanción de tráfico — expediente 4471", state: "Comparecida", expirationDate: "2026-05-31T23:59:59+02:00" }),
  item({ source: "comunicacion", date: "2026-05-09T08:15:00+02:00", emitter: "Ayuntamiento de Madrid", concept: "Información sobre la tasa de residuos 2026", state: "Leída", hasAnnexes: true }),
  item({ source: "notificacion", date: "2026-04-27T17:45:00+02:00", emitter: "Agencia Estatal de Administración Tributaria", concept: "Inicio de procedimiento de comprobación limitada", state: "Caducada", expirationDate: "2026-05-07T23:59:59+02:00", hasAnnexes: true }),
  item({ source: "notificacion", date: "2026-04-15T11:00:00+02:00", emitter: "Instituto Nacional de la Seguridad Social", concept: "Resolución sobre prestación solicitada", state: "Comparecida", expirationDate: "2026-04-25T23:59:59+02:00" }),
  item({ source: "comunicacion", date: "2026-03-30T14:20:00+02:00", emitter: "Confederación Hidrográfica del Tajo", concept: "Comunicación de trámite de audiencia", state: "Leída" }),
];

const rows = fake.map(i => rowHTML(i, "es")).join("");
const inner = overlayHTML()
  .replace('<tbody id="rows"></tbody>', `<tbody id="rows">${rows}</tbody>`)
  .replace('<div class="count" id="count"></div>', '<div class="count" id="count">Mostrando 7 de 247 elementos</div>')
  .replace('<input type="date" id="from">', '<input type="date" id="from" value="2025-06-30">')
  .replace('<input type="date" id="to">', '<input type="date" id="to" value="2026-06-30">')
  .replace('<span id="lastsync"></span>', '<span id="lastsync">· Última sincronización: 30/06/2026</span>');

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
${CSS}
html,body{margin:0;height:100%;background:#e9eef5}
.site{position:fixed;inset:0;filter:blur(2px)}
.site .gov{background:#0b4a6f;color:#fff;padding:14px 28px;font:600 15px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
.site .gov small{font-weight:500;opacity:.85;margin-left:10px;font-size:12px}
.site .body{padding:26px}
.site .card{background:#fff;border:1px solid #e3e8ef;border-radius:10px;height:80px;max-width:780px;margin-bottom:14px}
</style></head><body>
<div class="site"><div class="gov">DEHú <small>Dirección Electrónica Habilitada única</small></div><div class="body"><div class="card"></div><div class="card"></div></div></div>
<div class="backdrop" style="display:block"></div>
<div class="overlay" style="display:flex">${inner}</div>
</body></html>`;

writeFileSync(join(outDir, "screenshot.html"), html);
console.log(join(outDir, "screenshot.html"));
