# DEHú Unificado

> ⚠️ **Versión beta.** La extensión está en desarrollo y las versiones publicadas son preliminares hasta que esté verificada. Úsala con criterio.

Extensión de navegador que muestra tus **Notificaciones** y **Comunicaciones** de **DEHú** (*Dirección Electrónica Habilitada única*, `dehu.redsara.es`) en **una sola lista, buscable** y para cualquier rango de fechas — resolviendo dos problemas del sitio oficial:

1. Notificaciones y Comunicaciones están en pestañas separadas, nunca juntas.
2. La búsqueda por fechas está limitada a ventanas de ~30 días.

La extensión recorre esas ventanas de 30 días por ti y lo unifica todo en una lista que puedes buscar al instante.

## Privacidad y seguridad

- **Solo lectura.** Únicamente *lee* los listados de tu propia cuenta. Nunca abre una notificación ni provoca una *comparecencia* (acto con efectos legales). Cada fila enlaza a la página oficial de DEHú para que seas tú quien realice cualquier acto legal.
- **Tus datos no salen de tu equipo.** Los metadatos descargados se guardan localmente en el navegador, **cifrados** (AES-GCM, con una clave derivada de tu sesión de DEHú). No se envían a ningún sitio.
- **Tú controlas el almacenamiento.** Puedes desactivar el guardado local, borrarlo cuando quieras o borrarlo al cerrar — útil en ordenadores compartidos. (En un equipo compartido, mejor desactiva el guardado; el cifrado no sustituye a eso.)
- Es una herramienta **no oficial**, sin relación ni respaldo de la Administración.

## Instalación

**Desde una versión publicada (recomendado):** descarga `dehu-unificado.zip` de la página de [Releases](https://github.com/jdvivar/dehu-lista-unificada/releases), descomprímelo y, en tu navegador, ve a la página de extensiones → activa el *Modo de desarrollador* → *Cargar descomprimida* → selecciona la carpeta.

**Desde el código (desarrollo):**
```bash
npm install
npm run build      # genera dist/
```
Luego carga la raíz del repositorio como extensión descomprimida.

## 💬 ¿Cómo enviar comentarios o reportar un problema?

Tu opinión nos ayuda a mejorar. **No hace falta saber programar.** Si algo no funciona o se te ocurre una mejora:

1. Dentro de la extensión, pulsa **«💬 Enviar comentario»** (abajo del todo). También puedes usar este enlace directo: **[enviar comentario](https://github.com/jdvivar/dehu-lista-unificada/issues/new?title=Comentario%20sobre%20DEH%C3%BA%20Unificado)**.
2. La primera vez, GitHub te pedirá iniciar sesión; crear una cuenta es **gratis** en [github.com](https://github.com).
3. Verás un formulario con unas preguntas (qué hacías, qué esperabas, qué ocurrió). Rellénalo con tus palabras.
4. Pulsa **«Submit new issue»** (Enviar). ¡Listo!

Cuanto más concreto seas (qué navegador usas, qué pasos diste), más fácil nos será ayudarte.

## Origen de la idea

Este proyecto nació a partir de un tuit de **Jaime Obregón**: <https://x.com/JaimeObregon/status/2071517569790402776>, que señalaba lo mejorable que es la experiencia de uso de DEHú al consultar notificaciones y comunicaciones. Esta extensión es un intento de aliviar esas fricciones para cualquier persona, sin conocimientos técnicos.

## Desarrollo

```bash
npm test           # tests unitarios y de integración (Vitest)
npm run typecheck  # TypeScript, sin emitir
npm run build      # empaquetado con esbuild
npm run package    # build + genera dehu-unificado.zip
```

Las versiones se publican automáticamente con [release-please](https://github.com/googleapis/release-please) y [Conventional Commits](https://www.conventionalcommits.org); al fusionar el PR de release se etiqueta una versión (beta) y un workflow de GitHub adjunta el `.zip` ya construido.

## Licencia

[GPL-3.0-or-later](./LICENSE).
