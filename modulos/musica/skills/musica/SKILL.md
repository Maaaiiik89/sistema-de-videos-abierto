---
name: musica
description: Buscar y usar música de fondo del catálogo gratis de HyperFrames (cuenta conectada con Conectar-musica.bat), además de las 5 músicas libres incluidas. Usar cuando un video necesita música y la persona quiere algo distinto a las 5 pistas de recursos/musica/, o pide "busca una música alegre".
---

# Música del catálogo

Siempre hay 5 pistas libres (CC0) en `recursos/musica/` y la música de la marca en su ficha. Este módulo agrega el catálogo de HyperFrames (miles de pistas, gratis con cuenta).

## Antes de buscar

1. ¿Está conectada la cuenta? `npx.cmd hyperframes@0.9.30 auth status` (debe decir "valid").
2. Si no: pídele **doble clic en `Conectar-musica.bat`** (carpeta del sistema). Se abre el navegador, entra con su cuenta y vuelve. Nunca le pidas que escriba comandos ni contraseñas.

## Buscar y usar

Dentro de `proyecto/` del video:

```bash
npx.cmd hyperframes@0.9.30 media-use resolve --type bgm --intent "<ánimo, ritmo, instrumentos>" --project .
```

- Describe el ánimo con la ficha de la marca y el guion ("alegre, ukelele, ritmo medio, para una panadería").
- La pista queda en `assets/` del proyecto. Si la persona la quiere para más videos, cópiala a `recursos/musica/` de la marca y anótala en la ficha.
- Mezcla: bajita bajo la voz, que baje sola cuando hay voz, entra suave y sale con el logo (`estilos/ejemplo-neutro/reglas/movimiento-y-sonido.md`).
- El catálogo es gratis. **Música generada con IA cuesta créditos:** di el precio y espera un sí, y respeta el límite de créditos del video (`proyecto/.hyperframes/credit-limit.json`).
