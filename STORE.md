# Ficha de tienda y justificaciones (Chrome Web Store / Firefox AMO)

Material para la publicación. La política de privacidad es [`PRIVACY.md`](./PRIVACY.md)
(URL a indicar en el formulario:
`https://github.com/jdvivar/dehu-lista-unificada/blob/main/PRIVACY.md`).

## Propósito único (single purpose)

Mostrar en una única lista buscable las Notificaciones y Comunicaciones de la cuenta
del propio usuario en DEHú (dehu.redsara.es), sin el límite de 30 días del buscador oficial.

## Descripción (ficha)

**Corta:** Tus Notificaciones y Comunicaciones de DEHú en una sola lista buscable, sin el límite de 30 días.

**Larga:**
DEHú separa tus mensajes en dos buzones (Notificaciones y Comunicaciones) y su buscador
no admite rangos de más de 30 días. DEHú Unificado los reúne en una sola lista que puedes
buscar y filtrar para cualquier periodo. Es solo lectura: no abre notificaciones ni provoca
comparecencias; cada fila enlaza a la página oficial. Tus datos se guardan cifrados en tu
equipo y no se envían a ningún sitio. Herramienta no oficial.

## Justificación de permisos

- **`storage` / `unlimitedStorage`** — Guardar en el equipo del usuario, de forma cifrada,
  los metadatos ya descargados para no volver a descargarlos y permitir búsqueda instantánea.
  Puede acumular varios años de historial, de ahí `unlimitedStorage`.
- **`activeTab`** — Al pulsar el icono, comprobar si la pestaña activa es DEHú para abrir el
  panel; si no lo es, abrir DEHú.
- **Acceso al sitio (`content_scripts` en `https://dehu.redsara.es/*`)** — La extensión solo
  funciona en DEHú: se inyecta únicamente en sus páginas y reutiliza la sesión del usuario para
  leer sus propios listados. No usa `host_permissions`; las peticiones a la API son del mismo
  origen (dehu.redsara.es).
- **`web_accessible_resources` → `dist/token-hook.js`** — Script que se inyecta en la página
  de DEHú para capturar el token de la propia sesión del usuario (necesario para leer sus
  listados). Va **incluido en el paquete**; no se descarga ni ejecuta código remoto.

## Uso de datos (Data safety / privacidad)

- ¿Recopila datos de usuario? **No.**
- ¿Se transmiten datos a terceros o a un servidor? **No.** Todo se procesa y almacena
  localmente en el navegador; se cifra en reposo.
- ¿Se vende o comparte información? **No.**
- ¿Analítica o seguimiento? **Ninguno.**

## Recursos de la ficha

- Icono: `icons/128.png`
- Captura para la tienda (1280×800): `assets/store-1280x800.png`
- Banner del README: `assets/screenshot.png`
- Categoría sugerida: Productividad
- Idioma principal: Español (es)

Regenerar la captura de tienda: `node scripts/gen-screenshot.mjs`, capturar con Playwright a 1280×800 (2×) y reducir con `sips -z 800 1280`.
