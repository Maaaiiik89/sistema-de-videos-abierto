#!/usr/bin/env node
// Crea la carpeta de un video nuevo de la marca activa, con su estructura completa.
// Uso: node herramientas/nuevo-video.mjs "<nombre del video>" [--formato vertical|horizontal] [--tematica <id>] [--marca <id>]
//
// Resultado:
//   mis-videos/marcas/<marca>/videos/AAAA-MM-DD_<nombre>/
//     LEEME.md     ficha del video: tipo, formato, temática, estado
//     guion.md     el guion, el guion visual y las fuentes de los datos
//     fuentes/     material de este video (voz, fotos, clips)
//     proyecto/    proyecto HyperFrames (index.html, compositions/, assets/)
//     entregas/    lo terminado: MP4 por red, borradores, texto del post
//
// Si la marca no tiene estilo propio todavía, usa estilos/ejemplo-neutro.

import { existsSync, mkdirSync, cpSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { RAIZ, salir, slug as aSlug, hoy as fechaHoy, rel, marcaActiva, dirMarca, campoFicha } from "./lib/sistema.mjs";

const args = process.argv.slice(2);
const opt = (k, def) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : def; };
const nombre = args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
const formato = opt("formato", "vertical");
if (!nombre) salir('Falta el nombre. Ej: node herramientas/nuevo-video.mjs "cómo guardar el pan" --formato vertical');
if (!["vertical", "horizontal"].includes(formato)) salir("--formato debe ser vertical u horizontal");

const marca = opt("marca") || marcaActiva();
const dm = dirMarca(marca);
if (!existsSync(dm.raiz)) salir(`No existe la marca "${marca}".`);
let dirEstilo = dm.estilo;
if (!existsSync(join(dirEstilo, "ESTILO.md"))) {
  console.log(`Aviso: la marca "${marca}" no tiene estilo propio todavía. Uso estilos/ejemplo-neutro.`);
  dirEstilo = join(RAIZ, "estilos", "ejemplo-neutro");
}
const tematica = opt("tematica");
const dirTematica = tematica ? join(dm.tematicas, tematica) : null;
if (tematica && !existsSync(dirTematica)) salir(`No existe la temática "${tematica}". Temáticas: ${readdirSync(dm.tematicas).join(", ") || "ninguna"}`);

const estiloUsado = dirEstilo === dm.estilo ? `marcas/${marca}/estilo` : "estilos/ejemplo-neutro";
const slug = aSlug(nombre);
const hoy = fechaHoy();
const carpeta = join(dm.videos, `${hoy}_${slug}`);
if (existsSync(carpeta)) salir(`Ya existe: ${rel(carpeta)}`);

const [W, H] = formato === "vertical" ? [1080, 1920] : [1920, 1080];

// 1. Carpetas del video
for (const d of ["fuentes", "entregas"]) mkdirSync(join(carpeta, d), { recursive: true });

// 2. Proyecto HyperFrames (versión fija, ver SEGURIDAD.md)
const init = spawnSync("npx", ["--yes", "hyperframes@0.9.30", "init", "proyecto", "--skip-skills", "--skill=hyperframes"],
  { cwd: carpeta, shell: true, encoding: "utf8" });
if (init.status !== 0 || !existsSync(join(carpeta, "proyecto", "index.html"))) {
  salir(`Falló "npx hyperframes init":\n${init.stdout}\n${init.stderr}`);
}
const proyecto = join(carpeta, "proyecto");

// 3. Estilo: DESIGN.md en la raíz del proyecto, assets en assets/estilo/ (+ el de la temática encima)
cpSync(join(dirEstilo, "DESIGN.md"), join(proyecto, "DESIGN.md"));
cpSync(join(dirEstilo, "assets"), join(proyecto, "assets", "estilo"), { recursive: true });
const hayCssTematica = dirTematica && existsSync(join(dirTematica, "estilo.css"));
if (hayCssTematica) cpSync(join(dirTematica, "estilo.css"), join(proyecto, "assets", "estilo", "tematica.css"));
mkdirSync(join(proyecto, "assets", "media"), { recursive: true });
mkdirSync(join(proyecto, "compositions"), { recursive: true });

// Subtítulos dinámicos y tiempos de la voz (los usan todas las escenas)
mkdirSync(join(proyecto, "assets", "escena"), { recursive: true });
cpSync(join(RAIZ, "plantillas", "escena", "subtitulos.js"), join(proyecto, "assets", "escena", "subtitulos.js"));

// Personaje de la marca: solo si ya está armado (marcas/<marca>/personaje/personaje.js)
const hayPersonaje = existsSync(join(dm.personaje, "personaje.js"));
if (hayPersonaje) {
  mkdirSync(join(proyecto, "assets", "personaje"), { recursive: true });
  for (const f of readdirSync(dm.personaje)) {
    if (f === "prueba") continue;
    cpSync(join(dm.personaje, f), join(proyecto, "assets", "personaje", f), { recursive: true });
  }
}

