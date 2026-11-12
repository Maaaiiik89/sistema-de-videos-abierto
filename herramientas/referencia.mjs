#!/usr/bin/env node
// Referencias: videos de otras cuentas para estudiar su ritmo y su estructura (módulo "referencias").
//
// Uso:
//   node herramientas/referencia.mjs bajar "<link>" [--marca <id>] [--nota "qué te gusta"]
//   node herramientas/referencia.mjs analizar "<archivo de video>" [--marca <id>] [--nota "..."] [--fuente "<link>"]
//   node herramientas/referencia.mjs lista [--marca <id>]
//
// Cada referencia queda en mis-videos/marcas/<marca>/referencias/<red>-<id>/:
//   video.mp4       el video, solo para estudiarlo (nunca se usa dentro de un video de la marca)
//   referencia.md   de dónde viene, qué le gusta a la persona y el análisis: duración, formato, cortes, ritmo
//   cuadros.jpg     12 cuadros repartidos en el video, en una sola imagen: el agente mira esta imagen,
//                   no el video completo (gasta muchos menos tokens)
//
// "bajar" usa yt-dlp desde su propio entorno (modulos/referencias/entorno): todas las versiones fijas y
// comprobadas con su huella SHA-256 (uv.lock), y Deno sin permisos para el JavaScript de YouTube. La primera
// vez se instala solo (unos 120 MB). SIN iniciar sesión: nunca usa cookies ni cuentas. Solo un video (sin listas), hasta 10 minutos y 500 MB, y solo de las redes de la lista.
// Si la red pide iniciar sesión, explica las otras formas de traer el video (guardarlo desde la app o grabar
// la pantalla) y después se usa "analizar" con ese archivo.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, renameSync, rmSync, copyFileSync, statSync } from "node:fs";
import { join, basename, extname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { RAIZ, salir, slug, hoy, rel, marcaActiva, dirMarca } from "./lib/sistema.mjs";

export const VERSION_YTDLP = "2026.10.26"; // fijada en modulos/referencias/entorno/pyproject.toml y uv.lock
const ENTORNO = join(RAIZ, "modulos", "referencias", "entorno");
const MAX_MIN = 10, MAX_MB = 500, CUADROS = 12;

const REDES = [
  [/(^|\.)tiktok\.com$/, "tiktok", "TikTok"],
  [/(^|\.)instagram\.com$/, "instagram", "Instagram"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "youtube", "YouTube"],
  [/(^|\.)(facebook\.com|fb\.watch)$/, "facebook", "Facebook"],
  [/(^|\.)vimeo\.com$/, "vimeo", "Vimeo"],
  [/(^|\.)(x\.com|twitter\.com)$/, "x", "X"],
  [/(^|\.)linkedin\.com$/, "linkedin", "LinkedIn"],
  [/(^|\.)threads\.(net|com)$/, "threads", "Threads"],
  [/(^|\.)pinterest\.[a-z.]+$/, "pinterest", "Pinterest"]
];

const args = process.argv.slice(2);
const orden = args[0];
const opt = (k) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : undefined; };
const posicional = args.slice(1).find((a, i, arr) => !a.startsWith("--") && !(arr[i - 1] || "").startsWith("--"));

const una = (t) => String(t ?? "").replace(/[\r\n]+/g, " ").replace(/\|/g, "/").trim();
const num = (n, d = 1) => Number(n).toFixed(d).replace(".", ",");

function correr(cmd, a, extra = {}) {
  const r = spawnSync(cmd, a, { encoding: "utf8", windowsHide: true, maxBuffer: 64 * 1024 * 1024, ...extra });
  if (r.error && r.error.code === "ENOENT") salir(`No encuentro ${cmd}. Abre Instalar.bat para que lo instale.`);
  return r;
}

function carpetaLibre(dir, nombre) {
  let n = nombre, i = 2;
  while (existsSync(join(dir, n))) n = `${nombre}-${i++}`;
  return join(dir, n);
}

function dirReferencias() {
  const marca = opt("marca") || marcaActiva();
  const d = dirMarca(marca);
  if (!existsSync(d.raiz)) salir(`No existe la marca "${marca}".`);
  mkdirSync(d.referencias, { recursive: true });
  return d.referencias;
}

