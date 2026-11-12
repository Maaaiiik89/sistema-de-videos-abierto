# Mis videos

Aquí está todo lo tuyo: tus marcas, tus grabaciones, tus videos y lo que subes. **Actualizar el sistema nunca toca esta carpeta.** Si quieres hacer un respaldo de tu trabajo, basta con copiar esta carpeta.

| Carpeta o archivo | Qué hay |
| --- | --- |
| `bandeja/` | Lo que subes (audios, videos, fotos, logos). El agente lo ordena y la deja vacía |
| `marcas/<marca>/` | Cada marca con su ficha, estilo, personaje, recursos, temáticas, grabaciones, videos y plan |
| `recursos/` | Tus recursos para todas las marcas (música, iconos, fotos que se repiten) |
| `registro-de-archivos.md` | Qué movió el agente desde la bandeja y a dónde |
| `config.json` | La marca activa y qué herramientas están encendidas |

Dentro de cada marca:

```
marcas/<marca>/
├── ficha.md          la marca: negocio, público, tono, colores, redes, objetivo, límite de créditos
├── estilo/           colores, fuentes, logo, reglas y bloques que usan los videos
├── personaje/        el personaje armado y aprobado (si hay)
├── referencias/      kit del personaje, capturas de la web, ejemplos que te gustan
├── recursos/         imágenes, música, iconos y audio de la marca
├── tematicas/        variantes: Navidad, lanzamiento, una serie...
├── grabaciones/      originales (nunca se modifican)
├── editados/         lo que corta y arregla el editor
├── videos/           un video por carpeta: guion, fuentes, proyecto y entregas
├── plan/             el plan de contenido de cada mes
└── documentos/       textos, PDF y lo demás de la marca
```
