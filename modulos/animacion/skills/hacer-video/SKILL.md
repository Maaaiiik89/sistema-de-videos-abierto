---
name: hacer-video
description: Cómo se hace un video animado en este sistema, del guion a la entrega. Crear la carpeta con nuevo-video.mjs, guion con presupuesto de palabras y guion visual, prueba en voz alta, voz antes que escenas, muestra de 5 a 8 segundos aprobada antes de animar todo, escenas con zonas para redes, sincronizar con la voz, borrador MP4 para revisar, validar con la persona y exportar en vertical y horizontal. Usar siempre que se haga, edite o escriba un video animado, reel, tutorial, guion o escena, junto con la skill hyperframes.
---

# Hacer un video animado

`hyperframes` dice cómo se construye un video en código. Este skill dice el orden, dónde va cada cosa y qué estilo aplicar. Cargar los dos. Trabaja siempre sobre la marca activa (`node herramientas/marcas.mjs info`); si no hay marca o su ficha dice "sin completar", primero `empezar`. Si el video es parte del plan del mes, usa su título y actualiza su etapa (skill `planificar`). Si el video lleva partes grabadas con cámara, usar `video-mixto`.

## El orden (no saltarlo)

> En el primer video que se hizo con este sistema se animó primero y se escribió el guion después: hubo que rehacer casi todo. En el segundo se animaron los 60 segundos completos, faltaba impacto y se rehizo todo otra vez. Por eso: guion visual aprobado, voz, **muestra aprobada** y recién ahí el resto.

1. Carpeta → 2. Guion y guion visual (**valida**) → 3. Voz → 4. Tiempos → 5. **Muestra de 5 a 8 s (valida)** → 6. Escenas → 7. Sonido → 8. Borrador MP4 (**valida**) → 9. Exportar.

### 1. Crear la carpeta

```bash
node herramientas/nuevo-video.mjs "<nombre>" --formato vertical [--tematica <id>]
```

Crea el video en `mis-videos/marcas/<marca>/videos/AAAA-MM-DD_<nombre>/` con el estilo de la marca (o `ejemplo-neutro` si aún no tiene), el de la temática encima si se pide, el personaje aprobado si lo hay y el límite de créditos de la ficha. Deja `LEEME.md` (ficha), `guion.md`, `fuentes/`, `proyecto/` (HyperFrames, con `subtitulos.js` y el personaje ya cargados en `index.html`) y `entregas/`. Los comandos `npx.cmd hyperframes@0.9.30` se corren dentro de `proyecto/`.

### 2. Guion y guion visual

1. Lee la ficha de la marca (`mis-videos/marcas/<marca>/ficha.md`: público, objetivo, tono, llamado a la acción) y `estilo/reglas/voz.md` de la marca.
2. **Presupuesto de palabras:** unas 2,3 palabras por segundo contando pausas. 30 s ≈ 70 palabras; 60 s ≈ 135 como máximo. Anótalo en `guion.md` antes de escribir.
3. Escribe **3 ideas** en dos o tres frases cada una, con un look distinto de `estilos/LOOKS.md`. La persona elige.
4. Escribe el guion con la **estructura de retención** para redes:
   - **Gancho (0 a 2 s):** un problema o una pregunta, con una imagen fuerte desde el primer cuadro (nada de fondo vacío ni logo al inicio).
   - **Tensión:** el problema se ve en pantalla.
   - **Solución:** la marca entra a resolver.
   - **Pruebas:** 3 o 4 ideas, cada una con su propia imagen.
   - **Dato que impacta.**
   - **Llamado a la acción.**
5. **Guion visual**, en la tabla de `guion.md`: por cada frase, *qué se ve*, *qué dato aparece en pantalla* (que complemente la voz, no que la repita palabra por palabra) y *qué transición la une con la siguiente*. Un cambio visual cada 2 a 3 segundos.
6. **Datos con fuente:** cada cifra lleva su fuente (enlace, informe) en la tabla "Fuentes de los datos". Si no hay fuente, se busca o se saca la cifra.
7. **Prueba en voz alta antes de grabar:** cuenta las palabras y estima la duración. Marca las frases difíciles de decir (trabalenguas, palabras que chocan, frases que suenan raras al leerlas) y revisa la concordancia (sujeto y verbo, singular y plural). Si se pasa del tiempo, recorta ahora, no después de grabar.
8. **La persona aprueba el guion y el guion visual juntos.** Ofrécele leerlo en voz alta para ver si suena como ella.

### 3. Voz

- La persona graba el guion: `Grabador.bat` en modo "Solo audio", o el celular. Un lugar sin eco, el micrófono a un palmo. Conviene leer cada frase dos o tres veces.
- `limpiar_voz` del editor (ruido, respiros, volumen a -16 LUFS). Acepta audio suelto (.wav, .mp3, .m4a).
- La voz que sube la persona llega a la bandeja: ordénala a `fuentes/` del video con la skill `organizar` (`--video <carpeta>`).
- Si leyó cada frase varias veces: `transcribir` y después `uv run python herramientas/elegir-tomas.py` (ver su encabezado) arma una voz limpia con la mejor toma de cada frase. Escúchala con la persona: puede haber un corte mal puesto; se corrige con `--forzar`.
- Si no hay voz grabada: voz generada solo con aprobación del costo, o video con música y texto.

### 4. Tiempos de la voz

`transcribir` sobre la voz final (acepta audio; usa las "Palabras de la marca" de la ficha como pista para que Whisper escriba bien los nombres) y:

```bash
uv run --with numpy python herramientas/preparar-voz.py <transcripcion.json> <voz.wav> "<inicio de cada escena en s>" proyecto/assets/escena/voz.js
```

Activa en `index.html` la línea de `voz.js` (viene comentada). En cada escena, `window.armarEscena(id, "e1", dur, raiz)` monta los subtítulos dinámicos, y `window.tiempoPalabra("e1", "palabra")` da el segundo exacto en que se dice una palabra: **cada acción, corte y sonido cae en la palabra que lo nombra**.

### 5. Muestra (5 a 8 s) antes de animar todo

Antes de escribir el resto, lee `references/story.md` y `references/motion.md` de la skill `hyperframes`, busca bloques con `npx.cmd hyperframes@0.9.30 catalog` y escribe `proyecto/SPEC.md` con el plan visual: paleta, tipos de transición (3 a 5, cada una con su motivo), qué se ve en cada escena, la franja decorativa y la música.

Arma **el gancho más una escena**, ya con el diseño final: personaje, colores, subtítulos, franja decorativa y música. Render borrador:

```bash
npx.cmd hyperframes@0.9.30 render -q draft -o ../entregas/muestra.mp4
```

Dáselo a la persona (se abre con doble clic): "Esta es la muestra con el estilo final. ¿Sigo así con el resto o cambio algo?". **Recién con su sí se anima el resto.**

### 6. Escenas

- Una escena por parte del guion, en `proyecto/compositions/`, partiendo de `plantillas/escena-vertical/escena.html`. Esa plantilla trae las zonas:

  | Zona | Altura (px) | Qué va |
  | --- | --- | --- |
  | Título o dato | 200 a 470 | La idea o el dato de la escena |
  | Escenario | 470 a 1180 | El personaje y la acción |
  | Subtítulos | 1196 a 1330 | La voz, palabra por palabra |
  | Franja decorativa | bajo 1330 | Recorrido, cinta, patrón: solo dibujo, sin texto |

  La franja de abajo la tapan las apps, por eso nunca lleva texto. La mitad de abajo nunca queda vacía.
- Fotos, música o iconos: `node herramientas/recursos.mjs` (orden: video, temática, marca, tuyos, sistema; skill `organizar`).
- Antes de escribir algo desde cero: bloques de la marca (`estilo/bloques/`) y el registro de HyperFrames (`/hyperframes-registry`, `npx.cmd hyperframes@0.9.30 catalog`).
- **Reglas fijas:**
  - nada quieto más de 2 a 3 segundos;
  - 3 a 5 tipos de transición en todo el video, cada una con un motivo en pantalla (nada de cortes en seco);
  - los títulos no repiten la voz;
  - al menos un dato de valor por escena.
- El personaje: `window.Personaje.montar(...)` y sus acciones (`plantillas/personaje/LEEME.md`). Nunca se redibuja dentro de un video: si hay que cambiarlo, se cambia en `personaje/` de la marca (skill `armar-personaje`).
- Subtítulos dentro de la zona segura y sin tapar caras: skill `encuadre-seguro`.
- Formato: el `index.html` declara `window.__FORMATO`. Si una escena necesita algo distinto en horizontal, usa `host.horizontal` (JS) o `.fmt-h` (CSS).
- **Duración:** el `data-duration` de la raíz es el fin de la voz más el cierre con el logo, ni un segundo más. Si sobra tiempo, el video termina en negro.

### 7. Sonido

- Voz en una pista `<audio>` desde el segundo 0.
- Música: la de la marca (ficha), una de `recursos/musica/` o el catálogo de HyperFrames (`npx.cmd hyperframes@0.9.30 media-use resolve --type bgm --intent "<ánimo>"`, requiere `Conectar-musica.bat`). Bajita bajo la voz (que baje sola cuando hay voz), entra suave y sale con el logo.
- Efectos de `recursos/sonidos/` solo en acciones visibles, ubicados en la palabra. **Cada efecto lleva `data-duration`** (la duración del archivo, en `sonidos.json`): sin eso se alarga hasta el final del video.

### 8. Revisar y validar

```bash
node herramientas/revisar-texto.mjs mis-videos/marcas/<marca>/videos/<carpeta>
cd mis-videos/marcas/<marca>/videos/<carpeta>/proyecto && npx.cmd hyperframes@0.9.30 check --json
npx.cmd hyperframes@0.9.30 snapshot --at <segundos>
npx.cmd hyperframes@0.9.30 render -q draft -o ../entregas/borrador.mp4
```

Mira tú los cuadros primero. Después **la persona mira el borrador MP4** (doble clic; la vista previa del navegador a veces no suena). Pídele que anote minuto y segundo de lo que no le guste. Corrige y vuelve a mandar un borrador.

### 9. Exportar

```bash
npx.cmd hyperframes@0.9.30 render -q delivery -o ../entregas/<nombre>.mp4
node herramientas/formato-16x9.mjs "mis-videos/marcas/<marca>/videos/<carpeta>"        # si va a YouTube
cd "mis-videos/marcas/<marca>/videos/<carpeta>/proyecto-16x9" && npx.cmd hyperframes@0.9.30 render -q delivery -o ../entregas/<nombre>-16x9.mp4
```

Deja el audio a -14 LUFS (ver `estilos/ejemplo-neutro/reglas/movimiento-y-sonido.md`). Revisa que el último cuadro no sea negro. Estado `entregado` en `LEEME.md`. Propón el texto del post para cada red. Si una escena o un efecto sirve para otros videos, cópialo a `estilo/bloques/` de la marca. Actualiza la etapa del video en el plan del mes.
