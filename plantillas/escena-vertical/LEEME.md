# Escena vertical con zonas

Plantilla para cada escena de un video vertical (1080x1920) para Reels, TikTok, Shorts, LinkedIn o Facebook. Ya trae resuelto dónde va cada cosa, para que la primera versión no deje la mitad de abajo vacía ni ponga texto donde lo tapan las apps.

| Zona | Altura (px) | Qué va |
| --- | --- | --- |
| Título o dato (`#dato`) | 200 a 470 | La idea o el dato de la escena |
| Escenario (`#escenario`) | 470 a 1180 | El personaje y la acción |
| Subtítulos | 1196 a 1330 | La voz, palabra por palabra |
| Franja decorativa (`#franja`) | bajo 1330 | Recorrido, cinta, patrón: solo dibujo, sin texto |

La franja de abajo la tapan el texto del post y los botones de la app; por eso nunca lleva texto. Tampoco va nada importante a la derecha de x 960 entre 1300 y 1900.

## Cómo se usa

1. Copiar `escena.html` a `videos/<video>/proyecto/compositions/<id>.html`.
2. Reemplazar `{{ID}}`, `{{CLAVE}}` (la clave de la escena en `voz.js`, ej. `e2`) y `{{DUR}}`.
3. Cambiar el dato, poner el personaje en `#escenario` y diseñar la franja con algo de la marca (un recorrido con iconos, una cinta con productos, un patrón).
4. Cada entrada cae en la palabra que la nombra: `P("palabra")`.

## Reglas que van con la plantilla

- Nada quieto más de 2 a 3 segundos.
- El título no repite la voz: la complementa con un dato, una cifra o una pregunta.
- Al menos un dato de valor por escena.
- Entre 3 y 5 tipos de transición en todo el video, y cada una con un motivo en pantalla (algo que se mueve y lleva a la siguiente escena), no cortes en seco.
- La franja de abajo puede ser la misma en todas las escenas: da continuidad. Si es así, conviene ponerla una sola vez en `index.html` por encima de las escenas.
