# Cambios

Cada versión, qué trae y si hay algo que hacer al actualizar. `Actualizar.bat` muestra esta información antes de actualizar.

"En desarrollo" es lo que ya está terminado y saldrá en la próxima versión: se anota apenas se termina cada mejora. Al publicar, esa sección pasa a llamarse con el número de la versión.

## En desarrollo

Todavía nada: aquí se anota cada mejora de la próxima versión apenas se termina.

## 0.5.0 (noviembre de 2026)

**Pedidos de video.** Un video se pide conversando con el agente o con un formulario nuevo en el panel (Pedidos), en 7 pasos: marca (o una marca nueva), tipo, para qué, mensaje, redes y duración, voz y música, referencias y archivos. Los archivos suben directo a la carpeta del video, hasta 16 GB cada uno. Las dos formas terminan en el mismo pedido (`PEDIDO.md`), y **el agente siempre lo revisa antes de empezar**: que no falte nada, que tenga sentido y que los archivos sirvan. Te pregunta lo que falte (también lo ves en el panel y puedes responder ahí) y no escribe el guion hasta que confirmas el resumen. Herramienta nueva para el agente: `pedidos.mjs`, y skill `pedidos`.

**Primeros pasos que te llevan a hacer cada cosa.** Cada paso tiene su acción: crear tu marca con un formulario corto, armar tu paleta, subir tu logo, decir que no quieres personaje, activar la música o pedir tu primer video con el formulario ya preparado. Lo que se conversa te dice qué escribirle al agente. En las demás pantallas, arriba aparece tu siguiente paso.

**Arma tu paleta desde un color.** Eliges tu color principal (o uno de tu logo) y el panel te recomienda 4 combinaciones con el contraste probado. Ajustas cada color, «Arreglar el contraste» corrige lo que no se lee bien, y se guarda en tu marca.

**Tu marca, más completa y más ordenada.** Verificar → Marca ahora tiene cuatro pestañas: ficha (lo esencial y el contexto opcional: slogan, qué te hace distinto, productos, horario, zona, temas que no tocas), visual (logo en sus versiones, colores, letras y elementos reutilizables), voz y música, y referencias.

**Manual escrito para tu app**, con el selector de app arriba y los pasos de Claude, ChatGPT o Antigravity.

**Almacenamiento.** En Mantenimiento ves qué ocupa espacio y qué puedes liberar, de lo más seguro a lo más delicado. Nada se borra solo: confirmas, va a la Papelera de reciclaje de Windows (se puede recuperar) y queda anotado.

**Novedades y recorrido.** Mantenimiento muestra qué trae tu versión y todos los cambios. La primera vez que abres el panel, un recorrido de 2 minutos te muestra cada parte.

**Referencias de video** (módulo nuevo, apagado al instalar).
- Le pasas al agente el link de un video que te gusta y lo baja con yt-dlp, **sin usar tus cuentas**. yt-dlp y todas sus librerías quedan con versión fija y huella SHA-256 comprobada (si algo no coincide, no se instala), y para YouTube usa Deno sin permisos: el código de la página no puede tocar tus archivos, usar internet ni abrir programas. Funciona con TikTok y con las redes que dejan ver el video sin iniciar sesión; Instagram y YouTube a veces lo piden.
- Si la red no deja bajarlo, lo guardas desde su app o grabas la pantalla con `Grabador.bat`, lo subes en el panel y el agente lo analiza igual.
- El análisis deja en las referencias de tu marca la duración, el formato, cada corte y el ritmo, más una imagen con 12 cuadros del video. El agente estudia esa imagen en vez del video completo, así gasta muchos menos tokens.
- El agente te dice qué toma de la referencia (en números: segundos por plano, cómo entran los textos) y tú lo apruebas. Nunca usa su contenido, su música ni su marca.

**Corregido:**
- La guía para crear un estilo decía que bajaras videos con yt-dlp, que el sistema no instalaba.
- `Actualizar.bat` ya no borra los entornos de Python de los módulos (`.venv`): había que volver a instalarlos después de cada actualización.

**Al actualizar desde 0.4:** nada que hacer. Las fichas de marca anteriores no tienen la sección "Contexto (opcional)": el agente la agrega cuando la completen juntos.

## 0.4.1 (noviembre de 2026)

**Buscar versiones nuevas funciona aunque GitHub ponga límite.** Sin cuenta, GitHub permite 60 consultas por hora por dirección de internet, y muchos proveedores comparten una dirección entre muchos clientes. Ahora, si se pasó ese límite, `Actualizar.bat` y el panel buscan la versión por la página pública de GitHub, que no tiene ese límite. La huella SHA-256 se sigue comprobando igual.

