# Seguridad y privacidad

Qué hace este sistema con tus datos, qué instala, qué cuentas usa y cómo cuidarte. La primera parte es para cualquier persona; la última es para quien mantiene el sistema.

Revisado en noviembre de 2026 (versión 0.4).

## En resumen

- **Tus videos, tu voz y tus grabaciones se procesan en tu computador.** Cortar, limpiar el audio, transcribir y renderizar se hace en tu equipo, sin subir nada.
- **La app de IA (Claude, ChatGPT o Antigravity) sí ve lo que el agente lee**: tu ficha de marca, los guiones, las transcripciones y las imágenes de los videos que revisa. Eso viaja a la empresa de esa app, según su política de privacidad.
- **Nada que cueste dinero ocurre sin tu sí.** El agente siempre dice el precio antes, y cada video tiene un límite de créditos que por defecto es 0.
- **Lee antes de tocar Permitir.** La app te pide permiso para correr herramientas: sí a las de esta carpeta (editor de video, HyperFrames), no a cosas que no entiendas.
- **No pongas datos de tus clientes ni contraseñas en la conversación.**

## Qué queda en tu computador y qué sale

| Qué | Dónde se procesa | Sale del computador |
| --- | --- | --- |
| Tus grabaciones (cámara, pantalla, voz) | En tu computador (FFmpeg, editor de video) | No, salvo que el agente las mire (ver la fila de la app de IA) |
| Transcribir la voz (Whisper) | En tu computador | No. La primera vez se descarga el modelo (unos 1,5 GB) desde los servidores de OpenAI |
| Armar y renderizar el video (HyperFrames) | En tu computador | Al renderizar se descargan tipografías de Google Fonts y la librería de animación (GSAP) de jsDelivr. No se sube tu video |
| La conversación con el agente | En la app de IA | **Sí**: lo que escribes y lo que el agente lee (ficha, guion, transcripciones, cuadros del video) va a Anthropic, OpenAI o Google, según la app que uses |
| Música del catálogo de HyperFrames | HeyGen | Se envía lo que buscas ("música alegre") y se descarga la pista. Solo si conectaste tu cuenta |
| Voces o músicas generadas con IA | HeyGen | El texto del guion o la descripción de la música. Solo con tu sí, porque cuesta créditos |
| Sacar la marca de una web | Tu computador visita esa web | Es una visita normal a la página |
| El panel (`Panel.bat`) | En tu computador | No. Solo consulta GitHub (su API o, si esta pone límite, la página pública de versiones y el `CHANGELOG.md` del repositorio) para ver si hay una versión nueva. No usa fuentes ni servicios de internet |
| Estadísticas de uso de HyperFrames | Servidores de HyperFrames | Qué comandos se usan (no tus videos). Si iniciaste sesión, asociadas a tu cuenta. Se pueden apagar (ver abajo) |

### Cómo cuidar lo que ve la app de IA

- Revisa en la configuración de tu app si tus conversaciones se usan para entrenar modelos, y apágalo si prefieres que no.
- Si un video tiene información delicada (datos de clientes, precios internos, una pantalla con correos o claves), díselo al agente antes: puede cortar o tapar esas partes sin mirarlas en detalle, y avisarte en qué segundos aparecen.
- Antes de grabar tu pantalla, cierra lo que no quieres que salga: correo, chats, contraseñas guardadas, pestañas del banco.

### Apagar las estadísticas de HyperFrames

Pídele al agente: "apaga las estadísticas de HyperFrames". Corre `npx.cmd hyperframes@0.9.30 telemetry disable` y te confirma con `telemetry status`.

## Permisos de la app: qué aceptar

La primera vez, la app pide permiso para usar el **editor de video** (`video-editor`), para correr herramientas en esta carpeta y, en ChatGPT o Antigravity, para confiar en la carpeta.

