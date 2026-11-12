#!/usr/bin/env node
// Revisa la carpeta de un video contra las reglas de texto y de marca.
// Uso: node herramientas/revisar-texto.mjs videos/<carpeta-del-video> [--max-palabras 12]
// Sale con código 1 si encuentra fuentes que no están en el DESIGN.md del video, o guiones largos
// cuando el estilo los prohíbe (en DESIGN.md: "sin-guion-largo: true").

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, extname, relative } from "node:path";

const args = process.argv.slice(2);
const root = args.find((a) => !a.startsWith("--")) ?? ".";
const maxIdx = args.indexOf("--max-palabras");
const MAX = maxIdx >= 0 ? Number(args[maxIdx + 1]) : 12;

const EXT = new Set([".html", ".htm", ".txt", ".md", ".srt", ".vtt", ".json", ".js", ".css"]);
// fuentes/ es material crudo (transcripciones, capturas): no es texto nuestro
const SKIP_DIRS = new Set(["node_modules", ".git", "renders", "fonts", ".hyperframes", "snapshots", "fuentes"]);
const SKIP_FILES = new Set(["DESIGN.md", "design.md", "package-lock.json", "REVIEW.md", "SPEC.md"]);
const GENERICAS = ["arial", "helvetica", "georgia", "consolas", "monospace", "sans-serif", "serif", "inherit"];

// Las fuentes permitidas salen del DESIGN.md del video (proyecto/DESIGN.md o DESIGN.md)
const design = [join(root, "proyecto", "DESIGN.md"), join(root, "DESIGN.md")].find(existsSync);
const familias = design
  ? [...readFileSync(design, "utf8").matchAll(/family:\s*["']?([^"'\n]+?)["']?\s*$/gm)].map((m) => m[1].trim().toLowerCase())
  : ["outfit", "inter", "jetbrains mono"];
const FUENTES_OK = [...familias, ...GENERICAS];
const SIN_GUION_LARGO = design ? /sin-guion-largo:\s*true/.test(readFileSync(design, "utf8")) : true;
console.log(`Fuentes permitidas (${design ? relative(root, design) : "por defecto"}): ${familias.join(", ")}\n`);
const FRASES_GASTADAS = ["siguiente nivel", "potencia tu", "potenciar", "descubre", "increíble", "revolucionari", "en el mundo actual", "sin precedentes", "game changer"];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) { if (!SKIP_DIRS.has(name)) yield* walk(p); }
    else if (EXT.has(extname(name).toLowerCase()) && !SKIP_FILES.has(name)) {
      // De los .md solo se revisan los textos propios del video (guion, post, copy)
      if (extname(name).toLowerCase() === ".md" && !/guion|script|post|copy|texto/i.test(name)) continue;
      yield p;
    }
  }
}

function textoVisible(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z]+;/g, " ");
}

let errores = 0, avisos = 0;
const out = (tipo, archivo, linea, msg) => {
  console.log(`${tipo === "error" ? "ERROR" : "aviso"}  ${relative(root, archivo)}${linea ? ":" + linea : ""}  ${msg}`);
  tipo === "error" ? errores++ : avisos++;
};

for (const f of walk(root)) {
  const raw = readFileSync(f, "utf8");
  const lineas = raw.split(/\r?\n/);

  // 1. Em-dash y en-dash usados como guion largo
  lineas.forEach((l, i) => {
    if (SIN_GUION_LARGO && /[—–]/.test(l)) out("error", f, i + 1, `guion largo: "${l.trim().slice(0, 90)}"`);
  });

  // 2. Fuentes fuera de marca
  if ([".html", ".htm", ".css"].includes(extname(f))) {
    for (const m of raw.matchAll(/font-family\s*:\s*([^;}]+)/gi)) {
      const fams = m[1].split(",").map((x) => x.trim().replace(/['"]/g, "").toLowerCase());
      for (const fam of fams) {
        if (!fam || fam.startsWith("var(")) continue;
        if (!FUENTES_OK.includes(fam)) out("error", f, raw.slice(0, m.index).split("\n").length, `fuente fuera de marca: ${fam}`);
      }
    }
  }

  // 3. Frases largas y frases gastadas, en el texto que se lee o se dice
  const esTexto = [".html", ".htm"].includes(extname(f)) ? textoVisible(raw)
    : [".txt", ".srt", ".vtt", ".md"].includes(extname(f)) ? raw : null;
  if (esTexto) {
    const frases = esTexto.replace(/\d{2}:\d{2}:\d{2}[,.]\d{3} --> .*$/gm, " ").split(/(?<=[.!?¿¡:])\s+|\n|\||✦/);
    for (const fr of frases) {
      const limpia = fr.replace(/\s+/g, " ").trim();
      const n = limpia.split(" ").filter((w) => /[a-záéíóúñü0-9]/i.test(w)).length;
      if (n > MAX) out("aviso", f, null, `frase de ${n} palabras (máx ${MAX}): "${limpia.slice(0, 100)}"`);
      const baja = limpia.toLowerCase();
      for (const g of FRASES_GASTADAS) if (baja.includes(g)) out("aviso", f, null, `frase gastada "${g}": "${limpia.slice(0, 80)}"`);
    }
  }
}

console.log(`\n${errores} errores, ${avisos} avisos. ${errores ? "Corrige los errores antes de renderizar." : "Sin errores de estilo."}`);
process.exit(errores ? 1 : 0);
