#!/usr/bin/env node
// Pedidos de video (ver herramientas/lib/pedidos.mjs y la skill "pedidos").
//
// Uso:
//   node herramientas/pedidos.mjs pendientes [--json]          los que esperan al agente (enviados o respondidos), de todas las marcas
//   node herramientas/pedidos.mjs lista [--marca <id>] [--json]
//   node herramientas/pedidos.mjs ver <carpeta> [--marca <id>]  el pedido completo
//   node herramientas/pedidos.mjs crear --titulo "<nombre>" [--marca <id>] [--tipo Animado|Grabado|Mixto] [--para "<foco>"]
//        [--mensaje "..."] [--accion "..."] [--publicar AAAA-MM-DD] [--redes "..."] [--duracion "30 s"] [--voz "..."]
//        [--ref "<link>=<qué le gusta>"]... [--notas "..."]           crea el pedido de lo que se conversó en el chat
//   node herramientas/pedidos.mjs revisar <carpeta> [--ok "<punto>"]... [--revisar "<punto>"]... [--pregunta "<pregunta>"]...
//        escribe la revisión; con preguntas queda "con preguntas"
//   node herramientas/pedidos.mjs estado <carpeta> <confirmado|en producción|entregado|enviado>
//
// <carpeta> es el nombre de la carpeta del video (AAAA-MM-DD_nombre) dentro de la marca.

import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DATOS, salir, rel, listaMarcas, marcaActiva, dirMarca, campoFicha } from "./lib/sistema.mjs";
import { ESTADOS, leerPedido, escribirPedido, crearPedido, pedidosDeMarca } from "./lib/pedidos.mjs";

const args = process.argv.slice(2), orden = args[0], json = args.includes("--json");
const opt = (k) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : undefined; };
const todos = (k) => args.flatMap((a, i) => (a === `--${k}` && args[i + 1] !== undefined ? [args[i + 1]] : []));
const pos = args.slice(1).filter((a, i, arr) => !a.startsWith("--") && !(arr[i - 1] || "").startsWith("--"));

// El panel muestra cuándo pasó el agente por la carpeta (paso "Abrir la carpeta en tu app")
try { writeFileSync(join(DATOS, ".ultima-conversacion"), new Date().toISOString() + "\n"); } catch { /* sin mis-videos todavía */ }

function carpetaDe(nombre, marca) {
  if (!nombre || !/^[\w.-]+$/.test(nombre)) salir("Falta la carpeta del pedido (AAAA-MM-DD_nombre). Ver: node herramientas/pedidos.mjs lista");
  const dir = join(dirMarca(marca).videos, nombre);
  if (!existsSync(join(dir, "PEDIDO.md"))) salir(`No hay pedido en ${rel(dir)}.`);
  return dir;
}
function resumen(p, marca) {
  const preg = p.preguntas.filter((q) => !q.respuesta).length;
  return `- [${p.estado}] ${p.titulo}  (${marca}/${p.carpeta}, desde ${p.origen === "panel" ? "el panel" : "el chat"}${preg ? `, ${preg} pregunta(s) sin responder` : ""})`;
}

