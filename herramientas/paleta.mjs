#!/usr/bin/env node
// Paletas con contraste probado. Cada paleta tiene 5 colores (fondo, fondo2, texto, acento, acento2)
// y pasa 4 pruebas (WCAG): texto sobre fondo >= 4,5:1; acento y acento 2 sobre fondo >= 3:1;
// palabra marcada de los subtítulos (blanco o negro sobre el acento) >= 3:1.
//
// Uso:
//   node herramientas/paleta.mjs probadas                         paletas probadas por tipo de negocio
//   node herramientas/paleta.mjs generar --base "#F2A93B" [--armonia complementaria|analoga|triadica|dividida] [--fondo oscuro|claro]
//   node herramientas/paleta.mjs verificar --fondo "#..." --fondo2 "#..." --texto "#..." --acento "#..." --acento2 "#..."
//   node herramientas/paleta.mjs verificar --marca <id>            verifica la paleta de estilo.css de una marca
//   node herramientas/paleta.mjs aplicar --marca <id> --fondo ... (los 5 colores)   escribe la paleta en estilo.css
//   node herramientas/paleta.mjs proponer --marca <id> --nombre "<nombre>" [--para "<para qué>"] --fondo ... (los 5 colores)
//        guarda una propuesta en estilo/paletas-propuestas.json para que la persona la vea en el panel (Verificar > Marca)
//   node herramientas/paleta.mjs proponer --marca <id> --limpiar    borra las propuestas anteriores (antes de una tanda nueva)
//   Agregar --json para la salida en JSON.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { salir, hoy, dirMarca, marcaActiva } from "./lib/sistema.mjs";

