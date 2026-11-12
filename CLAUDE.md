@AGENTS.md

## Solo para Claude (app de escritorio o consola)

- Al empezar, revisa la marca (`node herramientas/marcas.mjs lista`). Si no hay marca o la ficha dice "sin completar", invoca la skill `empezar` antes que cualquier otra cosa.
- Al empezar, revisa también los pedidos (`node herramientas/pedidos.mjs pendientes`): si hay, invoca la skill `pedidos` antes que cualquier otra cosa.
- Todo video parte de un pedido revisado y confirmado (skill `pedidos`). Después, según el tipo, invoca con la herramienta Skill antes de escribir nada: `hacer-video` (+ `hyperframes`), `editar-video-real` o `video-mixto`.
- Si la bandeja tiene archivos, invoca `organizar`.
- El servidor MCP `video-editor` está en `.mcp.json`: la primera vez la app pide aprobarlo. Avísale a la persona que elija Permitir.
- En Windows, `npx.cmd` en vez de `npx`, y Python con `uv run python`.