// ------------------------------------------------------------------ bajar
function bajar(link) {
  let url;
  try { url = new URL(String(link || "").trim()); } catch { salir('Falta el link o no es válido. Ej: node herramientas/referencia.mjs bajar "https://www.tiktok.com/@cuenta/video/123"'); }
  if (url.protocol !== "https:" || url.username || url.password) salir("El link debe empezar con https:// y no llevar usuario ni clave.");
  const red = REDES.find(([re]) => re.test(url.hostname.toLowerCase()));
  if (!red) salir(`No bajo videos de ${url.hostname}. Redes que sirven: ${REDES.map((r) => r[2]).join(", ")}.`);

  const refs = dirReferencias();
  const tmp = join(refs, ".bajando-" + randomBytes(4).toString("hex"));
  mkdirSync(tmp);
  if (!existsSync(join(ENTORNO, "uv.lock"))) salir("Falta modulos/referencias/entorno/uv.lock. Abre Instalar.bat para reparar el sistema.");
  if (!existsSync(join(ENTORNO, ".venv"))) console.log("La primera vez se instala yt-dlp con sus versiones fijas (unos 120 MB). Tarda un par de minutos.");
  console.log(`Bajando de ${red[2]} (yt-dlp ${VERSION_YTDLP}, sin iniciar sesión)...`);
  // --locked: instala exactamente lo de uv.lock, comprobando cada huella; si no coincide, no corre.
  // --js-runtimes deno: el JavaScript de YouTube corre en Deno sin permisos (nunca en Node).
  const r = correr("uv", [
    "run", "--project", ENTORNO, "--locked", "--python", "3.12", "--quiet", "yt-dlp",
    "--ignore-config", "--no-playlist", "--no-cookies", "--no-cookies-from-browser", "--js-runtimes", "deno",
    "--max-filesize", `${MAX_MB}M`, "--match-filter", `duration<=${MAX_MIN * 60} & !is_live`,
    "-f", "bv*[height<=1080]+ba/b[height<=1080]/b", "--merge-output-format", "mp4",
    "--write-info-json", "--no-write-comments", "--no-mtime", "--no-progress",
    "-o", join(tmp, "video.%(ext)s"), "--", url.href
  ], { timeout: 15 * 60 * 1000 });

  const video = readdirSync(tmp).find((f) => /^video\.(mp4|webm|mkv|mov)$/i.test(f));
  const salida = `${r.stdout || ""}\n${r.stderr || ""}`;
  if (r.status !== 0 || !video) {
    rmSync(tmp, { recursive: true, force: true });
    if (/sign in|log ?in|cookies|not a bot|rate.?limit|private|registered users|requested content is not available/i.test(salida)) {
      salir([
        `${red[2]} no deja bajar este video sin iniciar sesión (pasa seguido con Instagram y YouTube, sobre todo si tu proveedor de internet comparte tu dirección con otros clientes).`,
        "El sistema no usa tus cuentas para bajar videos. Otras formas de traerlo:",
        "  1. Guárdalo desde la app de la red, si tiene la opción (Guardar video o Descargar), y súbelo en el panel.",
        "  2. Ponlo en pantalla completa y grábalo con Grabador.bat (o Win+Alt+R), y súbelo en el panel.",
        `Después: node herramientas/referencia.mjs analizar "<archivo>" --fuente "${url.href}"`
      ].join("\n"));
    }
    if (/does not pass filter|is_live|duration/i.test(salida) || (r.status === 0 && !video)) salir(`El video dura más de ${MAX_MIN} minutos o es una transmisión en vivo: como referencia sirve un tramo corto. Graba la parte que te gusta con Grabador.bat y analízala.`);
    if (/larger than max-filesize|File is larger/i.test(salida)) salir(`El video pesa más de ${MAX_MB} MB. Graba la parte que te gusta con Grabador.bat y analízala.`);
    if (/lockfile|uv\.lock|hash mismatch|Hash mismatch/i.test(salida)) salir("La instalación de yt-dlp no coincide con las versiones fijas del sistema (uv.lock), así que no se usó. Abre Instalar.bat para reparar, y si sigue, avisa en el repositorio.");
    const ultima = salida.split(/\r?\n/).filter((l) => /ERROR/.test(l)).pop() || salida.trim().split(/\r?\n/).pop();
    salir(`No pude bajarlo: ${ultima}`);
  }

  let info = {};
  const archInfo = readdirSync(tmp).find((f) => f.endsWith(".info.json"));
  if (archInfo) { try { info = JSON.parse(readFileSync(join(tmp, archInfo), "utf8")); } catch { info = {}; } rmSync(join(tmp, archInfo), { force: true }); }
  const destino = carpetaLibre(refs, `${red[1]}-${slug(String(info.id || hoy())).slice(0, 40) || "video"}`);
  renameSync(tmp, destino);
  if (!video.endsWith(".mp4")) renameSync(join(destino, video), join(destino, "video" + extname(video)));
  const archVideo = join(destino, readdirSync(destino).find((f) => f.startsWith("video.")));

  const cuenta = String(info.uploader_id || "").startsWith("@") ? info.uploader_id : (info.uploader || info.channel || "");
  escribirFicha(destino, {
    titulo: info.title || info.description || `${red[2]} ${info.id || ""}`,
    fuente: info.webpage_url || url.href, red: red[2],
    cuenta: cuenta ? (String(cuenta).startsWith("@") ? cuenta : "@" + cuenta) : "",
    publicado: /^\d{8}$/.test(info.upload_date || "") ? `${info.upload_date.slice(0, 4)}-${info.upload_date.slice(4, 6)}-${info.upload_date.slice(6)}` : "",
    nota: opt("nota") || ""
  });
  analizar(archVideo, destino);
  console.log(`Listo: ${rel(destino)}`);
}