// Límite de créditos de HyperFrames/HeyGen para este video (SEGURIDAD.md, "Cuentas y gastos").
// Sale de la fila "Límite de créditos por video" de la ficha de la marca. Sin número: 0 = nada pagado.
// Con el límite, toda llamada que cueste créditos y se pase de él se rechaza sola.
const limiteCreditos = Number((campoFicha(marca, "Límite de créditos").match(/\d+/) || ["0"])[0]);
mkdirSync(join(proyecto, ".hyperframes"), { recursive: true });
writeFileSync(join(proyecto, ".hyperframes", "credit-limit.json"), JSON.stringify({ credits: limiteCreditos }) + "\n");

// 4. index.html al tamaño del formato y con el CSS del estilo
const idx = join(proyecto, "index.html");
let html = readFileSync(idx, "utf8")
  .replace(/content="width=\d+, height=\d+"/, `content="width=${W}, height=${H}"`)
  .replace(/width: 1920px;/, `width: ${W}px;`)
  .replace(/height: 1080px;/, `height: ${H}px;`)
  .replace(/data-width="\d+"/, `data-width="${W}"`)
  .replace(/data-height="\d+"/, `data-height="${H}"`)
  .replace(/<html lang="en">/, '<html lang="es">')
  .replace(/(<script src="[^"]*gsap[^"]*"><\/script>)/, `$1\n    <link rel="stylesheet" href="assets/estilo/estilo.css" />` +
    (hayCssTematica ? `\n    <link rel="stylesheet" href="assets/estilo/tematica.css" />` : "") +
    `\n    <script>window.__FORMATO = "${formato}";</script>` +
    `\n    <!-- <script src="assets/escena/voz.js"></script>  (se crea con preparar-voz.py) -->` +
    `\n    <script src="assets/escena/subtitulos.js"></script>` +
    (hayPersonaje ? `\n    <script src="assets/personaje/personaje.js"></script>` : ""));
writeFileSync(idx, html);

// 5. Ficha y guion
writeFileSync(join(carpeta, "LEEME.md"), `# ${nombre}

| Campo | Valor |
| --- | --- |
| Estado | idea |
| Marca | ${marca} |
| Temática | ${tematica || "ninguna"} |
| Estilo | \`${estiloUsado}\` |
| Tipo | animado, grabado o mixto |
| Formato | ${formato} ${W}x${H} |
| Personaje | ${hayPersonaje ? "sí (assets/personaje/)" : "no"} |
| Look | (ver \`estilos/LOOKS.md\`) |
| Efectos | |
| Duración objetivo | |
| Red | |
| Creado | ${hoy} |

Estados: idea, guion, voz, muestra, en animación, en revisión, entregado.

## De qué trata

## Material

Lo que está en \`fuentes/\` y para qué sirve.

## Entregas

Lo que está en \`entregas/\`.

## Notas
`);

writeFileSync(join(carpeta, "guion.md"), `# Guion: ${nombre}

Reglas: la ficha de la marca (\`marcas/${marca}/ficha.md\`) y \`${estiloUsado}/reglas/voz.md\`.

## Para qué es

| Campo | Valor |
| --- | --- |
| Red | |
| Duración objetivo | |
| Presupuesto de palabras | 2,3 por segundo: 30 s ≈ 70 palabras, 60 s ≈ 135 como máximo |
| Objetivo | |
| Llamado a la acción | |

## Ideas de guion

1.
2.
3.

## Guion visual (se aprueba junto con el guion)

Una fila por frase. El dato en pantalla complementa la voz, no la repite.

| # | Parte | Voz (lo que se dice) | Qué se ve | Dato en pantalla | Transición a la siguiente |
| --- | --- | --- | --- | --- | --- |
| 1 | Gancho (0 a 2 s) | | | | |
| 2 | Tensión | | | | |
| 3 | Solución | | | | |
| 4 | Pruebas | | | | |
| 5 | Dato que impacta | | | | |
| 6 | Llamado a la acción | | | | |

Palabras: 0 de 0. Duración estimada: 0 s.

## Prueba en voz alta

Frases difíciles de decir y cómo quedaron:

## Fuentes de los datos

| Dato | Fuente (enlace o informe) |
| --- | --- |

## Texto del post

`);

const relCarpeta = rel(carpeta);
console.log(`Listo: ${relCarpeta}
  Marca:   ${marca}${tematica ? " (temática " + tematica + ")" : ""}
  Estilo:  ${estiloUsado}
  Formato: ${formato} ${W}x${H}

Siguiente:
  1. Guion y guion visual en ${relCarpeta}/guion.md (la persona los aprueba)
  2. Voz grabada y sus tiempos (preparar-voz.py -> proyecto/assets/escena/voz.js)
  3. Muestra de 5 a 8 s con el diseño final (la persona la aprueba)
  4. Escenas en ${relCarpeta}/proyecto/compositions/ (plantillas/escena-vertical/, ${estiloUsado}/bloques/)
  5. node herramientas/revisar-texto.mjs ${relCarpeta}   y   npx.cmd hyperframes@0.9.30 check --json
  6. Borrador para revisar: npx.cmd hyperframes@0.9.30 render -q draft -o ../entregas/borrador.mp4`);