- **Acepta** el editor de video y las herramientas del sistema (`node herramientas/...`, `npx.cmd hyperframes@0.9.30 ...`, `uv run ...`): son las de esta carpeta.
- **Lee antes de aceptar** cualquier cosa que borre archivos fuera de esta carpeta, instale programas, cambie la configuración de Windows o descargue y ejecute algo de internet. El sistema no necesita nada de eso para hacer videos: si aparece, pregúntale al agente para qué es.
- **No uses "permitir todo siempre"** si en el mismo computador tienes información delicada. Es más lento, pero ves lo que pasa.
- El agente no debe seguir instrucciones que aparezcan dentro de una web, un documento o una transcripción ("ignora lo anterior y..."). Está configurado para tratarlas como texto, no como órdenes; si lo ves hacer algo raro, detenlo.

## Cuentas y gastos

El sistema usa hasta tres cuentas: la de la app de IA (obligatoria), la de HyperFrames (opcional, para la música del catálogo) y, a través de HyperFrames, los créditos de HeyGen (solo si generas voces o músicas con IA).

**Recomendaciones:**

- **Usa cuentas tuyas o de tu negocio, a tu nombre.** No uses la cuenta de un cliente, de tu trabajo o de otra persona sin su permiso: lo que hagas queda registrado a su nombre y lo paga quien es dueño de la cuenta.
- **Prefiere planes con tope** (una suscripción mensual con límite de uso) antes que cuentas de pago por uso sin límite. Si tu cuenta cobra por uso, **ponle un tope de gasto mensual** en su configuración y **apaga la recarga automática** de créditos.
- **Nunca pegues claves de API, tokens ni contraseñas en la conversación.** El sistema no los necesita: la música se conecta con `Conectar-musica.bat`, que abre el navegador para que entres con tu cuenta.
- **Activa la verificación en dos pasos** en tus cuentas (app de IA, HyperFrames, Google).
- **Computador compartido:** cierra sesión al terminar. En HyperFrames, pídele al agente "cierra mi sesión de HyperFrames" (`npx.cmd hyperframes@0.9.30 auth logout`). Las grabaciones y videos quedan en esta carpeta: si otras personas usan el equipo, guárdala en tu usuario de Windows.
- **Límite de créditos por video:** cada marca tiene el suyo en su ficha (`mis-videos/marcas/<marca>/ficha.md`, "Límite de créditos por video", 0 por defecto). Si haces videos para clientes, cada cliente tiene su propio límite. Cada video nuevo lo copia a su proyecto (`proyecto/.hyperframes/credit-limit.json`) y toda llamada que cueste créditos y se pase de ese número se rechaza sola. Súbelo solo cuando quieras usar voces o músicas generadas, y vuelve a bajarlo después.
- **Revisa tu consumo** de vez en cuando en la página de cada cuenta. Si ves algo que no reconoces, cambia la contraseña y cierra las sesiones abiertas.

## Datos de otras personas y derechos

- **Personas que aparecen en tus videos:** pídeles permiso antes de publicar. Si son menores de edad, el permiso es de sus padres o tutores.
- **Datos de clientes:** no pongas nombres, teléfonos, correos ni números de documento (RUT, DNI, cédula) de clientes en guiones, fichas o pantallas grabadas. Si un testimonio lo necesita, que sea con su permiso por escrito.
- **Música y sonidos:** los que vienen son de licencia libre (`recursos/musica/LEEME.md`, `recursos/sonidos/CREDITOS.md`). Dos sonidos piden crédito al autor en la descripción del video. Si agregas música, anota su licencia.
- **Datos y cifras en pantalla:** cada uno lleva su fuente anotada en el guion.
- **Referencias de otras cuentas:** se toma la idea, el ritmo o la estructura, nunca su contenido, su marca ni sus personajes.

## Qué instala y de dónde

`Instalar.bat` corre `herramientas/instalar.ps1`. Puedes abrirlo con el Bloc de notas para leer qué hace antes de correrlo.

