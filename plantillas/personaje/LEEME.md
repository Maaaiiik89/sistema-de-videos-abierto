# Personaje de la marca

Un personaje se **arma una sola vez** y después todos los videos usan el mismo. Así no cambia de un video a otro y no se redibuja cada vez.

## Qué hay aquí

| Archivo | Qué es |
| --- | --- |
| `personaje.js` | El molde: un personaje neutro (un bloque con cara) con todas las acciones. Se copia y se le cambia el dibujo |
| `prueba.html` | Escena de 5 segundos que muestra todas las acciones, para que la persona apruebe el personaje |
| `prompt-kit.md` | El texto para pedirle a un generador de imágenes el kit de referencias, si la persona no lo tiene |

## Las acciones (los nombres no cambian entre marcas)

| Acción | Para qué |
| --- | --- |
| `entrar(tl, t)` / `salir(tl, t)` | Aparecer con un salto, irse |
| `respirar(tl, t0, t1)` | Que nunca quede quieto |
| `parpadear(tl, [t1, t2])` | Parpadeos |
| `hablar(tl, t0, t1, base)` | La boca se mueve con la voz (usa `intensidadVoz`) |
| `saludar(tl, t)` | Saludar con la mano |
| `apuntar(tl, t, "derecha" o "izquierda", dura)` | Señalar un dato o un objeto |
| `expresion(tl, t, nombre)` | neutral, feliz, sorpresa, triste, enojo |
| `caminar(tl, t0, t1, dx)` | Caminar dx px con pasos |
| `saltar(tl, t)` | Salto de énfasis |

Si la marca necesita otra acción (cargar una caja, llenarse, plegarse), se agrega con su nombre y se anota en `PERSONAJE.md`.

## Cómo se arma el de una marca

1. **Kit de referencias** en `mis-videos/marcas/<marca>/referencias/personaje/`: hoja de giro (frente, tres cuartos, perfil, espalda), 6 expresiones, 4 poses (saludar, apuntar, caminar, cargar), 1 o 2 videos o GIF de cómo se mueve y la lista de lo que no puede cambiar. Si no lo tiene: `prompt-kit.md`.
2. Copiar esta carpeta a `mis-videos/marcas/<marca>/personaje/` y redibujar las partes de `personaje.js` (cuerpo, cara, ojos, boca, brazos, piernas) mirando el kit. Mismos nombres de partes y de acciones. El personaje se dibuja de frente o en tres cuartos, que es como más aparece.
3. Escribir `personaje/PERSONAJE.md` de la marca: cómo es, colores exactos, proporciones, lo que no cambia, acciones extra.
4. **Prueba de 5 segundos**: armar un proyecto con `prueba.html` (en `personaje/prueba/` de la marca), renderizar un MP4 borrador y mostrárselo a la persona. Solo con su sí, anotar en `PERSONAJE.md`: `Estado: aprobado (fecha)`.
5. Desde ahí, `nuevo-video.mjs` copia el personaje a cada video nuevo (`proyecto/assets/personaje/`). Si un video necesita un cambio del personaje, se cambia aquí y no dentro del video.

## Cómo se usa en una escena

```html
<!-- index.html, después de subtitulos.js -->
<script src="assets/personaje/personaje.js"></script>
```

```js
var pj = window.Personaje.montar(document.getElementById("escenario"), { x: 540, y: 1150, escala: 1.2 });
pj.entrar(tl, 0.2).respirar(tl, 0, DUR).parpadear(tl, [1.4, 4.1]);
pj.hablar(tl, 0.3, DUR - 0.2, host.base);
pj.apuntar(tl, P("dato"), "derecha");
```

Si el personaje es el que habla, `hablar` va en los tramos con voz. Si la voz es de una persona y el personaje solo acompaña, mejor sin `hablar`: que reaccione (expresiones, apuntar, saltar).
