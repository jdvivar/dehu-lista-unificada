// The overlay's inner markup (everything inside .overlay). The .backdrop, .overlay
// wrapper and the .fab launcher are created in overlay.ts. Stable ids are wired by
// the content script.
export const REPO_URL = "https://github.com/jdvivar/dehu-lista-unificada";
// Pre-filled "new issue" so non-technical users only have to fill in the blanks.
export const FEEDBACK_URL = `${REPO_URL}/issues/new?title=${encodeURIComponent("Comentario sobre DEHú Unificado")}&body=${encodeURIComponent(
  "Cuéntanos qué ha pasado o qué te gustaría mejorar:\n\n- ¿Qué estabas haciendo?\n- ¿Qué esperabas que ocurriera?\n- ¿Qué ocurrió en realidad?\n\n(Opcional) Navegador y sistema operativo:",
)}`;

export function overlayHTML(): string {
  return `
  <div class="ext-bar">
    <span class="hex">⬡</span>
    <span class="title">DEHú Unificado</span>
    <span class="tag">BETA · solo lectura</span>
    <span class="sub">Notificaciones + Comunicaciones en una sola lista</span>
    <span class="iconbtn gear" id="gear" title="Ajustes">⚙</span>
    <span class="iconbtn x">✕</span>
    <div class="menu" id="menu">
      <h4>Datos en este equipo</h4>
      <label class="row"><input type="checkbox" id="opt-store" checked> <span>Guardar datos en este equipo<small>Cifrados. Evita volver a descargar todo cada vez.</small></span></label>
      <label class="row"><input type="checkbox" id="opt-clear-close"> <span>Borrar al cerrar<small>Recomendado en ordenadores compartidos.</small></span></label>
      <hr>
      <div class="row danger" id="clear-data">🗑 Borrar datos guardados</div>
    </div>
  </div>

  <div class="scroll">
    <div class="control">
      <div class="field"><label>Desde</label><input type="date" id="from"></div>
      <div class="field"><label>Hasta</label><input type="date" id="to"></div>
      <div class="field"><label>Mostrar</label>
        <div class="toggles">
          <div class="toggle on" data-source="notificacion"><span class="dot n"></span>Notificaciones</div>
          <div class="toggle on" data-source="comunicacion"><span class="dot c"></span>Comunicaciones</div>
        </div>
      </div>
      <button class="sync" id="sync">⟳ Sincronizar</button>
    </div>

    <div class="progress" id="progressbar" hidden>
      <span id="progress"></span>
      <span class="bar"><i id="barfill"></i></span>
      <a class="cancel" id="cancel">Cancelar</a>
    </div>

    <div class="toolbar">
      <div class="search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
        <input id="search" placeholder="Buscar por organismo o concepto…">
      </div>
      <div class="chips">
        <span class="chip on" data-state="all">Todas</span>
        <span class="chip" data-state="Pendiente">Pendientes</span>
        <span class="chip" data-state="Comparecida">Comparecidas</span>
        <span class="chip" data-state="Caducada">Caducadas</span>
      </div>
      <button class="export">⤓ Exportar CSV</button>
    </div>
    <div class="count" id="count"></div>

    <div class="wrap">
      <table>
        <thead><tr><th>Fecha</th><th>Tipo</th><th>Organismo</th><th>Concepto</th><th>Estado</th><th>Caduca</th><th></th><th></th></tr></thead>
        <tbody id="rows"></tbody>
      </table>
    </div>

    <div class="safety">⚠️ Solo lectura. Abrir una notificación pendiente en DEHú es un acto legal (comparecencia). Cada fila enlaza a la página oficial para realizar cualquier acto legal — esta extensión nunca lo hace por ti.</div>
  </div>

  <div class="ext-foot">
    <span class="lock">🔒 Datos cifrados con tu identidad de DEHú</span>
    <span id="lastsync"></span>
    <a class="feedback" href="${FEEDBACK_URL}" target="_blank" rel="noopener">💬 Enviar comentario</a>
  </div>`;
}
