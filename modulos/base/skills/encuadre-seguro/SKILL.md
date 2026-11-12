---
name: encuadre-seguro
description: Zonas seguras para redes y YouTube, y subtítulos que no tapan caras. Usar al armar o revisar cualquier escena con personajes, subtítulos o texto: decide dónde va cada cosa en vertical (Reels, TikTok, Shorts, LinkedIn) y en horizontal (YouTube), y reacomoda cámara y objetos para que todo se lea y respire.
---

# Encuadre seguro

## Zonas en vertical (1080x1920)

| Franja | Alto | Qué va |
| --- | --- | --- |
| Barra de estado | 0 a 220 | nada importante |
| Títulos | 220 a 450 | kicker y título de la escena |
| Acción | 450 a 1050 | caras, objetos que explican, el momento importante |
| Subtítulos | 900 a 1330 | la línea que se dice (se mueve dentro de esta franja para no tapar caras) |
| Interfaz de la app | 1330 a 1920 | solo cuerpo, piso, fondo. Ahí van el texto del post, el usuario y los botones |

Además: el texto nunca pasa de x = 960 (a la derecha está la columna de botones: me gusta, comentar, compartir). Margen izquierdo de 70 px.

## Zonas en horizontal (1920x1080, YouTube)

Texto dentro de x 120 a 1800 e y 90 a 960. El borde de abajo tiene la barra de reproducción: los subtítulos van entre 700 y 960, o arriba si abajo hay caras.

## Subtítulos

- Tipografía de texto de la marca, 700, 58 px en vertical, contorno oscuro de 10 px; la palabra que se dice se marca con el acento de la marca. Máximo 2 líneas y 6 palabras por línea: si una frase no cabe, se parte en dos subtítulos seguidos.
- **No tapan caras.** `ubicarSubtitulos()` (en el motor de escenas 3D, cuando el video lo usa) prueba cada línea en varias alturas, mide dónde quedan en pantalla las cabezas de los personajes y los objetos importantes durante esa línea, y elige la altura libre dentro de la zona. Uso, al final de la escena:
  ```js
  U.ubicarSubtitulos(ctx, host.render, SUBS, () => [[personaje.cabeza, 1], [mascota.cabeza, 1], [tarjeta.grupo, 0.6]], { ranuras: [900, 1150, 1010] });
  ```
  `SUBS` es la lista `[selector, desde, hasta]`; el peso dice cuánto importa no taparlo (caras 1, objetos 0,4 a 0,6).

## Si no hay hueco, se recompone

Cuando ninguna altura queda libre, el problema es la composición, no el subtítulo:
- Plano demasiado cerrado: abrirlo para que la cara ocupe la franja de acción y no toda la pantalla.
- Objetos acumulados: mostrarlos de a uno en la misma posición, no apilados.
- Objetos y caras peleando la franja del medio: subir los objetos o bajar la cámara para dejar una franja libre entre ambos.

## Revisión

Antes de entregar, una captura en la mitad de cada subtítulo (`npx.cmd hyperframes@0.9.30 snapshot --at ...`) y mirar: ninguna línea sobre una cara, nada fuera de la zona, nada en la franja de la interfaz.
