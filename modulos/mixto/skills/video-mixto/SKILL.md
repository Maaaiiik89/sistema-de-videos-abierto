---
name: video-mixto
description: Video mixto, una persona grabada a cámara (o su pantalla) con insertos animados encima o entre medio. Guion marcando qué partes son cámara y cuáles animación, grabar la cámara con la voz, edición base, transcribir, muestra con un corte de cámara y un inserto, insertos animados sobre las palabras clave, subtítulos que no tapan la cara y exportar por red. Usar cuando la persona sale en cámara y además quiere animaciones, gráficos, datos o el personaje de la marca en el mismo video.
---

# Video mixto: cámara + animación

Para videos donde la persona habla a cámara (o graba su pantalla) y en algunos momentos entra una animación: un dato, un gráfico, el personaje, una lista. La voz es siempre la de la grabación: la animación se ajusta a ella. Cargar también `editar-video-real` (edición de la cámara), `hacer-video` (escenas y reglas de diseño) y `hyperframes`.

## El orden

### 1. Idea y guion, marcando qué es cámara y qué es animación

En `guion.md` (carpeta creada con `nuevo-video.mjs`, tipo `mixto`), el guion visual lleva una columna más: **Cámara / Inserto / Encima**.

| Tipo | Qué es | Cuándo |
| --- | --- | --- |
| Cámara | La persona hablando, a pantalla completa | Gancho, opinión, cierre: lo que gana con una cara |
| Inserto | La animación ocupa toda la pantalla y la voz sigue | Un dato, una comparación, un proceso: lo que se entiende mejor dibujado |
| Encima | La persona sigue en pantalla y aparece un gráfico, un número o el personaje a un lado | Refuerzos cortos (1 a 3 s) |

Reglas: el gancho va a cámara (una cara engancha más que un título); no más de 6 a 8 s seguidos de inserto; entre insertos, al menos un tramo de cámara. Mismo presupuesto de palabras, misma estructura de retención y mismos datos con fuente que en `hacer-video`. **La persona aprueba el guion y el guion visual.**

### 2. Grabar la cámara (con la voz)

`Grabador.bat` en modo cámara, o el celular en vertical. Luz de frente, la cara en el tercio de arriba del cuadro (así los subtítulos y los gráficos tienen espacio abajo), mirando a la cámara. Se puede leer el guion por partes y repetir frases.

### 3. Edición base de la cámara

Con el editor (`editar-video-real`): `transcribir`, cortar repeticiones y silencios en un solo `ensamblar`, `limpiar_voz` y `exportar_formato` al formato final (normalmente `9:16` con fondo `recortar`). Esta es la base: desde aquí los tiempos no cambian.

### 4. Transcribir y tiempos de cada palabra

`transcribir` sobre el video ya exportado y `node herramientas/subtitular.mjs <video> --formato vertical --nombre "<nombre>"`. Eso arma el proyecto con el video, la voz y los subtítulos dinámicos. `tiempoPalabra("e1", "palabra")` da el segundo de cada palabra en todo el video.

### 5. Muestra

Un corte de cámara con sus subtítulos y **un inserto animado** completo, con el diseño final. Render borrador (`npx.cmd hyperframes@0.9.30 render -q draft -o ../entregas/muestra.mp4`). La persona lo aprueba antes de hacer los demás insertos.

### 6. Insertos sobre las palabras clave

- Cada inserto es una composición en `proyecto/compositions/` (puede partir de `plantillas/escena-vertical/escena.html`), con su host en `index.html` por encima del video (`z-index` mayor), `data-start` en la palabra que lo nombra y `data-duration` hasta la palabra donde vuelve la cámara.
- **Inserto**: pantalla completa, con su propia entrada y salida (barrido, zoom, cortinilla), nunca un corte en seco a la cara.
- **Encima**: en la zona libre (normalmente abajo o a un lado de la cara), entra y sale en 0,3 s.
- Los subtítulos siguen visibles en los insertos. En los tramos de cámara no tapan la cara (`encuadre-seguro`); si la cara está abajo, sube `ALTURA` en `compositions/subtitulos.html` o cámbiala por tramo.
- Música bajita bajo la voz y efectos solo en las acciones visibles (con `data-duration`).

### 7. Borrador

`npx.cmd hyperframes@0.9.30 render -q draft -o ../entregas/borrador.mp4`. La persona lo mira y anota minuto y segundo de lo que quiere cambiar.

### 8. Exportar por red

`render -q delivery` por formato (9:16 para Reels, TikTok y Shorts; 16:9 con `formato-16x9.mjs` si va a YouTube), audio a -14 LUFS, y el texto del post para cada red.
