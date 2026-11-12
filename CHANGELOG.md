# Cambios

Cada versión, qué trae y si hay algo que hacer al actualizar. `Actualizar.bat` muestra esta información antes de actualizar.

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
