# <Nombre del estilo>

Plantilla para un estilo nuevo. Copia esta carpeta entera a `estilos/<nombre-del-estilo>/` y completa cada archivo.

## Cómo sacar un estilo

- **De una web:** `npx.cmd hyperframes@0.9.30 capture <url> -o referencias/captura-<nombre> --skip-vision --json`. Saca colores, fuentes (woff2), logos y capturas. Copia las fuentes a `assets/fonts/` y los logos a `assets/logo/`.
- **De un video:** bájalo con `yt-dlp` a `referencias/<id>/` y toma su gramática: ritmo, cómo entran los títulos, paleta. Nunca su contenido ni su marca.
- **De una descripción:** fija cada adjetivo como número (hex, px, peso de fuente).

## Qué completar

| Archivo | Qué va |
| --- | --- |
| `DESIGN.md` | Colores, tipografías y componentes exactos. HyperFrames lo lee como spec. |
| `ESTILO.md` | Este archivo: las reglas que no se negocian y la checklist visual. |
| `reglas/voz.md` | Cómo habla: largo de frase, tono, palabras prohibidas. |
| `reglas/movimiento-y-sonido.md` | Eases, duraciones, transiciones, tipo de música y efectos. |
| `reglas/formatos.md` | Cómo se arma cada formato (vertical, horizontal, corto). |
| `assets/estilo.css` | `@font-face`, variables de color y clases base. |
| `assets/fonts/`, `assets/logo/` | Archivos de la marca. |
| `bloques/` | Escenas reutilizables, cuando ya haya un video hecho con este estilo. |

Si una regla no aplica (por ejemplo, sin restricción de em-dashes), bórrala. `herramientas/revisar-texto.mjs` aplica las reglas de Miguel Urra; para otro estilo, revisa que sus chequeos de fuentes y em-dashes tengan sentido.

## Las reglas que no se negocian

1.
2.
3.

## Revisión visual antes del render

- [ ]
