# Catálogo de looks y efectos

El **estilo** (`estilos/<estilo>/`) dice los colores, las tipografías, la voz y el sonido. El **look** dice cómo se anima: el mundo, los personajes, la cámara. Cualquier look se puede hacer con cualquier estilo: el look pone la forma y el estilo pone la marca.

Una referencia (un video que te gusta) aporta su gramática: ritmo, cómo entran los títulos, cómo se mueve la cámara. Nunca su contenido, su marca ni sus personajes.

## Regla para variar

1. Cada `LEEME.md` de video dice qué look usó y qué efectos (filas `Look` y `Efectos`).
2. Las 3 ideas de guion de un video nuevo usan **3 looks distintos**, y al menos una usa un look que no salió en los últimos 3 videos.
3. Un video no repite los efectos principales del video anterior.
4. Si traes una referencia nueva que no calza con ningún look, se agrega aquí como look nuevo, con su carpeta en `referencias/`.

## Looks

| # | Look | Cómo se ve | Para qué sirve | Costo |
| --- | --- | --- | --- | --- |
| 1 | **Tipografía de marca** | Planos de color de la marca, títulos gigantes, objetos de interfaz simples. Sin personajes. | frases fuertes, anuncios, consejos rápidos | bajo |
| 2 | **Infografía oscura** | Fondo oscuro todo el video, subtítulo arriba con la palabra clave marcada, íconos que se multiplican, contadores y gráficos. Pide voz en off. | datos, comparaciones, "3 errores que..." | medio |
| 3 | **Personaje de línea** | Fondo claro, un personaje 2D de contorno negro al centro, un solo color de acento, encabezado con número (`PASO 01/05`). | tutoriales por pasos | medio |
| 4 | **3D en primera persona** | 3D de pocos polígonos, cámara en los ojos del protagonista, manos a la vista, contraplanos del personaje. | historias del día a día, "un día en mi negocio" | alto |
| 5 | **Mundo 3D con celulares** | Mundo 3D simple (mapas, casas, caminos) que la cámara recorre, alternado con celulares que muestran publicaciones. | negocios locales, delivery, turismo | alto |
| 6 | **Tour de producto** | Tarjetas de interfaz con cifras reales y un cursor que navega. | demos de software, servicios digitales | bajo |
| 7 | **Vector plano** | Ilustración plana con un celular o un objeto central. | explicar conceptos (pagos, embudo, automatización) | medio |
| 8 | **Acción continua** | Un sujeto que nunca se detiene, con datos que aparecen encima. | procesos, métricas | medio |
| 9 | **Escenario de dibujos** | Personaje en escenarios planos, la voz lleva la historia. | historias con humor | alto |
| 10 | **Periodismo visual** | Foto, cifra grande, círculos y etiquetas. | noticias del rubro | medio |
| 11 | **Cuaderno** | Papel, garabatos a mano, recortes. | la historia de una idea | medio |
| 12 | **Collage** | Recortes, flechas a mano y frases marcadas. | explicadores | medio |
| 13 | **Bloques de color** | Tipografía gigante en bloques de color que se empujan. | frases fuertes | bajo |
| 14 | **Ilustración pintada con código** | Fondos y objetos pintados en uno de 83 estilos (skill `ilustrar`), animados en capas. | dar un look único sin fotos | medio |

Con tu marca: el acento de cualquier referencia pasa a tu color de acento, los fondos a tus colores y las tipografías a las de tu `DESIGN.md`.

Los looks 6 a 13 vienen de Bang Motion (github.com/bangtutorial/bang-motion, MIT), que se usa como biblioteca de ideas, no como segundo motor. Si quieres ver sus ejemplos, bájalo a `referencias/bang-motion/`.

Reglas que conviene seguir en cualquier look:

- Una escena es 3 a 5 elementos que se apilan y se mueven, nunca una lámina con texto.
- Nada quieto más de 3 segundos mientras se habla.
- En escenarios con personaje: la cámara nunca abre del todo y entre escenarios va un corte.
- Un personaje respira siempre (movimientos leves) y parpadea cada 3 a 4 segundos.

## Efectos

Antes de escribir uno a mano, se busca el bloque en el registro (`npx.cmd hyperframes@0.9.30 catalog "<palabras>"`) y se adapta a la marca.

| # | Efecto | Qué se ve | Bloques del registro para partir |
| --- | --- | --- | --- |
| 01 | Rompe el marco | El personaje sale del cuadro que lo contiene | `freeze-frame-dressing`, `transitions-destruction` |
| 02 | Atraviesa la escena | La cámara pasa a través de un objeto hacia la escena siguiente | `zoom-through-transition`, `parallax-zoom` |
| 03 | Letras de cristal | Tipografía 3D transparente detrás del personaje | `glass-shard-title`, `vfx-liquid-glass` |
| 04 | Órbita | Elementos girando alrededor del personaje (que no le crucen la cara) | `locked-nucleus-orbit` |
| 05 | Interfaces flotantes | Tarjetas de apps alrededor del personaje | `liquid-glass-notification`, `app-showcase` |
| 06 | Muro de titulares | Frases pegadas con cinta detrás del personaje | `freeze-frame-dressing` (cinta y papel) |
| 07 | Celular con vida | Un celular que se mueve y muestra una pantalla | `device-frame-stage`, `parallax-device-dive`, `notification-cascade` |
| 08 | Gráfico que crece | Datos que se animan (solo cifras reales) | `animated-bar-chart`, `data-chart` |
| 09 | Garabatos vivos | Flechas y notas a mano que tiemblan | `hw-boil`, `hw-frame`, `hw-title`, `hw-text-cloud` |
| 10 | Zoom digital | Acercamiento de golpe con marco de cámara | `cursor-zoom-follow` |

Con una persona grabada (no dibujada), los efectos 01, 04, 05, 06 y 09 necesitan quitarle el fondo primero (`npx.cmd hyperframes@0.9.30 remove-background`).