if (orden === "pendientes" || orden === "lista") {
  const marcas = orden === "pendientes" ? listaMarcas() : [opt("marca") || marcaActiva()];
  const out = [];
  for (const m of marcas) for (const p of pedidosDeMarca(m)) if (orden === "lista" || ["enviado", "respondido"].includes(p.estado)) out.push({ marca: m, ...p, dir: undefined });
  if (json) { console.log(JSON.stringify(out, null, 2)); process.exit(0); }
  if (!out.length) { console.log(orden === "pendientes" ? "No hay pedidos esperando." : "Esta marca no tiene pedidos."); process.exit(0); }
  console.log(orden === "pendientes" ? "Pedidos que esperan tu revisión (skill pedidos):" : "Pedidos:");
  for (const p of out) console.log(resumen(p, p.marca));
} else if (orden === "ver") {
  const marca = opt("marca") || marcaActiva(), p = leerPedido(carpetaDe(pos[0], marca));
  if (json) { console.log(JSON.stringify(p, null, 2)); process.exit(0); }
  console.log(`${p.titulo}  [${p.estado}, desde ${p.origen}, ${p.creado}]`);
  for (const [k, v] of Object.entries(p.datos)) if (v) console.log(`  ${k}: ${v}`);
  if (p.refs.length) console.log("Referencias:\n" + p.refs.map((r) => `  ${r.link}  (le gusta: ${r.gusta || "sin nota"})`).join("\n"));
  if (p.archivos.length) console.log("Archivos:\n" + p.archivos.map((a) => `  ${a.archivo} -> ${a.donde}`).join("\n"));
  if (p.notas) console.log("Notas: " + p.notas);
  if (p.revision.length) console.log("Revisión:\n" + p.revision.map((r) => `  [${r.resultado}] ${r.punto}`).join("\n"));
  if (p.preguntas.length) console.log("Preguntas:\n" + p.preguntas.map((q) => `  ${q.pregunta}\n    -> ${q.respuesta || "(sin responder)"}`).join("\n"));
} else if (orden === "crear") {
  const marca = opt("marca") || marcaActiva(), titulo = opt("titulo");
  if (!titulo) salir('Falta --titulo. Ej: node herramientas/pedidos.mjs crear --titulo "Pan de Pascua" --tipo Animado --redes "Instagram Reels"');
  const datos = {
    Tipo: opt("tipo") || "", "Para qué": opt("para") || "", Mensaje: opt("mensaje") || "", "Llamado a la acción": opt("accion") || "",
    Publicar: opt("publicar") || "", Redes: opt("redes") || "", "Duración": opt("duracion") || "", Voz: opt("voz") || "",
    "Límite de créditos": (campoFicha(marca, "Límite de créditos").match(/\d+/) || ["0"])[0]
  };
  const refs = todos("ref").map((r) => { const i = r.indexOf("="); return i > 0 ? { link: r.slice(0, i), gusta: r.slice(i + 1) } : { link: r, gusta: "" }; });
  const { carpeta, dir } = crearPedido(marca, { titulo, estado: "enviado", origen: "chat", datos, refs, notas: opt("notas") || "" });
  console.log(`Pedido creado: ${rel(dir)}  (aparece en el panel, en Pedidos)\nSiguiente: revísalo (skill pedidos) y muéstrale el resumen a la persona.\nCarpeta para los demás comandos: ${carpeta}`);
} else if (orden === "revisar") {
  const marca = opt("marca") || marcaActiva(), dir = carpetaDe(pos[0], marca), p = leerPedido(dir);
  const ok = todos("ok"), rev = todos("revisar"), preg = todos("pregunta");
  if (!ok.length && !rev.length && !preg.length) salir('Nada que escribir. Usa --ok "<punto>", --revisar "<punto>" o --pregunta "<pregunta>".');
  p.revision = p.revision.concat(ok.map((x) => ({ resultado: "ok", punto: x })), rev.map((x) => ({ resultado: "revisar", punto: x })));
  p.preguntas = p.preguntas.concat(preg.map((x) => ({ pregunta: x, respuesta: "" })));
  if (preg.length) p.estado = "con preguntas";
  escribirPedido(dir, p);
  console.log(`Revisión anotada (${p.estado}). La persona la ve en el panel${preg.length ? " y puede responder ahí o en el chat" : ""}.`);
} else if (orden === "estado") {
  const marca = opt("marca") || marcaActiva(), dir = carpetaDe(pos[0], marca), nuevo = (pos[1] || "").toLowerCase();
  if (!ESTADOS.includes(nuevo) || nuevo === "borrador") salir(`Estado no válido. Usa: ${ESTADOS.filter((e) => e !== "borrador").join(", ")}`);
  const p = leerPedido(dir); p.estado = nuevo; escribirPedido(dir, p);
  console.log(`Pedido ${pos[0]}: ${nuevo}.${nuevo === "confirmado" ? " Ya puedes armar el proyecto: node herramientas/nuevo-video.mjs --carpeta " + pos[0] : ""}`);
} else {
  salir("Órdenes: pendientes, lista, ver, crear, revisar, estado. Ver el encabezado del archivo.");
}
