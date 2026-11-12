// Rutas y configuración comunes a todas las herramientas.
//
// La carpeta del sistema tiene dos partes:
//   - el sistema (herramientas, plantillas, módulos, skills...): Actualizar lo reemplaza;
//   - mis-videos/: todo lo de la persona (marcas, videos, grabaciones, bandeja). Actualizar NUNCA lo toca.
//
// mis-videos/config.json guarda la marca activa y qué módulos están encendidos.

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const DATOS = join(RAIZ, "mis-videos");
export const MARCAS = join(DATOS, "marcas");
export const BANDEJA = join(DATOS, "bandeja");
export const REGISTRO = join(DATOS, "registro-de-archivos.md");
export const CONFIG = join(DATOS, "config.json");
export const MODULOS = join(RAIZ, "modulos");

export function salir(msg) { console.error(msg); process.exit(1); }

export function slug(texto) {
  return String(texto).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
}

export function hoy() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function rel(ruta) { return ruta.replace(RAIZ + "\\", "").replace(RAIZ + "/", "").replace(/\\/g, "/"); }

export function leerConfig() {
  let c = {};
  if (existsSync(CONFIG)) {
    try { c = JSON.parse(readFileSync(CONFIG, "utf8")); } catch { salir(`No pude leer ${rel(CONFIG)}: el archivo está dañado. Revisa que sea JSON válido.`); }
  }
  return { marcaActiva: null, modulos: {}, ...c };
}

export function guardarConfig(c) {
  mkdirSync(DATOS, { recursive: true });
  writeFileSync(CONFIG, JSON.stringify(c, null, 2) + "\n");
}

export function listaMarcas() {
  if (!existsSync(MARCAS)) return [];
  return readdirSync(MARCAS, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(MARCAS, d.name, "ficha.md")))
    .map((d) => d.name);
}

// Marca activa: la de config.json; si no hay y existe una sola marca, esa.
export function marcaActiva({ obligatoria = true } = {}) {
  const c = leerConfig(), hay = listaMarcas();
  let id = c.marcaActiva && hay.includes(c.marcaActiva) ? c.marcaActiva : hay.length === 1 ? hay[0] : null;
  if (!id && obligatoria) {
    salir(hay.length
      ? `Hay varias marcas y ninguna activa. Elige una: node herramientas/marcas.mjs activar <id>  (marcas: ${hay.join(", ")})`
      : 'Todavía no hay ninguna marca. Crea la primera con la skill "empezar" o: node herramientas/marcas.mjs nueva "<nombre>"');
  }
  return id;
}

export function dirMarca(id) {
  const d = join(MARCAS, id);
  return {
    raiz: d, ficha: join(d, "ficha.md"), estilo: join(d, "estilo"), personaje: join(d, "personaje"),
    recursos: join(d, "recursos"), tematicas: join(d, "tematicas"), grabaciones: join(d, "grabaciones"),
    editados: join(d, "editados"), videos: join(d, "videos"), plan: join(d, "plan"), documentos: join(d, "documentos"),
    referencias: join(d, "referencias")
  };
}

// Texto seguro para una celda de tabla Markdown: una sola línea, sin "|"
export function celda(v, max = 400) {
  return String(v ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\|/g, "/").replace(/\s+/g, " ").trim().slice(0, max);
}

// Escribe el valor de una fila "| Campo | Valor |" de la ficha. Si la fila no existe, la agrega a la
// sección indicada (la crea al final si tampoco existe). Devuelve true si cambió algo.
export function ponerCampoFicha(id, campo, valor, seccion = "Contexto (opcional)") {
  const f = dirMarca(id).ficha;
  if (!existsSync(f)) return false;
  let t = readFileSync(f, "utf8");
  const v = celda(valor);
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp("^(\\|\\s*" + esc(campo) + "\\s*\\|)(.*)\\|\\s*$", "im");
  if (re.test(t)) t = t.replace(re, (_, a) => `${a} ${v} |`);
  else {
    const fila = `| ${celda(campo, 80)} | ${v} |`;
    const m = new RegExp("^##\\s+" + esc(seccion) + "\\s*$", "im").exec(t);
    if (m) {
      // al final de la tabla de esa sección
      const desde = m.index + m[0].length, resto = t.slice(desde), sig = resto.search(/^##\s/m), bloque = sig >= 0 ? resto.slice(0, sig) : resto;
      const ult = bloque.lastIndexOf("\n|");
      const finFila = ult >= 0 ? bloque.indexOf("\n", ult + 1) : -1;
      const corte = ult < 0 ? desde : finFila < 0 ? desde + bloque.length : desde + finFila;
      t = t.slice(0, corte) + "\n" + fila + t.slice(corte);
    } else t = t.replace(/\s*$/, "") + `\n\n## ${seccion}\n\n| Campo | Valor |\n| --- | --- |\n${fila}\n`;
  }
  writeFileSync(f, t);
  return true;
}

// Lee una fila "| Campo | Valor |" de la ficha de la marca
export function campoFicha(id, campo) {
  const f = dirMarca(id).ficha;
  if (!existsSync(f)) return "";
  const re = new RegExp("^\\|\\s*" + campo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[^|]*\\|(.*)\\|\\s*$", "im");
  const m = readFileSync(f, "utf8").match(re);
  return m ? m[1].trim() : "";
}
