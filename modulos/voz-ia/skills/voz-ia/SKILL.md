---
name: voz-ia
description: Narración con voz generada por IA (HyperFrames/HeyGen) cuando la persona no quiere o no puede grabar su voz. Cuesta créditos. Usar solo cuando la persona pide una voz generada o dice que no grabará su voz.
---

# Voz con IA

Una voz grabada por la persona suena más real y no cuesta nada: ofrécela primero. Este módulo es para cuando no quiere o no puede grabar.

## Reglas de gasto (obligatorias)

1. La cuenta debe estar conectada (`Conectar-musica.bat`; comprobar con `npx.cmd hyperframes@0.9.30 auth status`).
2. El límite de créditos del video está en `proyecto/.hyperframes/credit-limit.json` (sale de la ficha de la marca; 0 por defecto = nada pagado). **No lo subas por tu cuenta.** Si es 0, explícale que hay que subir el "Límite de créditos por video" de la ficha y espera que te lo pida.
3. Antes de generar: calcula el costo con `--plan` (ver la skill `media-use`), dile el precio en créditos y **espera un sí**.
4. Genera una muestra corta primero (una o dos frases) y que la apruebe antes de narrar todo el guion.

## Flujo

- Guion aprobado → elegir voz (muestra corta) → aprobar → narrar todo → seguir desde el paso "Tiempos de la voz" de `hacer-video` como si fuera una voz grabada.
- La voz generada queda en `fuentes/` del video. Anota en `LEEME.md` del video que la voz es generada y cuántos créditos costó.
- Al terminar, recuérdale que puede volver a bajar el límite a 0.
