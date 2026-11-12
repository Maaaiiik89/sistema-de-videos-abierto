---
name: armar-personaje
description: Armar una sola vez el personaje o mascota de una marca (kit de referencias, rig con todas las acciones, prueba de 5 segundos aprobada) en mis-videos/marcas/<marca>/personaje/, para usarlo igual en todos los videos. Usar cuando la persona quiere un personaje, sube su kit de referencias, quiere cambiar su personaje o un video necesita una acción nueva del personaje.
---

# Armar el personaje de una marca

Se arma **una sola vez**, fuera de cualquier video. Después `nuevo-video.mjs` lo copia a cada video nuevo y nunca se redibuja dentro de un video. Guía técnica completa: `plantillas/personaje/LEEME.md`.

## 1. Kit de referencias

Va a `mis-videos/marcas/<marca>/referencias/personaje/` (si lo sube en el panel, ordénalo con la skill `organizar`, `--a "<archivo>=referencias/personaje"`):

- hoja de giro: de frente, tres cuartos, perfil y espalda;
- 6 expresiones;
- 4 poses clave: saludar, apuntar, caminar, cargar;
- 1 o 2 videos o GIF de cómo se mueve (solo como referencia de movimiento);
- lo que **no** puede cambiar: colores, proporciones, accesorios.

Si no tiene kit: completa `plantillas/personaje/prompt-kit.md` con los datos de la ficha y dáselo para un generador de imágenes. Espera las imágenes. Es mejor tener el kit completo antes de animar que inventar el personaje a mitad de un video.

## 2. Armarlo

1. Copia `plantillas/personaje/` a `mis-videos/marcas/<marca>/personaje/`.
2. Redibuja las partes de `personaje.js` mirando el kit, con los **mismos nombres** de partes y de acciones: `entrar`, `salir`, `respirar`, `parpadear`, `hablar`, `saludar`, `apuntar`, `expresion`, `caminar`, `saltar`. Agrega las acciones propias de la marca (ej. "llenarse", "plegarse") con nombres en español.
3. Escribe `personaje/PERSONAJE.md`: cómo es, colores exactos, proporciones, lo que no cambia, la lista de acciones y `Estado: por aprobar`.

## 3. Prueba de 5 segundos

1. Un proyecto en `personaje/prueba/` (con `npx.cmd hyperframes@0.9.30 init`) que use `prueba.html` y el `personaje.js` de la marca.
2. `npx.cmd hyperframes@0.9.30 check --json` sin errores y un `snapshot` para mirarlo tú primero (que se vean brazos y piernas sobre el fondo de la marca, que la boca se cierre al terminar de hablar).
3. Render borrador: `npx.cmd hyperframes@0.9.30 render -q draft -o ../prueba-personaje.mp4`.
4. Dile: "Tu personaje está listo para mirar: `personaje/prueba-personaje.mp4` (también en el panel, Verificar → Marca). ¿Lo apruebas o cambio algo?".
5. Solo con su sí: `Estado: aprobado (fecha)` en `PERSONAJE.md` y la fila "Personaje armado" de la ficha.

## Cambiarlo después

Cambia `personaje/` de la marca, repite la prueba y la aprobación. Los videos ya hechos conservan su copia; los nuevos usan la versión aprobada.
