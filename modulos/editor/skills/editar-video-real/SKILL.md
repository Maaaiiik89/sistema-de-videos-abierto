---
name: editar-video-real
description: Editar videos grabados con personas reales o grabaciones de pantalla: limpiar la voz, cortar silencios y repeticiones, zoom, subtítulos dinámicos con la marca y exportar para LinkedIn, Instagram, Facebook, TikTok y YouTube. Usar cuando la persona trae un video grabado (cámara, celular, pantalla) y quiere dejarlo listo para publicar.
---

# Editar un video grabado

Para videos con personas reales o grabaciones de pantalla (no animados). Todo se hace con el editor (MCP `video-editor`, ver `mcp-video/LEEME.md`) y `herramientas/subtitular.mjs`. Los originales nunca se tocan: cada paso crea un archivo nuevo en `editados/`.

## 1. Traer el video

- **Grabado con el grabador:** queda en `grabaciones/` de la marca activa (`mis-videos/marcas/<marca>/grabaciones/`) con sus marcas (lo que la persona marcó mientras grababa).
- **Grabado con el celular u otra app:** que lo suba en el panel (Subir) y ordénalo con la skill `organizar`: los videos van a `grabaciones/` de la marca.
- `info_video` para ver duración, tamaño y marcas.

## 2. Entender qué hay

- `transcribir` (la primera vez descarga el modelo; tarda más sin tarjeta gráfica).
- `ver_frames` para ver qué pasa en pantalla.
- Cuéntale a la persona en 3 o 4 frases de qué trata y qué propones cortar: silencios largos, repeticiones, muletillas, partes que sobran. **Espera su sí.**

## 3. Editar

- Un solo `ensamblar` con todos los cortes (recodificar cuesta tiempo). Para pausas: `quitar_silencios`.
- Grabaciones de pantalla: `zoom` donde se hace clic o se escribe algo importante.
- `limpiar_voz` al final de los cortes.
- Si hay varias partes: `unir`.

## 4. Llevar al formato de cada red

`exportar_formato` con el formato que corresponda (tabla en `estilos/ejemplo-neutro/reglas/formatos.md`):

| Red | Formato |
| --- | --- |
| Instagram Reels, TikTok, YouTube Shorts | `9:16` |
| LinkedIn, Facebook | `9:16`, o `4:5` para el feed |
| YouTube | `16:9` |

Fondo: `desenfocado` (el video entero con un fondo borroso, bueno para pantallas), `recortar` (llena el cuadro; con `centro_x` eliges qué parte queda, bueno para una persona a cámara) o `negro`.

## 5. Subtítulos dinámicos

Transcribe el video ya exportado (los tiempos cambiaron con los cortes) y:

```bash
node herramientas/subtitular.mjs <video_exportado.mp4> --formato vertical --nombre "<nombre>"
```

Crea `videos/AAAA-MM-DD_<nombre>/` con el video y los subtítulos palabra por palabra en el color de la marca. La altura de los subtítulos está en `compositions/subtitulos.html` (`ALTURA`): por defecto deja libre la cara de alguien hablando a cámara. Revisa con `npx.cmd hyperframes@0.9.30 snapshot` que no tapen la cara ni el contenido importante; si tapan, cambia `ALTURA`.

Para 4:5 todavía no hay plantilla: usa 9:16 o 16:9, o exporta el MP4 subtitulado con `exportar_formato` a `4:5`.

### Muestra de 10 segundos antes del video completo

Antes de procesar todo (sobre todo si el video es largo), haz una muestra: un tramo de 10 s representativo (con `ensamblar`, un solo segmento), con el formato, el encuadre, los zooms y los subtítulos finales. Render borrador (`npx.cmd hyperframes@0.9.30 render -q draft -o ../entregas/muestra.mp4`) y pregúntale: "¿Así se ven los subtítulos, el encuadre y los acercamientos? ¿Sigo con todo el video?". Recién con su sí procesas el resto.

## 6. Validar y entregar

- Borrador: `npx.cmd hyperframes@0.9.30 render -q draft -o ../entregas/borrador.mp4` dentro de `proyecto/`. **La persona lo mira** (doble clic en el MP4; la vista previa del navegador a veces no suena) y dice qué cambiar, con minuto y segundo.
- `npx.cmd hyperframes@0.9.30 render -q delivery -o ../entregas/<nombre>-<red>.mp4`.
- Audio a -14 LUFS.
- Si es para varias redes, una entrega por formato, con la red en el nombre.
- Junto al video, propón el texto del post para cada red (con el tono de la ficha de la marca).
