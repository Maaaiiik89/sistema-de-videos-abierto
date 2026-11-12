---
name: colores
description: Proponer, verificar y aplicar paletas de colores de una marca con contraste probado (5 colores, 4 pruebas WCAG) usando herramientas/paleta.mjs. Usar cuando la persona pide colores para su marca, quiere cambiarlos ("más cálidos", "como mi logo"), crea una temática, o cuando un texto no se lee bien en un video.
---

# Colores con contraste probado

Una paleta tiene 5 colores: **fondo**, **fondo 2** (franjas y paneles), **texto**, **acento** y **acento 2**. Para usarla tiene que pasar 4 pruebas:

| Prueba | Mínimo |
| --- | --- |
| Texto sobre fondo | 4,5:1 |
| Acento sobre fondo | 3:1 |
| Palabra marcada de los subtítulos (blanco o negro sobre el acento) | 3:1 |
| Acento 2 sobre fondo | 3:1 |

Nunca propongas una paleta que no pasa sin decirlo.

La persona también puede armar la paleta en el panel: elige su color principal, el panel le recomienda 4 combinaciones (complementaria, análoga, tríada y dividida, con la misma fórmula que `generar`), ajusta cada color y la guarda con `aplicar` (solo si pasa las 4 pruebas). Si te dice que la eligió en el panel, ya está aplicada: revisa con `verificar --marca <id>`.

## Herramienta

```bash
node herramientas/paleta.mjs probadas                                   # 7 paletas por tipo de negocio
node herramientas/paleta.mjs generar --base "#F2A93B" --armonia complementaria --fondo oscuro
node herramientas/paleta.mjs verificar --marca <id>                     # la paleta actual de la marca
node herramientas/paleta.mjs verificar --fondo … --fondo2 … --texto … --acento … --acento2 …
node herramientas/paleta.mjs aplicar --marca <id> --fondo … --fondo2 … --texto … --acento … --acento2 …
node herramientas/paleta.mjs proponer --marca <id> --limpiar            # antes de una tanda nueva de propuestas
node herramientas/paleta.mjs proponer --marca <id> --nombre "Miga clara" --para "Más luminosa, para el feed" --fondo … --fondo2 … --texto … --acento … --acento2 …
```

Armonías: `complementaria` (el acento 2 al otro lado del círculo), `analoga` (vecino, más tranquilo), `triadica` (más alegre), `dividida` (contraste suave). `--fondo claro` u `oscuro`.

## Cómo proponer

1. Parte de algo de la marca: el color del logo (sácalo del SVG o pídelo), un color de la web o lo que la persona describe ("verde de naturaleza").
2. Genera con 2 armonías y fondo claro u oscuro según el rubro, y mira las probadas que calcen con el rubro.
3. Muéstrale **3 opciones** con los 5 colores y su resultado ("pasa las 4 pruebas"), y para qué sirve cada una en una frase. Puedes describir cómo se vería: "fondo café oscuro, títulos crema, la palabra marcada en naranjo". Guárdalas con `proponer` (primero `--limpiar`) para que las vea con sus colores en el panel: Verificar → Marca.
4. Con su elección, `aplicar` (solo aplica si pasa todas; `--forzar` únicamente si la persona insiste después de explicarle qué texto se va a leer mal).
5. Avísale que lo puede revisar en el panel (Verificar → Marca) y que los videos ya hechos no cambian. Anota los 5 colores en la fila "Colores" de la ficha.

Para una **temática**, no toques `estilo.css` de la marca: escribe solo las variables que cambian en `tematicas/<id>/estilo.css` y verifícalas con `verificar` usando los colores combinados.
