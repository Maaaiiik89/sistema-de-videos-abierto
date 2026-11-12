# Estilo: ejemplo neutro

Estilo de muestra. Sirve para probar el sistema y como modelo de cómo se escribe un estilo. Cada marca nueva (skill `empezar`, `node herramientas/marcas.mjs nueva`) recibe una copia en `mis-videos/marcas/<marca>/estilo/` y ahí se cambia por los colores, fuentes y logo de la marca.

## Archivos

| Archivo | Qué tiene |
| --- | --- |
| `DESIGN.md` | Colores, tipografías y componentes. HyperFrames lo lee como especificación. |
| `reglas/voz.md` | Cómo se escribe: tono, largo de frase, palabras a evitar. |
| `reglas/movimiento-y-sonido.md` | Cómo se mueve y cómo suena. |
| `reglas/formatos.md` | Vertical, horizontal y cuadrado. |
| `assets/estilo.css` | Variables de color y clases base. |
| `assets/logo/` | Logo de muestra. |

## Las reglas que no se negocian

1. Solo los colores y tipografías de `DESIGN.md`.
2. Máximo 6 palabras por línea en pantalla y 12 por frase hablada.
3. Sin guiones largos en ningún texto.
4. Los subtítulos nunca tapan una cara (skill `encuadre-seguro`).
5. Música baja bajo la voz; efectos suaves y pocos.

## Revisión visual antes del render

- [ ] Ningún texto fuera de la zona segura del formato.
- [ ] Ningún subtítulo sobre una cara.
- [ ] El acento aparece en una sola cosa por pantalla.
- [ ] El logo aparece al final y no tapa nada.
