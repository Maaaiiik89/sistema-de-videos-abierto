# Recursos del sistema

Lo que viene incluido con el sistema (músicas y sonidos libres). **Esta carpeta la reemplaza Actualizar**: lo tuyo no va aquí.

| Lo tuyo | Dónde |
| --- | --- |
| Para todas tus marcas | `mis-videos/recursos/` |
| De una marca | `mis-videos/marcas/<marca>/recursos/` (imagenes, musica, iconos, audio) |
| De una temática | `mis-videos/marcas/<marca>/tematicas/<tematica>/recursos/` |
| De un video | `fuentes/` del video |

El agente busca en ese orden, de lo más específico a lo más general, y esta carpeta es la última (`node herramientas/recursos.mjs`, skill `organizar`). Para usar un recurso en un video, se **copia** a `proyecto/assets/media/` del video; el original se queda donde está.

| Carpeta | Qué hay |
| --- | --- |
| `musica/` | 5 pistas libres (CC0): alegre, corporativa, tranquila, enérgica, emotiva (ver `musica/LEEME.md`) |
| `sonidos/` | 11 efectos suaves, recortados y nivelados (ver abajo y `sonidos/CREDITOS.md`) |

## Sonidos

11 efectos en WAV 48 kHz mono, todos con el pico en -6 dBFS (mismo volumen entre sí), con agudos suavizados y fade de salida. `sonidos/sonidos.json` tiene, por cada uno, su duración, **`golpe_s`** (en qué segundo del archivo pega) y su uso.

| Tipo | Archivos | Cuándo |
| --- | --- | --- |
| `click-suave` | 1 a 3 | Click del cursor en pantalla |
| `tecla` | 1 y 2 | Una letra o línea de texto que aparece |
| `pop-suave` | 1 a 3 | Un número, pill o tarjeta chica que aterriza |
| `aire` | 1 y 2 | Cambio de escena o barrido de color |
| `papel` | 1 | Una tarjeta que entra deslizando |

Cómo usarlos en HyperFrames:

- Volumen del `<audio>`: `data-volume="0.3"` a `0.4` con voz o música; nunca 1.
- Siempre con `data-duration` (la duración del archivo, en `sonidos.json`): sin eso el efecto se alarga hasta el final del video.
- Para que suene justo cuando se ve: `data-start` = momento visual − `golpe_s` + 0.033 (un cuadro después de la imagen).
- Rotar las tomas: no usar el mismo archivo dos veces seguidas.
- Créditos: `sonidos/CREDITOS.md`. `aire_1` y `papel_1` son CC BY: si se usan, va la línea del autor en la descripción del video.

Nada de risers, impactos, campanas ni glitch: el estilo los prohíbe y no están en el pack.
