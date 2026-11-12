// Arma la versión horizontal (16:9, YouTube) de un video a partir de su proyecto vertical.
//
// Uso: node herramientas/formato-16x9.mjs "videos/<carpeta-del-video>"
//
// Copia <video>/proyecto a <video>/proyecto-16x9 y cambia solo lo que depende del formato:
// tamaño del video (1920x1080), círculo de la cámara y window.__FORMATO = "horizontal".
// Las escenas leen ese formato y se adaptan solas (lienzo, subtítulos, pantalla dividida).
// Volver a correrlo después de cada cambio en el vertical: la copia se reemplaza entera.
import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
if (!dir) { console.error('Uso: node herramientas/formato-16x9.mjs "videos/<carpeta-del-video>"'); process.exit(1); }
const src = path.resolve(dir, "proyecto"), dst = path.resolve(dir, "proyecto-16x9");
if (!fs.existsSync(path.join(src, "index.html"))) { console.error("No encuentro " + path.join(src, "index.html")); process.exit(1); }

const OMITIR = new Set([".hyperframes", "renders", "node_modules", ".media"]);
fs.rmSync(dst, { recursive: true, force: true });
fs.cpSync(src, dst, { recursive: true, filter: (p) => !OMITIR.has(path.basename(p)) || path.dirname(p) !== src });

const girar = (s) => s
  .replace(/data-width="1080"(\s+)data-height="1920"/g, 'data-width="1920"$1data-height="1080"')
  .replace(/(<canvas[^>]*?)width="1080"(\s+)height="1920"/g, '$1width="1920"$2height="1080"');

let idx = fs.readFileSync(path.join(dst, "index.html"), "utf8");
const antes = idx;
idx = girar(idx)
  .replace('window.__FORMATO = "vertical"', 'window.__FORMATO = "horizontal"')
  .replace('content="width=1080, height=1920"', 'content="width=1920, height=1080"')
  .replace(/html, body \{ width: 1080px; height: 1920px;/, "html, body { width: 1920px; height: 1080px;")
  // círculo de la cámara: arriba a la derecha dentro de la zona segura horizontal
  .replace(/(\.cam \{[^}]*?)left: \d+px; top: \d+px; width: \d+px; height: \d+px;/, "$1left: 1530px; top: 96px; width: 270px; height: 270px;");
if (!idx.includes('window.__FORMATO = "horizontal"')) { console.error('index.html no declara window.__FORMATO = "vertical"'); process.exit(1); }
fs.writeFileSync(path.join(dst, "index.html"), idx);

for (const f of fs.readdirSync(path.join(dst, "compositions"))) {
  if (!f.endsWith(".html")) continue;
  const p = path.join(dst, "compositions", f);
  fs.writeFileSync(p, girar(fs.readFileSync(p, "utf8")));
}
console.log("Listo: " + dst + (idx === antes ? " (sin cambios en index?)" : ""));
console.log('Siguiente: cd "' + dst + '" && npx.cmd hyperframes@0.9.30 check && npx.cmd hyperframes@0.9.30 render -q delivery');
