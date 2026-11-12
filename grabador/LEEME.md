# Grabador de pantalla

App mínima (Python + ffmpeg) para grabar pantalla, una ventana o una región en Windows, con pausa, marcas y cámara opcional.

## Uso

Abre `Grabador.bat` (en la raíz del proyecto). Usa el Python que instala `Instalar.bat`.

1. **Fuente**: pantalla completa, `Región…` (la eliges arrastrando al grabar) o cualquier ventana abierta. `↻` refresca la lista.
2. **Micrófono**: o `(sin audio)`.
3. **Cámara**: o `(sin cámara)`. Debajo eliges posición (esquina), tamaño (pequeña, mediana, grande) y forma (círculo o rectángulo). Tu cámara queda como una ventanita dentro del video.
4. **● Grabar**.

### Barra flotante

Mientras grabas aparece arriba al centro una barra oscura con:

`● 01:23   ⏸   ■   ⚑`

- El punto rojo parpadea mientras graba. En ámbar con "iniciando…" significa que todavía está abriendo la cámara o el micro (1 a 3 s): espera a que pase a rojo antes de hablar.
- `⏸` pausa y `▶` reanuda. `■` detiene y guarda. `⚑` pone una marca.
- La puedes arrastrar a donde quieras y recuerda la posición.
- **La barra y la ventana del grabador no salen en el video.** Windows las excluye de la captura, así que se ven en tu pantalla pero no en la grabación.
- Hacer clic en la barra no le quita el foco a la app que estás grabando.

### Atajos globales

Funcionan aunque el grabador esté minimizado:

| Atajo | Acción |
|---|---|
| `Ctrl+Alt+R` | Grabar / detener |
| `Ctrl+Alt+P` | Pausar / reanudar |
| `Ctrl+Alt+M` | Poner una marca en el segundo actual |

Desde la ventana también puedes escribir una nota y pulsar **⚑ Marca** para guardar la marca con texto.

## Qué produce

Todo queda en las grabaciones de la marca activa, `mis-videos/marcas/<marca>/grabaciones/` (si todavía no hay marca, en `mis-videos/bandeja/`):

```
2026-11-10_161033_chrome.mp4    H.264 + AAC 48 kHz, fps constante, keyframe cada 1 s
2026-11-10_161033_chrome.json   metadatos, pausas y marcas (para el agente editor)
.logs/2026-11-10_161033_chrome.log   salida de ffmpeg, por si algo falla
```

Cada tramo entre pausas se graba como `.parteNN.mkv` (aguanta un corte de luz o un cierre forzado). Al detener se unen en un solo `.mp4` sin recodificar y se borran las partes. Si ves `.mkv` sueltos, es una grabación que se cortó: se pueden abrir igual.

### Esquema del `.json`

```json
{
  "fuente": { "tipo": "ventana", "titulo": "…", "proceso": "chrome.exe", "rect": [0, 0, 1920, 1020] },
  "monitor": 1,
  "rect_capturado": [0, 0, 1920, 1020],
  "ancho": 1920, "alto": 1020, "fps": 30,
  "encoder": "h264_amf", "captura": "ddagrab",
  "microfono": "Varios micrófonos (Realtek(R) Audio)",
  "camara": {
    "dispositivo": "USB2.0 HD UVC WebCam", "posicion": "abajo derecha", "forma": "círculo",
    "rect_en_video": [1586, 746, 1888, 1048], "ancho": 302, "alto": 302
  },
  "inicio": "2026-11-10T16:10:33",
  "archivo": "2026-11-10_161033_chrome.mp4",
  "duracion_s": 9.37,
  "desfase_inicio_s": 0.65,
  "pausas": [4.17],
  "marcas": [ { "t": 1.84, "nota": "aquí empieza la demo" } ],
  "version": 2
}
```

- `fuente.tipo`: `pantalla`, `ventana` o `region`.
- `marcas[].t`: segundos desde el inicio del video final (ya sin las pausas y corregidos por el tiempo de arranque).
- `pausas`: segundos del video final donde hubo una pausa. Ahí hay un salto de imagen: buen lugar para una transición.
- `camara`: `null` si no se usó. `rect_en_video` dice dónde quedó la ventanita, para no tapar nada encima al editar.
- `rect_capturado`: coordenadas reales en pantalla (píxeles físicos). Sirve para saber dónde estaba cada cosa si hay que hacer zoom.

## Para el agente editor

- Las marcas son la señal principal del autor: "cortar aquí", "esto sirve", "repetir". Si la nota está vacía, tómala como un punto de interés o un corte.
- Keyframe cada 1 s: cortes con `-c copy` son casi exactos. Para corte al frame, recodifica.
- La cámara va quemada en el video: un zoom o recorte también la mueve o la corta.
- Las herramientas de edición están en el servidor MCP `video-editor` (`mcp-video/`).

## Detalles técnicos

- Captura con `ddagrab` (Desktop Duplication, GPU). Si falla al arrancar, reintenta solo con `gdigrab`.
- Codifica con `h264_amf` (GPU AMD integrada). NVENC no sirve con el driver NVIDIA actual (pide 610+). Si no hay AMF, usa `libx264`.
- Cámara y micrófono van en una sola entrada DirectShow y **primero** en ffmpeg. Si van después, ddagrab se queda sin frames y el video sale trabado.
- Cámara: MJPEG 1280x720 a 30 fps. El círculo es una máscara con borde suavizado (`alphamerge`).
- Pausa = cortar ffmpeg y lanzar uno nuevo al reanudar. Con cámara, reanudar tarda 1 a 3 s en abrirla de nuevo.
- La barra y la ventana usan `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)`.
- Modo ventana: graba el rectángulo de la ventana al momento de empezar. Si la mueves, no la sigue.
- Audio del sistema (lo que suena en el PC) no se graba: Windows no expone "Mezcla estéreo" en este equipo.
- Errores de la interfaz quedan en `.logs/errores_ui.log` dentro de esa carpeta.
- La configuración elegida se guarda en `grabador/config.json`.

## Solo audio

En **Fuente**, la primera opción es `Solo audio (micrófono, sin video)`: graba solo el micrófono elegido, con la misma barra flotante, pausa y marcas (`Ctrl+Alt+M`). Sirve para grabar la voz de un video animado.

Deja en las grabaciones de la marca un `.m4a` (AAC 48 kHz) y su `.json` con `"fuente": {"tipo": "audio"}`, `"solo_audio": true` y las marcas. Después pasa por `limpiar_voz` del MCP `video-editor` y por Whisper como cualquier grabación.
