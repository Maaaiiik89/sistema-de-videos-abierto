---
name: organizar
description: Mantener ordenados los archivos del sistema de videos. Ordena la bandeja (mis-videos/bandeja/) en las carpetas de la marca, busca recursos en el orden video, temática, marca, tuyos y sistema, y lleva el registro de movimientos. Usar cuando la persona sube algo ("te dejé mi logo", "subí la voz", "ordena la bandeja"), cuando se necesita una foto, música o icono para un video, o antes de empezar un video si la bandeja tiene archivos.
---

# Organizar archivos

La persona sube todo a un solo lugar (el panel → Subir, o directo a `mis-videos/bandeja/`). Tú lo ordenas y mantienes el orden. **Nunca borras nada y nunca sobrescribes**: si un nombre existe, la herramienta agrega `_2`. Cada movimiento queda en `mis-videos/registro-de-archivos.md`.

## Ordenar la bandeja

1. Mira la propuesta (no mueve nada):
   ```bash
   node herramientas/ordenar.mjs
   ```
2. Ajusta lo que la herramienta no puede saber:
   - Si los audios, fotos o clips son para un video en curso: `--video <carpeta-del-video>` (van a sus `fuentes/`).
   - Si un archivo va a otro lugar: `--a "<archivo>=<ruta relativa a la marca>"` (ej. `--a "foto.jpg=tematicas/navidad/recursos"`).
   - Si hay un `.zip` o un archivo raro: pregúntale a la persona qué es.
   - Si hay varias marcas y no está claro de cuál es: pregunta, y usa `--marca <id>`.
3. Aplica:
   ```bash
   node herramientas/ordenar.mjs --aplicar [--video …] [--a …]
   ```
4. Cuéntale en una frase qué quedó dónde ("tu logo quedó en el estilo de la marca; las 3 fotos, en recursos").

Si el archivo es un logo o una fuente, después de ordenarlo actualiza el estilo de la marca (logo en `estilo/assets/logo/`, `@font-face` en `estilo/assets/estilo.css`). Si es un kit de personaje, va a `referencias/personaje/` (skill `armar-personaje`).

## Dónde va cada cosa (dentro de `mis-videos/marcas/<marca>/`)

| Qué | Dónde |
| --- | --- |
| Video grabado (original) | `grabaciones/` (nunca se modifica) |
| Voz, fotos o clips de un video | `videos/<video>/fuentes/` |
| Fotos del negocio y productos | `recursos/imagenes/` |
| Música de la marca | `recursos/musica/` |
| Iconos | `recursos/iconos/` |
| Logo | `estilo/assets/logo/` |
| Fuentes | `estilo/assets/fuentes/` |
| Documentos, PDF, textos | `documentos/` |
| Kit del personaje, capturas de la web, ejemplos | `referencias/` |
| Recursos de una temática | `tematicas/<temática>/recursos/` |
| Recursos para todas las marcas | `mis-videos/recursos/` |

## Buscar un recurso

Cuando un video necesita una foto, una música o un icono, busca en orden, de lo más específico a lo más general:

```bash
node herramientas/recursos.mjs "<texto>" --tipo imagen|musica|sonido|icono|audio|video --video <carpeta> --tematica <id>
```

Orden: **del video → de la temática → de la marca → tuyos (todas las marcas) → del sistema**. Usa el primero que aparece, salvo que la persona pida otro. Para usarlo en el video, **cópialo** a `proyecto/assets/media/` del video; el original se queda donde está. Si no hay nada que sirva, pídeselo a la persona ("¿tienes una foto del horno? súbela en el panel").

## Reglas

- Nombres con fecha: `AAAA-MM-DD_descripcion.ext`, en minúsculas y sin espacios (la herramienta lo hace sola).
- Nada suelto en `mis-videos/` ni en la raíz de la marca: todo en su carpeta.
- No muevas nada fuera de `mis-videos/`. No toques las carpetas del sistema.
- Si la persona pide borrar algo, confirma qué es y dónde está antes, y anótalo en el registro.