// ------------------------------------------------------------------ ficha
function escribirFicha(dir, d) {
  const filas = [
    ["Fuente", d.fuente || "archivo de la persona"],
    ["Red", d.red || ""], ["Cuenta", d.cuenta || ""], ["Publicado", d.publicado || ""],
    ["Agregada", hoy()], ["Qué le gusta a la persona", d.nota || "(preguntar)"]
  ].filter(([, v]) => v !== "");
  writeFileSync(join(dir, "referencia.md"), [
    `# Referencia: ${una(d.titulo).slice(0, 90) || "sin título"}`, "",
    "| Dato | Valor |", "| --- | --- |", ...filas.map(([k, v]) => `| ${k} | ${una(v)} |`), "",
    "**Uso:** solo para estudiar su ritmo, su estructura y cómo presenta las cosas. Nunca se usan su contenido, su música, sus imágenes ni su marca en un video.", "",
    "## Análisis automático", "", "(pendiente)", "",
    "## Lo que se toma de esta referencia", "",
    "(Lo completa el agente con la persona: gancho de los primeros segundos, ritmo de cortes, cómo entran los títulos, subtítulos, paleta, cierre.)", ""
  ].join("\n"));
}

// ------------------------------------------------------------------ analizar
function analizar(archivo, dirDestino) {
  const f = resolve(archivo);
  if (!existsSync(f) || !statSync(f).isFile()) salir(`No encuentro el archivo ${archivo}`);
  let dir = dirDestino;
  if (!dir) {
    const refs = dirReferencias();
    if (resolve(f).startsWith(resolve(refs) + (process.platform === "win32" ? "\\" : "/"))) dir = resolve(f, "..");
    else {
      dir = carpetaLibre(refs, "archivo-" + (slug(basename(f, extname(f))).slice(0, 40) || "video"));
      mkdirSync(dir);
      copyFileSync(f, join(dir, "video" + extname(f).toLowerCase()));
      console.log(`Copié el archivo a ${rel(dir)} (el original queda donde estaba).`);
    }
    if (!existsSync(join(dir, "referencia.md"))) {
      const fuente = opt("fuente");
      const red = (() => { try { const h = new URL(fuente).hostname; return (REDES.find(([re]) => re.test(h)) || [])[2] || ""; } catch { return ""; } })();
      escribirFicha(dir, { titulo: basename(f, extname(f)), fuente, red, nota: opt("nota") || "" });
    }
  }
  const video = existsSync(join(dir, readdirSync(dir).find((x) => x.startsWith("video.")) || "-")) ? join(dir, readdirSync(dir).find((x) => x.startsWith("video."))) : f;

  const p = correr("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_type,width,height", "-of", "json", video]);
  let datos = {};
  try { datos = JSON.parse(p.stdout); } catch { salir("No pude leer el video (¿está completo?)."); }
  const dur = Number(datos.format?.duration || 0);
  const v = (datos.streams || []).find((s) => s.codec_type === "video");
  const tieneAudio = (datos.streams || []).some((s) => s.codec_type === "audio");
  if (!v || !dur) salir("El archivo no tiene video o no pude leer su duración.");
  const w = v.width, h = v.height, ratio = w / h;
  const formato = Math.abs(ratio - 9 / 16) < 0.05 ? "vertical 9:16" : Math.abs(ratio - 4 / 5) < 0.04 ? "vertical 4:5" : Math.abs(ratio - 1) < 0.04 ? "cuadrado 1:1" : Math.abs(ratio - 16 / 9) < 0.05 ? "horizontal 16:9" : ratio < 1 ? "vertical" : "horizontal";

  // Cortes: cambios de escena grandes (ffmpeg, filtro scene)
  const c = correr("ffmpeg", ["-hide_banner", "-nostats", "-i", video, "-an", "-sn", "-vf", "scale=320:-2,select='gt(scene\\,0.3)',showinfo", "-f", "null", "-"], { timeout: 10 * 60 * 1000 });
  const cortes = [...String(c.stderr || "").matchAll(/pts_time:\s*([\d.]+)/g)].map((m) => Number(m[1])).filter((t) => t > 0.2 && t < dur - 0.2);
  const planos = cortes.length + 1;

  // Hoja de cuadros: 12 cuadros repartidos, 4x3
  const ancho = ratio < 1 ? 240 : 360;
  const tiempos = Array.from({ length: CUADROS }, (_, i) => (dur * (i + 0.5)) / CUADROS);
  const hoja = join(dir, "cuadros.jpg");
  const k = correr("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", video, "-vf", `fps=${CUADROS}/${dur.toFixed(3)},scale=${ancho}:-2,tile=4x3:padding=6:color=white`, "-frames:v", "1", "-q:v", "4", hoja], { timeout: 10 * 60 * 1000 });
  const hayHoja = k.status === 0 && existsSync(hoja);

  const analisis = [
    "| Dato | Valor |", "| --- | --- |",
    `| Duración | ${num(dur)} s |`,
    `| Formato | ${formato} (${w}x${h}) |`,
    `| Audio | ${tieneAudio ? "sí" : "no"} |`,
    `| Cortes | ${cortes.length} (un plano cada ${num(dur / planos)} s en promedio) |`,
    `| Primeros 3 segundos | ${cortes.filter((t) => t < 3).length} cortes |`,
    "",
    cortes.length ? `Momentos de corte (s): ${cortes.map((t) => num(t)).join(" · ")}` : "Sin cortes de escena marcados: es un plano continuo o los cambios son suaves (movimiento, texto que entra).",
    "",
    hayHoja ? `Cuadros (\`cuadros.jpg\`, de izquierda a derecha y de arriba abajo), en segundos: ${tiempos.map((t) => num(t)).join(" · ")}` : "No pude armar la hoja de cuadros.",
    "",
    tieneAudio ? "Para saber qué dice: transcríbelo con el editor de video (`transcribir`) solo si hace falta para entender su estructura." : ""
  ].filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n");

  const md = join(dir, "referencia.md");
  const texto = readFileSync(md, "utf8");
  writeFileSync(md, texto.replace(/## Análisis automático\n[\s\S]*?(?=\n## |\s*$)/, `## Análisis automático\n\n${analisis.trim()}\n`));
  console.log(`Análisis: ${num(dur)} s, ${formato}, ${cortes.length} cortes${hayHoja ? ", cuadros.jpg" : ""}. Ver ${rel(md)}`);
}

// ------------------------------------------------------------------ lista
function lista() {
  const refs = dirReferencias();
  const dirs = readdirSync(refs, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith(".") && existsSync(join(refs, d.name, "referencia.md")));
  if (!dirs.length) return console.log("Esta marca no tiene referencias todavía.");
  for (const d of dirs) {
    const t = readFileSync(join(refs, d.name, "referencia.md"), "utf8");
    const titulo = (t.match(/^# Referencia: (.*)$/m) || [])[1] || d.name;
    const nota = (t.match(/^\| Qué le gusta a la persona \| (.*) \|$/m) || [])[1] || "";
    console.log(`- ${d.name}: ${titulo}${nota ? ` (le gusta: ${nota})` : ""}`);
  }
}

if (orden === "bajar") bajar(posicional);
else if (orden === "analizar") { if (!posicional) salir('Falta el archivo. Ej: node herramientas/referencia.mjs analizar "mis-videos/bandeja/grabacion.mp4"'); analizar(posicional); }
else if (orden === "lista") lista();
else salir("Órdenes: bajar \"<link>\" | analizar \"<archivo>\" | lista   (opciones: --marca <id>, --nota \"...\", --fuente \"<link>\")");