**Al actualizar desde 0.4.0:** nada que hacer.

## 0.4.0 (noviembre de 2026)

**El panel.** Doble clic en `Panel.bat` y se abre en tu navegador, solo en tu computador. No está conectado a tu app: lee la misma carpeta y se actualiza solo.
- **Primeros pasos** que se marcan solos: instalación, marca, ficha, colores, logo y material, personaje, plan y primer video.
- **Manual** escrito para tu app, con la guía paso a paso de cada herramienta.
- **Verificar**: tu marca (colores con sus 4 pruebas de contraste, las paletas que propuso el agente, la ficha completa y cómo se ve en un reel), el plan del mes en calendario y los videos con su muestra, borrador, guion y entregas.
- **Subir**: arrastra archivos a la bandeja, con progreso, y mira dónde los dejará el agente y lo que ya ordenó.
- **Mantenimiento**: buscar versión nueva y actualizar, reparar la instalación, encender y apagar herramientas, elegir tu app.

**También:**
- `paleta.mjs proponer`: las paletas que propone el agente quedan a la vista en el panel.
- `Instalar.bat` guarda su resumen en `mis-videos/.instalacion.json` para el panel, y acepta `-SinPreguntas` (lo usa "Reparar instalación").
- El plan del mes usa fechas `AAAA-MM-DD`.
- Publicado en GitHub: `Actualizar.bat` y el panel ya encuentran las versiones nuevas solos, y cada versión trae su zip con la huella SHA-256.

**Al actualizar desde 0.3:** nada que hacer. Abre `Instalar.bat` una vez para que el panel vea el resumen de la instalación.

## 0.3.0 (noviembre de 2026)

**Tu trabajo, separado del sistema.**
- Todo lo tuyo vive en `mis-videos/`: bandeja, marcas, recursos propios y registro. `Actualizar.bat` reemplaza el sistema y nunca toca esa carpeta.
- `Actualizar.bat`: busca la última versión, muestra qué trae, comprueba su huella SHA-256, guarda un respaldo del sistema en `.respaldos/` y lo restaura si algo falla.

**Varias marcas.**
- Cada marca en `mis-videos/marcas/<marca>/` con su ficha, estilo, personaje, referencias, recursos, temáticas, grabaciones, editados, videos, plan y documentos.
- `herramientas/marcas.mjs`: crear, listar, activar y ver marcas; crear temáticas.
- El editor de video, el grabador, `nuevo-video.mjs` y `subtitular.mjs` trabajan con la marca activa.
- Límite de créditos por marca (cada cliente con el suyo).

**Archivos en orden.**
- Bandeja única (`mis-videos/bandeja/`) y `herramientas/ordenar.mjs`: cada archivo a su carpeta, con fecha en el nombre, sin borrar ni sobrescribir, con registro de movimientos.
- Recursos en niveles con `herramientas/recursos.mjs`: del video, de la temática, de la marca, tuyos y del sistema.

**Herramientas como módulos.**
- Cada herramienta es un módulo en `modulos/<id>/` con su ficha, su guía para personas (`PASO-A-PASO.md`) y sus skills. `herramientas/modulos.mjs` los enciende y apaga; el agente solo ve las skills de los módulos encendidos.
- Módulos: base, grabador, editor, animación, mixto, personaje, planificación, música del catálogo, voz con IA e ilustración. Plantilla y skill `crear-modulo` para agregar nuevos.

**Skills nuevas.** `organizar` (bandeja y recursos), `colores` (paletas con contraste probado, con `herramientas/paleta.mjs`), `planificar` (plan mensual con etapas y lo que funcionó), `armar-personaje`, `musica`, `voz-ia`, `crear-modulo`.

**Al actualizar desde 0.2:** la 0.2 no tenía `Actualizar.bat`. Descarga la 0.3, instálala en una carpeta nueva y trae tu trabajo con `node herramientas/migrar-0.2.mjs "<carpeta de la 0.2>"` (o pídeselo al agente). Copia, no mueve: la carpeta vieja queda igual.

## 0.2.0 (noviembre de 2026)

- Funciona desde la app de Claude, ChatGPT (Codex) o Antigravity: el instalador pregunta cuál y configura las tres.
- Seguridad documentada (`SEGURIDAD.md`), versiones fijas, límite de créditos, Claude Code por winget.
- Flujos animado, grabado y mixto; guion visual y muestra antes de animar; plantilla de escena vertical; personaje de ejemplo con prueba de 5 segundos; 5 músicas libres; `Conectar-musica.bat`.

## 0.1.0 (noviembre de 2026)

- Primera versión: onboarding de marca, video animado sobre la voz, edición de videos grabados, subtítulos dinámicos, grabador e instalador de doble clic.
