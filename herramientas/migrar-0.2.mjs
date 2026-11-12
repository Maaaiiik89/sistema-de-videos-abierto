#!/usr/bin/env node
// Trae tu trabajo de la versión 0.2 (una sola marca, carpetas sueltas) a la estructura nueva
// (mis-videos/marcas/<marca>/). COPIA, no mueve: la carpeta vieja queda igual.
//
// Uso: node herramientas/migrar-0.2.mjs "<carpeta de la versión 0.2>" [--nombre "<nombre de la marca>"] [--probar]
//   --probar   muestra qué copiaría, sin copiar nada
//
// Qué copia (si existe en la carpeta vieja):
//   mi-marca/FICHA.md            -> marcas/<id>/ficha.md
//   estilos/mi-marca/            -> marcas/<id>/estilo/   (y su personaje/ -> marcas/<id>/personaje/)
//   mi-marca/logo/, fuentes/     -> marcas/<id>/estilo/assets/logo/, fuentes/
//   mi-marca/personaje/          -> marcas/<id>/referencias/personaje/   (el kit de referencias)
//   videos/, grabaciones/, editados/  -> marcas/<id>/videos/, grabaciones/, editados/
//   recursos/musica/ (lo que agregaste)  -> mis-videos/recursos/musica/

import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, cpSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { RAIZ, DATOS, salir, slug, rel, leerConfig, guardarConfig, dirMarca } from "./lib/sistema.mjs";

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : undefined; };
const vieja = args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
const probar = args.includes("--probar");
if (!vieja) salir('Falta la carpeta de la versión 0.2. Ej: node herramientas/migrar-0.2.mjs "D:\\Respaldos\\sistema-de-videos-abierto-viejo"');
const V = resolve(vieja);
if (V === RAIZ) salir("Esa es esta misma carpeta. Indica la carpeta de la versión anterior.");
if (!existsSync(join(V, "mi-marca")) && !existsSync(join(V, "videos"))) salir(`No parece una carpeta de la versión 0.2 (no tiene mi-marca/ ni videos/): ${V}`);

const fichaVieja = join(V, "mi-marca", "FICHA.md");
const nombreFicha = existsSync(fichaVieja) ? ((readFileSync(fichaVieja, "utf8").match(/^\|\s*Nombre\s*\|(.*)\|\s*$/m) || [])[1] || "").trim() : "";
const nombre = opt("nombre") || nombreFicha;
if (!nombre) salir('No encontré el nombre de la marca en mi-marca/FICHA.md. Pásalo con --nombre "<nombre>".');
const id = slug(nombre), d = dirMarca(id);
if (existsSync(d.raiz) && readdirSync(d.raiz).length) salir(`Ya existe la marca "${id}" con contenido (${rel(d.raiz)}). No se mezcla: renómbrala o usa --nombre con otro nombre.`);

// Un archivo cuenta si existe; una carpeta, si tiene algo además de .gitkeep
const tieneAlgo = (p) => existsSync(p) && (statSync(p).isFile() || readdirSync(p).some((f) => !f.startsWith(".")));
const pasos = [];
const copiar = (desde, hacia, que) => { if (tieneAlgo(desde)) pasos.push([desde, hacia, que]); };

copiar(fichaVieja, d.ficha, "ficha de la marca");
const estiloViejo = join(V, "estilos", "mi-marca");
copiar(estiloViejo, d.estilo, "estilo de la marca");
copiar(join(estiloViejo, "personaje"), d.personaje, "personaje armado");
copiar(join(V, "mi-marca", "logo"), join(d.estilo, "assets", "logo"), "logo");
copiar(join(V, "mi-marca", "fuentes"), join(d.estilo, "assets", "fuentes"), "fuentes");
copiar(join(V, "mi-marca", "personaje"), join(d.referencias, "personaje"), "kit de referencias del personaje");
for (const c of ["videos", "grabaciones", "editados"]) copiar(join(V, c), d[c], c);
const musicaVieja = join(V, "recursos", "musica");
if (existsSync(musicaVieja)) for (const f of readdirSync(musicaVieja)) {
  if (!["alegre.mp3", "corporativa.mp3", "tranquila.mp3", "energica.mp3", "emotiva.mp3", "LEEME.md"].includes(f) && !f.startsWith("."))
    pasos.push([join(musicaVieja, f), join(DATOS, "recursos", "musica", f), "música que agregaste"]);
}

if (!pasos.length) salir("No encontré nada para traer en esa carpeta.");
console.log(`${probar ? "Se copiaría" : "Copiando"} a la marca "${nombre}" (${rel(d.raiz)}):`);
for (const [a, b, q] of pasos) console.log(`  ${q}: ${a.replace(V, "<vieja>").replace(/\\/g, "/")} -> ${rel(b)}`);
if (probar) process.exit(0);

for (const k of ["estilo", "personaje", "recursos", "tematicas", "grabaciones", "editados", "videos", "plan", "documentos", "referencias"]) mkdirSync(d[k], { recursive: true });
for (const [a, b] of pasos) {
  mkdirSync(statSync(a).isDirectory() ? b : join(b, ".."), { recursive: true });
  cpSync(a, b, { recursive: true, force: false, errorOnExist: false });
}
// La carpeta personaje/ quedó también dentro de estilo/ (venía así en 0.2): se deja, no estorba
if (!existsSync(d.ficha)) writeFileSync(d.ficha, readFileSync(join(RAIZ, "plantillas", "marca-nueva", "ficha.md"), "utf8").replaceAll("{{NOMBRE}}", nombre).replaceAll("{{ID}}", id).replaceAll("{{CREADA}}", "migrada de 0.2"));
const c = leerConfig(); c.marcaActiva = id; guardarConfig(c);
console.log(`\nListo. Marca activa: ${id}. La carpeta vieja no se tocó.
Revisa la ficha (le faltan las secciones nuevas: Contenido y Cuentas y gastos) con el agente: "revisa mi ficha y complétala".`);