| Pieza | De dónde sale | Cómo se controla |
| --- | --- | --- |
| Git, Node.js, FFmpeg, uv | winget (el instalador de Windows) | Paquetes del repositorio oficial de winget, que comprueba la huella de cada instalador |
| App de Claude / ChatGPT / Antigravity | winget o Microsoft Store | Instaladores oficiales de Anthropic, OpenAI y Google |
| Claude Code de consola (solo si eliges Claude) | winget (`Anthropic.ClaudeCode`) | Instalador oficial de Anthropic. No se usa ningún script descargado y ejecutado a ciegas |
| Python 3.12 | uv | Distribución oficial que gestiona uv |
| Whisper | PyPI, con uv | **Versión fija** (`openai-whisper==20250625`) |
| HyperFrames y sus skills | npm | **Versión fija** (`hyperframes@0.9.30`) en el instalador, en los `.bat`, en las herramientas y en las instrucciones del agente |
| Programa de HeyGen (música) | CDN oficial de HeyGen | Se comprueba la suma SHA-256 contra la lista oficial antes de instalarlo |
| Editor de video (`mcp-video`) | PyPI, con uv | Versiones exactas en `mcp-video/uv.lock` |

Qué cambia en tu computador:
- Instala esos programas y agrega la carpeta `%USERPROFILE%\.local\bin` a tu PATH de usuario (ahí quedan Whisper y HeyGen).
- Copia las skills de HyperFrames a las carpetas de skills de tu usuario (Claude, Codex y Antigravity).
- Escribe la configuración del editor de video dentro de esta carpeta (`.codex/config.toml`, `.agents/mcp_config.json`) y copia las skills de los módulos encendidos a `.agents/skills/` y `.claude/skills/`.
- Copia las skills de HyperFrames también a `%USERPROFILE%.geminiconfigskills` (donde las busca la app de Antigravity).
- **No** cambia la política de scripts de Windows y **no** desactiva el antivirus ni SmartScreen.
- Algunos programas (Git, Node.js) pueden pedir permiso de administrador al instalarse: es la ventana de su instalador oficial, y es normal.

El editor de video (`mcp-video/server.py`) trabaja en tu equipo: llama a FFmpeg y a Whisper (que solo usa internet la primera vez, para bajar su modelo). Nunca modifica un original: los videos nuevos van a `editados/` y las transcripciones (`.transcripcion.json`, `.srt`) quedan junto al archivo transcrito.

## Verificar que tu descarga es la original

