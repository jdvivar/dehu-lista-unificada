// Styles for the overlay, injected into the Shadow DOM (isolated from DEHú's CSS).
// Ported from mockups/index.html — the faux .site/.browserbar rules are dropped,
// and the menu-open state uses .show (never .open, which collides with the row link).
export const CSS = `
:host { all: initial; }
* { box-sizing: border-box; }
.backdrop, .overlay, .fab {
  font: 14px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
.backdrop { position: fixed; inset: 0; background: rgba(15,23,42,.45); z-index: 2147483640; }
.overlay { position: fixed; inset: 28px; z-index: 2147483641; background: #f4f6f9; color: #1c2533;
  border-radius: 16px; box-shadow: 0 24px 70px rgba(0,0,0,.4); display: flex; flex-direction: column;
  overflow: hidden; border: 2px solid #6d28d9; }

.ext-bar { background: #6d28d9; color: #fff; padding: 11px 18px; display: flex; align-items: center; gap: 11px; position: relative; }
.ext-bar .hex { font-size: 16px; }
.ext-bar .title { font-weight: 700; letter-spacing: -.2px; }
.ext-bar .tag { font-size: 11px; background: rgba(255,255,255,.2); padding: 2px 8px; border-radius: 99px; font-weight: 600; }
.ext-bar .sub { font-size: 12px; opacity: .85; margin-left: 4px; }
.ext-bar .iconbtn { cursor: pointer; font-size: 17px; line-height: 1; opacity: .92; background: rgba(255,255,255,.12);
  width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
.ext-bar .iconbtn:hover { background: rgba(255,255,255,.22); }
.ext-bar .gear { margin-left: auto; }
.ext-bar .x { font-size: 20px; }

.menu { position: absolute; top: 50px; right: 14px; width: 300px; background: #fff; color: #1c2533;
  border: 1px solid #e3e8ef; border-radius: 12px; box-shadow: 0 20px 54px rgba(0,0,0,.28); padding: 7px; z-index: 60; display: none; }
.menu.show { display: block; }
.menu h4 { margin: 7px 11px 3px; font-size: 10.5px; text-transform: uppercase; letter-spacing: .5px; color: #64748b; }
.menu .row { display: flex; align-items: center; gap: 10px; padding: 9px 11px; border-radius: 8px; font-size: 13px; cursor: pointer; }
.menu .row:hover { background: #f6f5fb; }
.menu .row input { accent-color: #6d28d9; width: 16px; height: 16px; margin: 0; }
.menu .row small { display: block; color: #64748b; font-size: 11px; font-weight: 400; }
.menu hr { border: 0; border-top: 1px solid #e3e8ef; margin: 5px 4px; }
.menu .danger { color: #b91c1c; font-weight: 600; }

.scroll { flex: 1; overflow: auto; }
.control { background: #fff; border-bottom: 1px solid #e3e8ef; padding: 13px 20px; display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-end; }
.field { display: flex; flex-direction: column; gap: 4px; }
.field label { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: .4px; }
.field input[type=date] { padding: 7px 9px; border: 1px solid #e3e8ef; border-radius: 7px; font: inherit; background: #fff; }
.toggles { display: flex; gap: 8px; }
.toggle { display: flex; align-items: center; gap: 6px; padding: 7px 11px; border: 1px solid #e3e8ef; border-radius: 7px; cursor: pointer; background: #fff; user-select: none; }
.toggle.on { border-color: #6d28d9; background: #f5f3ff; }
.toggle .dot { width: 9px; height: 9px; border-radius: 50%; }
.dot.n { background: #2563eb; } .dot.c { background: #0d9488; }
.toggle:not(.on) { opacity: .55; }
button.sync { margin-left: auto; background: #6d28d9; color: #fff; border: 0; padding: 10px 18px; border-radius: 8px; font-weight: 600; cursor: pointer; }
button.sync:disabled { opacity: .6; cursor: default; }

.progress { padding: 9px 20px; background: #f5f3ff; border-bottom: 1px solid #e3e8ef; font-size: 13px; color: #5b21b6; display: flex; align-items: center; gap: 12px; }
.progress[hidden] { display: none; }
.bar { flex: 1; height: 6px; background: #ddd6fe; border-radius: 4px; overflow: hidden; max-width: 320px; }
.bar > i { display: block; height: 100%; width: 0; background: #6d28d9; transition: width .2s; }
.progress .cancel { color: #5b21b6; cursor: pointer; text-decoration: underline; }

.toolbar { padding: 12px 20px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.search { flex: 1; min-width: 220px; position: relative; }
.search input { width: 100%; padding: 9px 12px 9px 34px; border: 1px solid #e3e8ef; border-radius: 8px; font: inherit; background: #fff; }
.search svg { position: absolute; left: 10px; top: 9px; color: #64748b; }
.chips { display: flex; gap: 7px; flex-wrap: wrap; }
.chip { padding: 6px 11px; border: 1px solid #e3e8ef; border-radius: 99px; background: #fff; cursor: pointer; font-size: 12.5px; color: #475569; }
.chip.on { background: #1c2533; color: #fff; border-color: #1c2533; }
button.export { background: #fff; border: 1px solid #e3e8ef; padding: 9px 13px; border-radius: 8px; cursor: pointer; font-weight: 600; color: #475569; }
.count { padding: 0 20px 10px; color: #64748b; font-size: 12.5px; }

.wrap { padding: 0 20px 24px; }
table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #e3e8ef; border-radius: 12px; overflow: hidden; }
thead th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .4px; color: #64748b; padding: 11px 14px; background: #fafbfd; border-bottom: 1px solid #e3e8ef; }
tbody td { padding: 12px 14px; border-bottom: 1px solid #e3e8ef; vertical-align: top; }
tbody tr:last-child td { border-bottom: 0; }
tbody tr:hover { background: #faf9ff; }
tbody tr:hover .open { opacity: 1; }
.date { white-space: nowrap; font-variant-numeric: tabular-nums; color: #475569; }
.badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 6px; font-size: 11.5px; font-weight: 600; white-space: nowrap; }
.badge.n { background: #e8f0fe; color: #2563eb; }
.badge.c { background: #defaf6; color: #0d9488; }
.emitter { font-weight: 600; }
.concept { color: #475569; }
.state { font-size: 11.5px; font-weight: 600; padding: 3px 9px; border-radius: 6px; white-space: nowrap; background: #eef2f7; color: #475569; }
.open { opacity: 0; color: #6d28d9; font-weight: 600; font-size: 12px; white-space: nowrap; transition: opacity .12s; text-decoration: none; }
.safety { margin: 0 20px 18px; padding: 10px 14px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; font-size: 12px; color: #92400e; }

.ext-foot { background: #fff; border-top: 1px solid #e3e8ef; padding: 9px 18px; display: flex; align-items: center; gap: 8px; font-size: 12px; color: #64748b; }
.ext-foot .lock { color: #15803d; font-weight: 600; display: flex; align-items: center; gap: 5px; }

.fab { position: fixed; right: 26px; bottom: 26px; z-index: 2147483639; background: #6d28d9; color: #fff; border: 0;
  border-radius: 99px; padding: 13px 18px; font-weight: 700; font-size: 14px; box-shadow: 0 10px 26px rgba(109,40,217,.45);
  cursor: grab; display: flex; align-items: center; gap: 9px; touch-action: none; user-select: none; }
.fab:active { cursor: grabbing; }
`;
