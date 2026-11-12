# Servidor MCP `video-editor`

Herramientas para que un agente edite las grabaciones de la marca activa (`mis-videos/marcas/<marca>/grabaciones/`) con ffmpeg y whisper. Está registrado en `.mcp.json`, en la raíz del proyecto. Claude Code lo detecta solo y **pide aprobarlo la primera vez** que abres una sesión en esta carpeta.

Los originales nunca se tocan. Cada operación crea un MP4 nuevo en `editados/` de la marca activa (si el nombre existe agrega `_2`, `_3`) y un `.json` al lado con el origen, la operación, el mapa de tiempos original→nuevo y las marcas trasladadas al nuevo tiempo.

## Herramientas

| Herramienta | Qué hace |
|---|---|
| `listar_grabaciones(carpeta)` | Lista videos de la marca activa: `grabaciones`, `editados`, `bandeja` o `todas`, con duración, fuente, marcas y si están transcritos. |
| `info_video(archivo)` | Datos técnicos, el `.json` del grabador (fuente, `rect_capturado`, marcas) y la ruta de la transcripción. |
| `transcribir(archivo, modelo="medium", idioma="es", pista=None)` | whisper (usa la tarjeta gráfica si hay; si no, el procesador). Sirve para un video o un audio suelto (.wav, .mp3, .m4a, .aac). `pista`: nombres y palabras difíciles para que las escriba bien; si no se pasa, usa la fila "Palabras de la marca" de `la ficha de la marca activa`. Guarda `<nombre>.transcripcion.json` (con tiempo por palabra) y `.srt` junto al archivo. Devuelve `[inicio-fin] texto`. Reutiliza la transcripción si ya existe (`forzar=True` para rehacerla, por ejemplo después de agregar palabras a la ficha). |
| `detectar_silencios(archivo, umbral_db=-35, duracion_min=0.7)` | Tramos sin voz. |
| `ver_frames(archivo, tiempos?, cantidad=6, ancho=768)` | Devuelve imágenes del video para que el agente vea qué pasa. |
| `ensamblar(archivo, segmentos)` | Se queda con los tramos dados, en ese orden. Cada tramo acepta `velocidad` (2 = doble de rápido) y `silenciar`. |
| `quitar_silencios(archivo, umbral_db, duracion_min=0.8, margen=0.15)` | Corta las pausas largas. |
| `zoom(archivo, zonas, transicion=0.5)` | Acercamiento suave a una zona (en píxeles del video) durante un tramo, y vuelta. Máximo 4x. |
| `recortar_area(archivo, x, y, ancho, alto)` | Zoom fijo a un rectángulo durante todo el clip. |
| `unir(archivos)` | Pega videos; ajusta todo al tamaño y fps del primero. |
| `exportar_formato(archivo, formato, fondo)` | `9:16`, `1:1`, `4:5` o `16:9`. Fondo `desenfocado`, `negro` o `recortar` (con `centro_x`). |
| `limpiar_voz(archivo, reduccion_ruido=12, bajar_respiros=True, volumen_lufs=-16)` | Quita ruido de fondo y zumbido, baja respiros entre frases, suaviza eses, empareja el volumen y lo deja en -16 LUFS (pico -1.5 dBTP), medido en dos pasadas. Acepta video (copia la imagen sin recodificar) o audio suelto (`.wav`, `.mp3`, `.m4a`; sale `.wav`). Devuelve el volumen antes y después. |

`archivo` puede ser el nombre (con o sin `.mp4`) de un video en `grabaciones/` o `editados/` de la marca activa, en la bandeja, o una ruta absoluta. La marca activa sale de `mis-videos/config.json` (`node herramientas/marcas.mjs activar <id>`).

## Flujo típico

1. `listar_grabaciones` → `info_video` para leer las marcas que dejaste al grabar.
2. `transcribir` y `ver_frames` para entender el contenido.
3. Un solo `ensamblar` con todos los cortes (recodificar cuesta tiempo), después `zoom` si hace falta. Si tiene voz, `limpiar_voz` al final de los cortes.
4. `exportar_formato` para el formato de la red.

## Detalles técnicos

- Python 3.12 con el SDK `mcp` 2.x (`from mcp.server.mcpserver import MCPServer`). `uv` crea el entorno solo la primera vez (ver `pyproject.toml`).
- Codifica con la GPU AMD (`h264_amf`) si la hay; si no, con `libx264` (funciona en cualquier equipo, un poco más lento).
- Los filtros largos van a un archivo temporal (`-/filter_complex`) para no chocar con el límite de la línea de comandos de Windows.
- El zoom usa `perspective` con `eval=frame` (el tiempo sale del número de frame). `scale` + `crop` no sirve: `crop` limita la posición al tamaño inicial y siempre acerca a la esquina superior izquierda.
- Los errores se lanzan como `ToolError` para que el agente lea el motivo.
- whisper necesita `PYTHONIOENCODING=utf-8` o se cae al imprimir. La primera vez descarga el modelo elegido (`medium` pesa unos 1,5 GB).
- Si el servidor no aparece: revisa `/mcp` en Claude Code o corre `mcp-video\.venv\Scripts\python.exe mcp-video\server.py` para ver el error.
