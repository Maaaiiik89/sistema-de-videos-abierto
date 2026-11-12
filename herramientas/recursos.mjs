#!/usr/bin/env node
// Busca recursos (fotos, música, iconos, audio) en orden, de lo más específico a lo más general:
//   1. del video      mis-videos/marcas/<marca>/videos/<video>/fuentes/
//   2. de la temática mis-videos/marcas/<marca>/tematicas/<tematica>/recursos/
//   3. de la marca    mis-videos/marcas/<marca>/recursos/
//   4. tuyos          mis-videos/recursos/            (para todas tus marcas)
//   5. del sistema    recursos/                        (músicas y sonidos libres que vienen incluidos)
// El primero que aparece es el que se usa, salvo que la persona pida otro.
//
// Uso:
//   node herramientas/recursos.mjs [<texto a buscar>] [--tipo imagen|musica|sonido|icono|audio|video]
//                                  [--video <carpeta>] [--tematica <id>] [--marca <id>] [--json]
//   Sin texto, lista todo lo del tipo pedido en cada nivel.

import { existsSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { RAIZ, DATOS, salir, slug, rel, marcaActiva, dirMarca } from "./lib/sistema.mjs";

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : undefined; };
const texto = args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
const marca = opt("marca") || marcaActiva({ obligatoria: false });
const TIPOS = {
  imagen: /\.(jpe?g|png|webp|gif|svg|heic)$/i, musica: /\.(mp3|wav|m4a|ogg|flac)$/i, sonido: /\.(wav|mp3|ogg)$/i,
  icono: /\.(svg|png)$/i, audio: /\.(m4a|mp3|wav|aac|ogg|flac)$/i, video: /\.(mp4|mov|mkv|webm)$/i
};
const tipo = opt("tipo");
if (tipo && !TIPOS[tipo]) salir(`--tipo debe ser: ${Object.keys(TIPOS).join(", ")}`);

const niveles = [];
if (marca) {
  const d = dirMarca(marca);
  if (opt("video")) niveles.push(["del video", join(d.videos, opt("video"), "fuentes")]);
  if (opt("tematica")) niveles.push(["de la temática", join(d.tematicas, opt("tematica"), "recursos")]);
  niveles.push(["de la marca", d.recursos]);
}
niveles.push(["tuyos (todas las marcas)", join(DATOS, "recursos")], ["del sistema", join(RAIZ, "recursos")]);

function recorrer(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const f of readdirSync(dir)) {
    if (f.startsWith(".")) continue;
    const p = join(dir, f);
    if (statSync(p).isDirectory()) recorrer(p, out); else out.push(p);
  }
  return out;
}

const buscado = texto ? slug(texto) : "";
const resultado = niveles.map(([nombre, dir]) => ({
  nivel: nombre, carpeta: rel(dir),
  archivos: recorrer(dir).filter((p) => /\.(jpe?g|png|webp|gif|svg|heic|mp3|wav|m4a|aac|ogg|flac|mp4|mov|mkv|webm|woff2?|ttf|otf)$/i.test(p))
    .filter((p) => !tipo || TIPOS[tipo].test(p))
    .filter((p) => !buscado || slug(p.slice(dir.length)).includes(buscado))
    .map(rel)
}));

if (args.includes("--json")) console.log(JSON.stringify(resultado, null, 2));
else {
  const primero = resultado.find((r) => r.archivos.length);
  for (const r of resultado) console.log(`${r.nivel.padEnd(26)} ${r.carpeta}  (${r.archivos.length})${r.archivos.slice(0, 8).map((a) => "\n    " + a).join("")}${r.archivos.length > 8 ? "\n    …" : ""}`);
  console.log(primero ? `\nPrimero en el orden: ${primero.archivos[0]}` : "\nNo encontré nada con eso. Pídeselo a la persona o súbelo a la bandeja.");
}
