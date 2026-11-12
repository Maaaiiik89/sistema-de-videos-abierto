#!/usr/bin/env node
// Ordena la bandeja (mis-videos/bandeja/): cada archivo va a la carpeta que corresponde de la marca,
// con fecha en el nombre. Nunca borra ni sobrescribe: si el nombre existe, agrega _2, _3...
// Cada movimiento queda anotado en mis-videos/registro-de-archivos.md.
//
// Uso:
//   node herramientas/ordenar.mjs                       muestra la propuesta (no mueve nada)
//   node herramientas/ordenar.mjs --aplicar             mueve todo según la propuesta
//   Opciones:
//     --marca <id>                  otra marca que la activa
//     --video <carpeta-del-video>   audios, imágenes y clips van a las fuentes de ese video
//     --a "<archivo>=<ruta>"        manda un archivo a otra carpeta (relativa a la marca), se puede repetir
//     --solo "<archivo>"            mueve solo ese archivo, se puede repetir
//     --json                        salida en JSON

import { existsSync, readdirSync, mkdirSync, renameSync, appendFileSync, writeFileSync, statSync } from "node:fs";
import { join, extname, basename } from "node:path";
import { BANDEJA, REGISTRO, salir, slug, hoy, rel, marcaActiva, dirMarca } from "./lib/sistema.mjs";

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : undefined; };
const todas = (k) => args.flatMap((a, i) => (a === `--${k}` ? [args[i + 1]] : []));
const marca = opt("marca") || marcaActiva();
const d = dirMarca(marca);
if (!existsSync(d.raiz)) salir(`No existe la marca "${marca}".`);
const video = opt("video");
if (video && !existsSync(join(d.videos, video))) salir(`No existe el video "${video}" en ${rel(d.videos)}.`);
const destinoVideo = video ? join(d.videos, video, "fuentes") : null;
const forzados = Object.fromEntries(todas("a").map((x) => { const i = x.indexOf("="); return [x.slice(0, i), x.slice(i + 1)]; }));
const solo = todas("solo");

const EXT = {
  audio: /^(m4a|mp3|wav|aac|ogg|flac|opus)$/, video: /^(mp4|mov|mkv|webm|avi)$/, imagen: /^(jpg|jpeg|png|webp|heic|gif|bmp|tif|tiff)$/,
  fuente: /^(ttf|otf|woff2?)$/, texto: /^(pdf|docx?|txt|md|rtf|odt|pptx?|xlsx?|csv)$/
};

function clasificar(nombre) {
  const ext = extname(nombre).slice(1).toLowerCase(), n = nombre.toLowerCase();
  if (forzados[nombre]) return ["elegido", join(d.raiz, forzados[nombre])];
  if (EXT.audio.test(ext)) {
    if (/music|musica|cancion|song|bgm/.test(n)) return ["música", join(d.recursos, "musica")];
    return ["audio", destinoVideo || join(d.recursos, "audio")];
  }
  if (EXT.video.test(ext)) return ["video", destinoVideo || d.grabaciones];
  if (EXT.imagen.test(ext)) return ["imagen", /logo/.test(n) ? join(d.estilo, "assets", "logo") : destinoVideo || join(d.recursos, "imagenes")];
  if (ext === "svg") return /logo/.test(n) ? ["logo", join(d.estilo, "assets", "logo")] : ["icono", join(d.recursos, "iconos")];
  if (EXT.fuente.test(ext)) return ["fuente", join(d.estilo, "assets", "fuentes")];
  if (EXT.texto.test(ext)) return ["documento", d.documentos];
  if (ext === "zip") return ["zip", null]; // ¿kit de marca? lo decide la persona
  return ["otro", null];
}

const archivos = existsSync(BANDEJA) ? readdirSync(BANDEJA).filter((f) => !f.startsWith(".") && statSync(join(BANDEJA, f)).isFile()) : [];
// El grabador deja un .json con metadatos junto a cada video: viaja con su video
const videos = new Set(archivos.filter((f) => EXT.video.test(extname(f).slice(1).toLowerCase())).map((f) => basename(f, extname(f))));
const acompanante = (f) => extname(f).toLowerCase() === ".json" && videos.has(basename(f, ".json"));

const usados = new Set();
function nombreLibre(dir, base, ext) {
  let n = `${base}${ext}`, i = 2;
  while (existsSync(join(dir, n)) || usados.has(join(dir, n))) n = `${base}_${i++}${ext}`;
  usados.add(join(dir, n));
  return n;
}

const plan = [];
for (const f of archivos) {
  if (acompanante(f)) continue;
  if (solo.length && !solo.includes(f)) continue;
  const [tipo, dir] = clasificar(f), ext = extname(f).toLowerCase();
  const base = `${hoy()}_${slug(basename(f, extname(f))) || "archivo"}`;
  if (!dir) { plan.push({ archivo: f, tipo, destino: null, motivo: tipo === "zip" ? "¿Es un kit de marca para importar? Pregúntale a la persona." : "No sé dónde va: pregúntale a la persona y usa --a" }); continue; }
  const nuevo = nombreLibre(dir, base, ext);
  const item = { archivo: f, tipo, destino: rel(join(dir, nuevo)), dir, nuevo };
  const meta = basename(f, extname(f)) + ".json";
  if (EXT.video.test(ext.slice(1)) && archivos.includes(meta)) item.meta = { archivo: meta, nuevo: nuevo.replace(/\.[^.]+$/, ".json") };
  plan.push(item);
}

if (args.includes("--json")) { console.log(JSON.stringify(plan.map(({ dir, ...x }) => x), null, 2)); }
else if (!plan.length) console.log("La bandeja está vacía.");
else {
  console.log(`Bandeja: ${plan.length} archivo(s) para la marca ${marca}${video ? ", video " + video : ""}`);
  for (const p of plan) console.log(`  [${p.tipo}] ${p.archivo}\n      -> ${p.destino || "(sin destino) " + p.motivo}${p.meta ? "\n      (+ su " + p.meta.archivo + ")" : ""}`);
}

if (args.includes("--aplicar")) {
  if (!existsSync(REGISTRO)) writeFileSync(REGISTRO, "# Registro de archivos\n\nQué movió el agente desde la bandeja y a dónde. Nada se borra.\n\n| Fecha | Archivo original | Quedó en |\n| --- | --- | --- |\n");
  let movidos = 0;
  for (const p of plan) {
    if (!p.dir) continue;
    mkdirSync(p.dir, { recursive: true });
    renameSync(join(BANDEJA, p.archivo), join(p.dir, p.nuevo));
    appendFileSync(REGISTRO, `| ${hoy()} | ${p.archivo} | ${p.destino} |\n`);
    if (p.meta) { renameSync(join(BANDEJA, p.meta.archivo), join(p.dir, p.meta.nuevo)); appendFileSync(REGISTRO, `| ${hoy()} | ${p.meta.archivo} | ${rel(join(p.dir, p.meta.nuevo))} |\n`); }
    movidos++;
  }
  const quedan = plan.filter((p) => !p.dir).length;
  console.log(`\nMovidos: ${movidos}.${quedan ? ` Quedan ${quedan} en la bandeja esperando que la persona diga dónde van.` : ""} Registro: ${rel(REGISTRO)}`);
}
