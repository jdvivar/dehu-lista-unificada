# Política de privacidad — DEHú Unificado

_Última actualización: 2026-07-02_

DEHú Unificado es una extensión de navegador que muestra tus **Notificaciones** y **Comunicaciones** de la [DEHú](https://dehu.redsara.es) en una sola lista buscable. Es una herramienta **no oficial**, sin relación con la Administración.

## Resumen

**La extensión no recopila, envía ni comparte ningún dato.** Todo lo que lee y guarda permanece en tu propio navegador. No hay servidores propios, ni analítica, ni terceros.

## Qué datos maneja

Cuando la usas estando identificado en DEHú, la extensión lee, en tu nombre, los **metadatos de tus propios listados**: organismo emisor, concepto/asunto, fechas (disponibilidad, caducidad), estado e identificadores. Es la misma información que ya te muestra la web de DEHú; solo la reúne y ordena.

No accede al contenido de los documentos ni realiza ningún acto con efectos legales (no abre notificaciones ni provoca comparecencias): cada elemento enlaza a la página oficial de DEHú para que seas tú quien actúe.

## Dónde se guarda

Esos metadatos se almacenan **localmente** en tu navegador (`chrome.storage.local`), **cifrados** (AES-GCM, con una clave derivada de tu propia identidad de la sesión de DEHú, que no se guarda en disco). Sirve para no tener que volver a descargarlo todo cada vez.

- Nada de esto sale de tu equipo.
- Puedes **desactivar** el guardado, **borrarlo** cuando quieras o **borrarlo al cerrar** desde el menú de la extensión.
- El token de sesión se reutiliza en memoria únicamente para hacer las mismas peticiones que hace la web; no se almacena ni se transmite a ningún sitio.

## Permisos y por qué

- **`storage` / `unlimitedStorage`** — guardar en tu equipo, cifrada, la lista ya descargada (puede abarcar varios años de historial).
- **`activeTab`** — al pulsar el icono, comprobar si la pestaña activa es DEHú para abrir el panel; si no, abrir DEHú.
- **Acceso a `https://dehu.redsara.es`** — la extensión solo funciona ahí: inyecta el panel y reutiliza tu sesión para leer tus propios listados.

## Terceros

Ninguno. No se usan servicios de analítica, publicidad ni seguimiento.

## Contacto

Dudas o incidencias: [issues del proyecto en GitHub](https://github.com/jdvivar/dehu-lista-unificada/issues).
