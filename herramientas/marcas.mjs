#!/usr/bin/env node
// Marcas: cada una es una carpeta en mis-videos/marcas/<id>/ con su ficha, estilo, personaje,
// recursos, temáticas, grabaciones, videos y plan.
//
// Uso:
//   node herramientas/marcas.mjs lista
//   node herramientas/marcas.mjs nueva "<nombre de la marca>"     crea la carpeta y la deja activa
//   node herramientas/marcas.mjs activar <id>                      cambia la marca con la que se trabaja
//   node herramientas/marcas.mjs info [<id>]                       rutas y estado de una marca
//   node herramientas/marcas.mjs tematica <nombre> [--marca <id>]  crea una temática dentro de la marca

import { existsSync, mkdirSync, cpSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { RAIZ, MARCAS, salir, slug, hoy, rel, leerConfig, guardarConfig, listaMarcas, marcaActiva, dirMarca, campoFicha } from "./lib/sistema.mjs";

const [orden, ...resto] = process.argv.slice(2);
const opt = (k) => { const i = resto.indexOf(`--${k}`); return i >= 0 ? resto[i + 1] : undefined; };
const posicional = resto.find((a, i) => !a.startsWith("--") && !resto[i - 1]?.startsWith("--"));

function estadoFicha(id) {
  const f = dirMarca(id).ficha;
  return /Estado:\s*completa/i.test(readFileSync(f, "utf8")) ? "completa" : "sin completar";
}

if (!orden || orden === "lista") {
  const c = leerConfig(), hay = listaMarcas();
  if (!hay.length) { console.log('No hay marcas todavía. Crea la primera: node herramientas/marcas.mjs nueva "<nombre>"'); process.exit(0); }
  const activa = marcaActiva({ obligatoria: false });
  for (const id of hay) console.log(`${id === activa ? "*" : " "} ${id}  (${campoFicha(id, "Nombre") || "sin nombre"}, ficha ${estadoFicha(id)})`);
  if (!c.marcaActiva && hay.length > 1) console.log("\nNinguna activa: node herramientas/marcas.mjs activar <id>");
} else if (orden === "nueva") {
  if (!posicional) salir('Falta el nombre. Ej: node herramientas/marcas.mjs nueva "Panadería La Espiga"');
  const id = slug(posicional);
  if (!id) salir("El nombre no sirve para una carpeta. Usa letras o números.");
  const d = dirMarca(id);
  if (existsSync(d.raiz)) salir(`Ya existe la marca "${id}" (${rel(d.raiz)}).`);
  for (const k of ["estilo", "personaje", "recursos", "tematicas", "grabaciones", "editados", "videos", "plan", "documentos", "referencias"]) mkdirSync(d[k], { recursive: true });
  for (const k of ["imagenes", "musica", "iconos", "audio"]) mkdirSync(join(d.recursos, k), { recursive: true });
  cpSync(join(RAIZ, "estilos", "ejemplo-neutro"), d.estilo, { recursive: true });
  const ficha = readFileSync(join(RAIZ, "plantillas", "marca-nueva", "ficha.md"), "utf8")
    .replaceAll("{{NOMBRE}}", posicional).replaceAll("{{ID}}", id).replaceAll("{{CREADA}}", hoy());
  writeFileSync(d.ficha, ficha);
  const c = leerConfig(); c.marcaActiva = id; guardarConfig(c);
  console.log(`Marca creada: ${rel(d.raiz)} (activa)
  Ficha:  ${rel(d.ficha)}  (completarla con la skill "empezar")
  Estilo: ${rel(d.estilo)}  (copia del ejemplo neutro: cambiar colores, fuentes y logo)`);
} else if (orden === "activar") {
  const hay = listaMarcas();
  if (!posicional || !hay.includes(posicional)) salir(`Marca no encontrada. Marcas: ${hay.join(", ") || "(ninguna)"}`);
  const c = leerConfig(); c.marcaActiva = posicional; guardarConfig(c);
  console.log(`Marca activa: ${posicional}`);
} else if (orden === "info") {
  const id = posicional || marcaActiva();
  const d = dirMarca(id);
  if (!existsSync(d.raiz)) salir(`No existe la marca "${id}".`);
  const cuenta = (p) => existsSync(p) ? readdirSync(p).filter((f) => !f.startsWith(".")).length : 0;
  console.log(`${campoFicha(id, "Nombre") || id}  [${id}]${id === marcaActiva({ obligatoria: false }) ? "  (activa)" : ""}
  Ficha:        ${rel(d.ficha)} (${estadoFicha(id)})
  Estilo:       ${rel(d.estilo)}
  Personaje:    ${existsSync(join(d.personaje, "personaje.js")) ? "armado" : "no"}${existsSync(join(d.personaje, "PERSONAJE.md")) && /Estado:\s*aprobado/i.test(readFileSync(join(d.personaje, "PERSONAJE.md"), "utf8")) ? " y aprobado" : ""}
  Temáticas:    ${readdirSync(d.tematicas).join(", ") || "ninguna"}
  Videos:       ${cuenta(d.videos)}
  Grabaciones:  ${cuenta(d.grabaciones)}
  Límite de créditos por video: ${campoFicha(id, "Límite de créditos") || "0"}`);
} else if (orden === "tematica") {
  const id = opt("marca") || marcaActiva();
  if (!posicional) salir('Falta el nombre. Ej: node herramientas/marcas.mjs tematica "Navidad"');
  const t = slug(posicional), dt = join(dirMarca(id).tematicas, t);
  if (existsSync(dt)) salir(`Ya existe la temática "${t}".`);
  mkdirSync(join(dt, "recursos"), { recursive: true });
  writeFileSync(join(dt, "tematica.md"), readFileSync(join(RAIZ, "plantillas", "marca-nueva", "tematica.md"), "utf8").replaceAll("{{NOMBRE}}", posicional));
  writeFileSync(join(dt, "estilo.css"), `/* Temática "${posicional}": solo lo que cambia respecto del estilo de la marca.\n   nuevo-video.mjs --tematica ${t} lo carga después de estilo.css. */\n:root {\n}\n`);
  console.log(`Temática creada: ${rel(dt)}`);
} else {
  salir("Órdenes: lista, nueva, activar, info, tematica");
}