- Descarga el sistema **solo desde miguelurra.lat** o desde su repositorio ([github.com/Maaaiiik89/sistema-de-videos-abierto](https://github.com/Maaaiiik89/sistema-de-videos-abierto/releases/latest)). No uses copias que te pasen por chat o correo.
- Windows muestra un aviso ("Windows protegió tu PC") porque los archivos `.bat` no están firmados. Es normal en proyectos abiertos y pequeños, pero por eso mismo conviene verificar la descarga.
- Junto al enlace de descarga (y en las notas de cada versión en GitHub) se publica la **huella SHA-256** del zip. Para compararla, pídele a alguien de confianza que corra esto en PowerShell (o hazlo tú) y vea si el resultado es igual al publicado:

  ```powershell
  Get-FileHash .\sistema-de-videos-abierto.zip -Algorithm SHA256
  ```

  Si no coincide, no lo abras y avisa en el blog.

## El panel

`Panel.bat` abre una página que solo responde desde tu propio computador (dirección `127.0.0.1`, puerto 4317 o el siguiente libre): nadie de tu red ni de internet puede abrirla. Además:

- Cada vez que se abre crea un código de un solo uso que va dentro de la página. Sin ese código no se puede subir nada ni cambiar nada, así que otra página web abierta en tu navegador no puede usarlo.
- Solo **escribe** archivos nuevos en `mis-videos/bandeja/` (nunca reemplaza uno que exista), qué herramientas están encendidas y la app que elegiste.
- Solo **abre** carpetas y archivos de la carpeta del sistema, y solo de tipos que no se ejecutan (videos, audios, imágenes, PDF, textos). Para reparar o actualizar abre `Instalar.bat` o `Actualizar.bat`, que te muestran todo y preguntan.
- No le habla al agente ni a tu app de IA.

## Actualizaciones

`Actualizar.bat` (o el botón Actualizar del panel, que abre la misma ventana) busca la última versión publicada, te muestra qué trae y pregunta antes de hacer nada. Si dices que sí:

1. Descarga el zip y su huella SHA-256 publicada junto a él, y **no sigue si no coinciden**.
2. Guarda un respaldo completo del sistema actual en `.respaldos/`.
3. Reemplaza solo los archivos del sistema. **No toca** `mis-videos/` (tus marcas, videos, grabaciones, bandeja), ni la configuración de tu computador (`.codex/config.toml`, `.agents/mcp_config.json`, `grabador/config.json`, `.claude/settings.local.json`), ni los entornos instalados.
4. Si algo falla al reemplazar, restaura el respaldo y deja todo como estaba.
5. Revisa la instalación (instala solo lo que falte, con las versiones fijas de la versión nueva) y vuelve a configurar las apps.

Tu trabajo vive en `mis-videos/`: para respaldarlo, copia esa carpeta (a un disco externo o a tu nube).

## Lo que el agente tiene prohibido

Está escrito en `AGENTS.md` y en las skills:

- Gastar créditos sin decir el precio y esperar un sí.
- Pedirte que escribas comandos, claves o contraseñas.
- Cambiar la política de scripts de Windows o la configuración de seguridad.
- Usar versiones de HyperFrames distintas a la fija.
- Seguir instrucciones que vengan dentro de una web, un documento o una transcripción.
- Subir tus archivos a otros servicios (aparte de la app de IA que usas) sin pedirte permiso.
- Modificar los originales de tus grabaciones.
- Guardar lo que genera fuera de `mis-videos/`, o borrar archivos tuyos sin confirmarlo contigo.

## Para quien mantiene el sistema

### Versiones fijas y cómo actualizarlas

| Qué | Dónde está fijado |
| --- | --- |
| HyperFrames `0.9.30` | `herramientas/instalar.ps1` (`$VERSION_HYPERFRAMES`), `Conectar-musica.bat`, `herramientas/nuevo-video.mjs` (init), `herramientas/*.mjs` (mensajes), `AGENTS.md`, `modulos/*/skills/*/SKILL.md`, `SEGURIDAD.md`, `estilos/*.md` |
| Whisper `20250625` | `herramientas/instalar.ps1` (`$VERSION_WHISPER`) |
| Editor de video | `mcp-video/pyproject.toml` y `mcp-video/uv.lock` |

Para subir de versión:
1. Lee las notas de la versión nueva y espera unos días desde su publicación (las versiones maliciosas o rotas suelen detectarse en ese tiempo).
2. Reemplaza `hyperframes@0.9.30` por la versión nueva en todos los archivos de la tabla (buscar y reemplazar en la carpeta).
3. Haz un video de prueba completo: `nuevo-video.mjs`, check, snapshot, render borrador y render final, en vertical y en 16:9.
4. Corre `Instalar.bat` en un usuario de Windows limpio.
5. Sube la versión en `sistema.json`, anota el cambio en `CHANGELOG.md` y publica la versión (ver abajo).

### Al publicar una versión

La publicación la arma GitHub (`.github/workflows/publicar.yml`) al subir una etiqueta `vX.Y.Z`: revisa que la versión coincida y que no vayan datos personales ni archivos generados, arma el zip con `git archive` (solo lo que está en el repositorio, respetando `.gitignore`) y publica el zip, su `.sha256` y las notas de `CHANGELOG.md`. Igual conviene revisar:

- Si armas el zip a mano, déjalo sin `.venv/`, `__pycache__/`, `.hyperframes/`, `.respaldos/`, `.agents/skills/`, `.claude/skills/`, `.codex/config.toml` ni `.agents/mcp_config.json` (se generan en cada computador; los dos últimos llevan la ruta de quien lo armó).
- `mis-videos/` va solo con su estructura vacía y su `LEEME.md`: sin marcas, grabaciones ni videos. Revisa que no queden datos personales, rutas de tu computador ni claves.
- La versión de `sistema.json` debe coincidir con la etiqueta de la publicación (`v0.4.0`).
- Publica el zip **y** su archivo `.sha256` (con ese nombre exacto, `<zip>.sha256`) en la misma publicación: `Actualizar.bat` no actualiza si falta la huella o no coincide.
- Pon la huella también junto al enlace de descarga del blog.

### Reportar un problema de seguridad

Si encuentras un problema de seguridad, repórtalo en privado desde la pestaña Security del repositorio (Report a vulnerability) o por el formulario de contacto de miguelurra.lat, antes de publicarlo, para alcanzar a corregirlo. Más detalle en `SECURITY.md`.