export function rgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export function lum(hex) { const c = rgb(hex).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
export function ratio(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
export function tinta(hex) { return 1.05 / (lum(hex) + 0.05) >= 3 ? "#FFFFFF" : "#111111"; } // igual que plantillas/escena/subtitulos.js
function aHsl(hex) {
  const c = rgb(hex).map((v) => v / 255), mx = Math.max(...c), mn = Math.min(...c), l = (mx + mn) / 2, d = mx - mn;
  let h = 0, s = 0;
  if (d) { s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === c[0] ? (c[1] - c[2]) / d + (c[1] < c[2] ? 6 : 0) : mx === c[1] ? (c[2] - c[0]) / d + 2 : (c[0] - c[1]) / d + 4; h *= 60; }
  return { h, s, l };
}
function deHsl(h, s, l) {
  h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return "#" + [f(0), f(8), f(4)].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
}
function conContraste(hex, fondo, min) {
  const c = aHsl(hex), oscuro = lum(fondo) < 0.25; let out = hex;
  for (let i = 0; i < 60 && ratio(out, fondo) < min; i++) { c.l += oscuro ? 0.015 : -0.015; out = deHsl(c.h, c.s, c.l); }
  return out;
}
export function pruebas(p) {
  return [
    { prueba: "texto sobre fondo", ratio: ratio(p.texto, p.fondo), minimo: 4.5 },
    { prueba: "acento sobre fondo", ratio: ratio(p.acento, p.fondo), minimo: 3 },
    { prueba: "palabra marcada en subtítulos", ratio: ratio(tinta(p.acento), p.acento), minimo: 3 },
    { prueba: "acento 2 sobre fondo", ratio: ratio(p.acento2, p.fondo), minimo: 3 }
  ].map((x) => ({ ...x, ratio: Math.round(x.ratio * 10) / 10, pasa: x.ratio >= x.minimo }));
}
const ARMONIAS = { complementaria: 180, analoga: 32, triadica: 120, dividida: 150 };
export function generar(base, armonia = "complementaria", oscuro = true) {
  const b = aHsl(base), giro = ARMONIAS[armonia];
  if (giro === undefined) salir(`Armonía desconocida: ${armonia}. Usa: ${Object.keys(ARMONIAS).join(", ")}`);
  return [[0.78, 0.55], [0.6, 0.5], [0.88, 0.62]].map((v, i) => {
    const fondo = oscuro ? deHsl(b.h, Math.min(b.s, 0.35), 0.11) : deHsl(b.h, Math.min(b.s, 0.3), 0.97);
    return {
      nombre: `${armonia} ${i + 1}`, fondo,
      fondo2: oscuro ? deHsl(b.h, Math.min(b.s, 0.3), 0.17) : deHsl(b.h, Math.min(b.s, 0.3), 0.91),
      texto: oscuro ? deHsl(b.h, 0.3, 0.95) : deHsl(b.h, 0.4, 0.13),
      acento: conContraste(deHsl(b.h, Math.max(b.s, v[0]), v[1]), fondo, 3),
      acento2: conContraste(deHsl(b.h + giro * (i === 2 ? -1 : 1), v[0] - 0.08, v[1]), fondo, 3)
    };
  });
}
export const PROBADAS = [
  { nombre: "Horno cálido", para: "Panaderías, cafés, comida", fondo: "#2B1D14", fondo2: "#3A2A1E", texto: "#FFF6EA", acento: "#F2A93B", acento2: "#8CC4F2" },
  { nombre: "Confianza", para: "Servicios, contabilidad, salud", fondo: "#0F2233", fondo2: "#183247", texto: "#F2F6FA", acento: "#3FB6A8", acento2: "#F5B841" },
  { nombre: "Fresco claro", para: "Tecnología, educación", fondo: "#F7F9FC", fondo2: "#E8EEF8", texto: "#14213D", acento: "#2563EB", acento2: "#C2410C" },
  { nombre: "Natural", para: "Plantas, orgánico, bienestar", fondo: "#F4F7F1", fondo2: "#E4ECDF", texto: "#1F2A1C", acento: "#2F7D32", acento2: "#B4532A" },
  { nombre: "Elegante", para: "Joyería, moda, diseño", fondo: "#141414", fondo2: "#222222", texto: "#F5F1E8", acento: "#C9A45C", acento2: "#8FA3C0" },
  { nombre: "Energía", para: "Deporte, eventos, juvenil", fondo: "#1B1035", fondo2: "#2A1A4D", texto: "#FFFFFF", acento: "#FF4D8D", acento2: "#2DE2C4" },
  { nombre: "Miga clara", para: "Panaderías, repostería, hogar", fondo: "#FBF6EE", fondo2: "#F1E6D3", texto: "#2B1D14", acento: "#B4532A", acento2: "#2F6F9F" }
];

// estilo.css de la marca <-> paleta
const VARS = { fondo: "--ground", fondo2: "--ground-2", texto: "--paper", acento: "--accent", acento2: "--accent-2" };
function leerPaletaMarca(id) {
  const css = join(dirMarca(id).estilo, "assets", "estilo.css");
  if (!existsSync(css)) salir(`No encuentro ${css}`);
  const t = readFileSync(css, "utf8"), p = {};
  for (const [k, v] of Object.entries(VARS)) { const m = t.match(new RegExp(v + "\\s*:\\s*(#[0-9a-fA-F]{6})")); if (m) p[k] = m[1].toUpperCase(); }
  if (!p.acento2) p.acento2 = p.acento;
  return { css, texto: t, p };
}

const esPrincipal = process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("herramientas/paleta.mjs");
if (esPrincipal) {
  const args = process.argv.slice(2), orden = args[0], json = args.includes("--json");
  const opt = (k) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : undefined; };
  const hex = (k) => { const v = opt(k); if (!/^#[0-9a-fA-F]{6}$/.test(v || "")) salir(`--${k} debe ser un color #RRGGBB`); return v.toUpperCase(); };
  const mostrar = (lista) => {
    if (json) { console.log(JSON.stringify(lista.map((p) => ({ ...p, pruebas: pruebas(p), pasaTodo: pruebas(p).every((x) => x.pasa) })), null, 2)); return; }
    for (const p of lista) {
      const pr = pruebas(p), ok = pr.every((x) => x.pasa);
      console.log(`${p.nombre}${p.para ? "  (" + p.para + ")" : ""}  ${ok ? "PASA 4 de 4" : "NO PASA"}`);
      console.log(`  fondo ${p.fondo}  fondo2 ${p.fondo2}  texto ${p.texto}  acento ${p.acento}  acento2 ${p.acento2}`);
      console.log("  " + pr.map((x) => `${x.prueba} ${x.ratio}:1${x.pasa ? "" : " (mínimo " + x.minimo + ")"}`).join(" · "));
    }
  };
  if (orden === "probadas") mostrar(PROBADAS);
  else if (orden === "generar") mostrar(generar(hex("base"), opt("armonia") || "complementaria", (opt("fondo") || "oscuro") !== "claro"));
  else if (orden === "verificar") {
    if (opt("marca") || !opt("fondo")) { const id = opt("marca") || marcaActiva(); mostrar([{ nombre: `Paleta de ${id}`, ...leerPaletaMarca(id).p }]); }
    else mostrar([{ nombre: "Paleta", fondo: hex("fondo"), fondo2: hex("fondo2"), texto: hex("texto"), acento: hex("acento"), acento2: hex("acento2") }]);
  } else if (orden === "aplicar") {
    const id = opt("marca") || marcaActiva(), p = { fondo: hex("fondo"), fondo2: hex("fondo2"), texto: hex("texto"), acento: hex("acento"), acento2: hex("acento2") };
    const pr = pruebas(p);
    if (!pr.every((x) => x.pasa) && !args.includes("--forzar")) { mostrar([{ nombre: "Paleta propuesta", ...p }]); salir("No se aplica: no pasa todas las pruebas. Ajusta los colores o agrega --forzar si la persona lo decidió así."); }
    let { css, texto } = leerPaletaMarca(id);
    for (const [k, v] of Object.entries(VARS)) {
      const re = new RegExp("(" + v + "\\s*:\\s*)#[0-9a-fA-F]{6}");
      texto = re.test(texto) ? texto.replace(re, "$1" + p[k]) : texto.replace(/:root\s*\{/, `:root {\n  ${v}: ${p[k]};`);
    }
    // El texto en color de acento (enlaces, etiquetas) sigue al acento
    texto = texto.replace(/(--accent-text\s*:\s*)#[0-9a-fA-F]{6}/, "$1" + p.acento);
    writeFileSync(css, texto);
    console.log(`Paleta aplicada en ${css.replace(/\\/g, "/")}. Los videos nuevos la usan; los ya hechos no cambian.`);
  } else if (orden === "proponer") {
    const id = opt("marca") || marcaActiva(), d = dirMarca(id);
    if (!existsSync(d.estilo)) salir(`No existe la marca "${id}".`);
    const archivo = join(d.estilo, "paletas-propuestas.json");
    if (args.includes("--limpiar")) { writeFileSync(archivo, "[]\n"); console.log("Propuestas anteriores borradas."); }
    else {
      const p = { nombre: opt("nombre") || "Propuesta", para: opt("para") || "", fecha: hoy(), fondo: hex("fondo"), fondo2: hex("fondo2"), texto: hex("texto"), acento: hex("acento"), acento2: hex("acento2") };
      let lista = [];
      try { lista = JSON.parse(readFileSync(archivo, "utf8")); if (!Array.isArray(lista)) lista = []; } catch { }
      lista = lista.filter((x) => x.nombre !== p.nombre).concat([p]).slice(-9);
      writeFileSync(archivo, JSON.stringify(lista, null, 2) + "\n");
      mostrar([p]);
      console.log(`Guardada para el panel (Verificar > Marca): ${lista.length} propuesta(s). No cambia los colores de la marca: eso lo hace "aplicar".`);
    }
  } else salir("Órdenes: probadas, generar, verificar, aplicar, proponer. Ver el encabezado del archivo.");
}
