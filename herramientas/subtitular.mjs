#!/usr/bin/env node
// Pone subtítulos dinámicos (palabra por palabra, con el color de tu marca) sobre un video grabado.
//
// Uso:
//   node herramientas/subtitular.mjs <video.mp4> [--formato vertical|horizontal] [--nombre "mi video"]
//                                    [--transcripcion <archivo.json>]
//
// - <video.mp4>: el video ya editado y en el formato final (usa antes exportar_formato del editor
//   para llevarlo a 9:16 o 16:9). Puede ser un nombre de editados/ o grabaciones/ de la marca activa, o una ruta.
// - La transcripción: por defecto <video>.transcripcion.json, la que deja la herramienta "transcribir"
//   del editor. También sirve un JSON de whisper con --transcripcion.
//
// Crea mis-videos/marcas/<marca>/videos/AAAA-MM-DD_<nombre>/ con el proyecto listo. Después:
//   cd mis-videos/marcas/<marca>/videos/<carpeta>/proyecto && npx.cmd hyperframes@0.9.30 preview      (mirar y validar)
//   npx.cmd hyperframes@0.9.30 render -q delivery -o ../entregas/<nombre>.mp4
import { existsSync, copyFileSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve, basename, extname } from "node:path";
import { spawnSync } from "node:child_process";
import { RAIZ, BANDEJA, marcaActiva, dirMarca } from "./lib/sistema.mjs";

const dm = dirMarca(marcaActiva());
const args = process.argv.slice(2);
const opt = (k, def) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : def; };
const posicionales = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
const salir = (msg) => { console.error(msg); process.exit(1); };

const entrada = posicionales[0];
if (!entrada) salir('Falta el video. Ej: node herramientas/subtitular.mjs editados/mi-video_9x16.mp4 --formato vertical');
const formato = opt("formato", "vertical");
if (!["vertical", "horizontal"].includes(formato)) salir("--formato debe ser vertical u horizontal");
const [W, H] = formato === "vertical" ? [1080, 1920] : [1920, 1080];

// 1. Encontrar el video
const candidatos = [entrada, join(RAIZ, entrada), join(dm.editados, entrada), join(dm.grabaciones, entrada), join(BANDEJA, entrada)]
  .flatMap((p) => [p, extname(p) ? p : p + ".mp4"]);
const video = candidatos.map((p) => resolve(p)).find(existsSync);
if (!video) salir(`No encuentro el video "${entrada}" (busqué en la ruta, en editados y grabaciones de la marca activa y en la bandeja).`);
const transcripcion = resolve(opt("transcripcion", video.replace(/\.[^.]+$/, ".transcripcion.json")));
if (!existsSync(transcripcion)) {
  salir(`No hay transcripción: ${transcripcion}\nPídele al agente "transcribe ${basename(video)}" (herramienta transcribir del editor) y vuelve a correr esto.`);
}

// 2. Medir el video
const probe = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration", "-of", "json", video], { encoding: "utf8" });
if (probe.status !== 0) salir("ffprobe no pudo leer el video. ¿Está instalado ffmpeg? (Instalar.bat lo instala)");
const info = JSON.parse(probe.stdout);
const dur = Math.round(Number(info.format.duration) * 1000) / 1000;
const { width: vw, height: vh } = info.streams[0];
if (vw !== W || vh !== H) {
  console.log(`Aviso: el video es ${vw}x${vh} y el formato ${formato} es ${W}x${H}. Se va a recortar al centro para llenar el cuadro.`);
  console.log(`       Para elegir cómo (fondo desenfocado, bandas o recorte), pásalo antes por exportar_formato del editor.`);
}

// 3. Carpeta del video (con el estilo de la marca)
const nombre = opt("nombre", basename(video).replace(/\.[^.]+$/, ""));
const nv = spawnSync("node", [join(RAIZ, "herramientas", "nuevo-video.mjs"), nombre, "--formato", formato], { cwd: RAIZ, encoding: "utf8", shell: false });
if (nv.status !== 0) salir("No se pudo crear la carpeta del video:\n" + nv.stdout + nv.stderr);
const rel = (nv.stdout.match(/Listo: (.+)/) || [])[1]?.trim();
if (!rel) salir("No entendí la salida de nuevo-video.mjs:\n" + nv.stdout);
const carpeta = resolve(RAIZ, rel), proyecto = join(carpeta, "proyecto");
for (const d of ["assets/media", "assets/escena", "compositions"]) mkdirSync(join(proyecto, d), { recursive: true });

// 4. Video, voz y tiempos de cada palabra
copyFileSync(video, join(proyecto, "assets", "media", "video.mp4"));
const wav = join(carpeta, "fuentes", "voz.wav");
const ff = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", video, "-vn", "-ac", "1", "-ar", "48000", wav], { encoding: "utf8" });
if (ff.status !== 0) salir("ffmpeg no pudo sacar el audio:\n" + ff.stderr);
const pv = spawnSync("uv", ["run", "--with", "numpy", "python", join(RAIZ, "herramientas", "preparar-voz.py"), transcripcion, wav, "0", join(proyecto, "assets", "escena", "voz.js")],
  { cwd: RAIZ, encoding: "utf8", env: { ...process.env, PYTHONIOENCODING: "utf-8" } });
if (pv.status !== 0) salir("No se pudieron preparar los subtítulos:\n" + pv.stdout + pv.stderr);
console.log(pv.stdout.trim());
copyFileSync(join(RAIZ, "plantillas", "escena", "subtitulos.js"), join(proyecto, "assets", "escena", "subtitulos.js"));

// 5. index.html y la composición de subtítulos desde la plantilla
const llenar = (s) => s.replaceAll("{{W}}", W).replaceAll("{{H}}", H).replaceAll("{{DUR}}", dur).replaceAll("{{FORMATO}}", formato);
writeFileSync(join(proyecto, "index.html"), llenar(readFileSync(join(RAIZ, "plantillas", "video-real", "index.html"), "utf8")));
writeFileSync(join(proyecto, "compositions", "subtitulos.html"), llenar(readFileSync(join(RAIZ, "plantillas", "video-real", "subtitulos.html"), "utf8")));

console.log(`
Listo: ${rel}
  Video:   ${basename(video)} (${dur} s)
  Formato: ${formato} ${W}x${H}

Siguiente:
  cd "${rel}/proyecto" && npx.cmd hyperframes@0.9.30 preview     (mirar y validar)
  npx.cmd hyperframes@0.9.30 render -q delivery -o ../entregas/video.mp4`);
