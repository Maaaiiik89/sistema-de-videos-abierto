---
name: ilustrar
description: Pinta una ilustración con código (sin generador de imágenes) para usarla en un video, con alguno de los 83 estilos de Claude Drawing (acuarela, tinta china, pixel art, plastilina, flat vector, isométrico, pizarra, cuaderno, etc.). Usar cuando un video necesite un fondo, un objeto o una escena ilustrada que no sale de una foto real, junto con hacer-video y hyperframes.
---

# Ilustrar con código

Motor: Claude Drawing (github.com/cloveric/claude-drawing-skill, licencia MIT). No viene incluido: la primera vez, bájalo a `referencias/claude-drawing-skill/` (`git clone` o el ZIP de GitHub) y haz la revisión de seguridad de abajo. Se revisó en el commit 6af36dc.

## Revisión de seguridad (hacerla al bajarlo o actualizarlo)

- Solo Python con `numpy` y `Pillow` (`requirements.txt`). Nada de red, nada que ejecute otros programas, sin instaladores ni hooks.
- Si se actualiza el repositorio, se vuelve a revisar antes de usarlo: buscar `subprocess`, `os.system`, `eval`, `exec`, `urllib`, `requests`, `socket`.
- No se instala como skill completa: su `SKILL.md` pesa 744 KB y está en chino. Se lee por partes.

## Cómo se usa

1. Elegir el estilo. Buscar su sección en `referencias/claude-drawing-skill/SKILL.md` (por nombre en inglés o chino, con Grep) y leer solo esa parte y el módulo de `lib/` que nombra.
2. Escribir el script de la ilustración en `mis-videos/marcas/<marca>/videos/<video>/fuentes/ilustraciones/<nombre>.py`, nunca dentro del repositorio de referencia. Importar `lib/` por ruta.
3. Correrlo con `python -I`. La salida PNG va a `proyecto/assets/media/` del video.
4. Animarla en HyperFrames como cualquier imagen (capas, cámara, recortes).

## Reglas

- Colores de la marca del video (`DESIGN.md`) aunque el estilo traiga su propia paleta.
- No correr los `examples/` del repositorio salvo para mirar cómo están hechos.
- Las ilustraciones no muestran personas reales ni marcas ajenas. Si la marca tiene personaje, es siempre el aprobado de la marca (`personaje/`).
