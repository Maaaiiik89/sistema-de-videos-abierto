// Utilidades del panel: lectura segura de archivos y tablas Markdown, rutas y nombres de archivo.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, extname, basename, sep } from "node:path";
import { RAIZ } from "../../herramientas/lib/sistema.mjs";

export const leer = (f) => { try { return readFileSync(f, "utf8"); } catch { return ""; } };
export const leerJson = (f, def) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return def; } };
export const esDir = (p) => { try { return statSync(p).isDirectory(); } catch { return false; } };
export const esArchivo = (p) => { try { return statSync(p).isFile(); } catch { return false; } };
export const visibles = (d) => { try { return readdirSync(d).filter((f) => !f.startsWith(".")); } catch { return []; } };
export const relRaiz = (p) => p.slice(RAIZ.length + 1).split(sep).join("/");

export function dentroDe(base, p) {
  const r = resolve(p), b = resolve(base);
  return r === b || r.toLowerCase().startsWith(b.toLowerCase() + sep);
}

// Tablas "| a | b |" de un bloque de texto, como filas de celdas (sin encabezado ni separador)
export function filasTabla(lineas) {
  const filas = [];
  for (const l of lineas) {
    const m = l.match(/^\s*\|(.*)\|\s*$/);
    if (!m) continue;
    const c = m[1].split("|").map((s) => s.trim());
    if (c.every((x) => /^:?-{2,}:?$/.test(x) || x === "")) continue;
    filas.push(c);
  }
  return filas;
}
export function porSecciones(texto) {
  const out = [], lineas = texto.split(/\r?\n/);
  let cur = { titulo: "", lineas: [] };
  out.push(cur);
  for (const l of lineas) {
    const h = l.match(/^##\s+(.+?)\s*$/);
    if (h) { cur = { titulo: h[1], lineas: [] }; out.push(cur); } else cur.lineas.push(l);
  }
  return out;
}
export const sinTildes = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export const buscarSeccion = (secc, re) => secc.find((s) => re.test(sinTildes(s.titulo)));

export function nombreSeguro(n) {
  let s = basename(String(n || "").replace(/\\/g, "/")).normalize("NFC").replace(/[\u0000-\u001f<>:"/\\|?*]/g, "_").replace(/^[.\s]+/, "").replace(/[.\s]+$/, "");
  if (s.length > 150) { const e = extname(s).slice(0, 12); s = s.slice(0, 150 - e.length) + e; }
  if (!s) s = "archivo";
  if (/^(con|prn|aux|nul|com\d|lpt\d)(\.|$)/i.test(s)) s = "_" + s;
  return s;
}
export function nombreLibre(dir, nombre) {
  const e = extname(nombre), b = nombre.slice(0, nombre.length - e.length);
  let n = nombre, i = 2;
  while (existsSync(join(dir, n))) n = `${b}_${i++}${e}`;
  return n;
}
