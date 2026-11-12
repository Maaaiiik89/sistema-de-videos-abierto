#!/usr/bin/env node
// Panel del sistema de videos: una página local para seguir los primeros pasos, leer el manual,
// revisar lo que hizo el agente, subir archivos a la bandeja y mantener el sistema.
//
// Se abre con doble clic en "Panel.bat". Corre solo en este computador (127.0.0.1), sin internet,
// salvo para ver si hay una versión nueva (GitHub, solo si sistema.json tiene "repositorio").
//
// El panel NO está conectado a la app del agente: los dos usan la misma carpeta. El panel
//   - LEE: fichas, paletas, planes, videos, bandeja, registro, módulos e instalación;
//   - ESCRIBE solo dentro de mis-videos/ (y con las herramientas del sistema): archivos nuevos en la bandeja,
//     en las fuentes de un pedido o en el logo de una marca (nunca sobrescribe); pedidos de video (PEDIDO.md)
//     y sus respuestas; una marca nueva con lo básico (marcas.mjs nueva); la paleta elegida (paleta.mjs
//     aplicar, solo si pasa las 4 pruebas); "¿Tiene personaje? no" en la ficha; módulos encendidos
//     (modulos.mjs); la app elegida en config.json. Manda a la Papelera de reciclaje solo lo que la persona
//     marca en Almacenamiento, dentro de los grupos sugeridos (y lo anota en el registro);
//   - ABRE: carpetas y archivos de la carpeta del sistema con el programa de Windows que corresponda,
//     y las ventanas de Instalar.bat (reparar) y Actualizar.bat.
//
// Seguridad: escucha solo en 127.0.0.1; rechaza otros "Host" (evita que una web use el panel por
// DNS); toda acción que cambia algo exige el código de esta sesión (va dentro de la página) y el
// mismo origen; las rutas se resuelven y se comprueba que queden dentro de la carpeta del sistema.

import http from "node:http";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, createReadStream, createWriteStream, renameSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve, extname, basename, sep, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile, spawn } from "node:child_process";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { RAIZ, DATOS, MARCAS, BANDEJA, REGISTRO, CONFIG, listaMarcas, dirMarca } from "../herramientas/lib/sistema.mjs";
import { pruebas } from "../herramientas/paleta.mjs";
import { leer, leerJson, esDir, esArchivo, visibles, relRaiz, dentroDe, filasTabla, porSecciones, buscarSeccion, nombreSeguro, nombreLibre } from "./lib/util.mjs";
import { logosDeMarca, bloquesDeMarca, referenciasDeMarca, cambios, pedidosParaPanel, crearMarca, aplicarPaleta, ponerFicha, guardarPedido, responderPedido, destinoSubida } from "./lib/extra.mjs";
import { medir, sugerencias, liberar } from "./lib/almacen.mjs";
import { agregarArchivo } from "../herramientas/lib/pedidos.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const PUERTO_BASE = 4317;
const TOKEN = randomBytes(24).toString("hex");
const MAX_SUBIDA = 16 * 1024 ** 3; // 16 GB por archivo
const NODE = process.execPath;

// ------------------------------------------------------------------ lectura segura (panel/lib/util.mjs)
const leerConfig = () => ({ marcaActiva: null, modulos: {}, ...leerJson(CONFIG, {}) });

// ------------------------------------------------------------------ marca
const VARS = { fondo: "--ground", fondo2: "--ground-2", texto: "--paper", acento: "--accent", acento2: "--accent-2" };
function leerPaleta(css) {
  const t = leer(css), p = {};
  if (!t) return null;
  for (const [k, v] of Object.entries(VARS)) { const m = t.match(new RegExp(v + "\\s*:\\s*(#[0-9a-fA-F]{6})\\b")); if (m) p[k] = m[1].toUpperCase(); }
  if (!p.fondo || !p.texto || !p.acento) return null;
  if (!p.fondo2) p.fondo2 = p.fondo;
  if (!p.acento2) p.acento2 = p.acento;
  const fuente = (v) => ((t.match(new RegExp(v + "\\s*:\\s*([^;]+);")) || [])[1] || "").split(",")[0].replace(/["']/g, "").trim();
  return { ...p, titulos: fuente("--font-display"), cuerpo: fuente("--font-sans") };
}
const conPruebas = (p) => (p ? { ...p, pruebas: pruebas(p), pasaTodo: pruebas(p).every((x) => x.pasa) } : null);

function leerFicha(id) {
  const texto = leer(dirMarca(id).ficha);
  const estado = ((texto.match(/^Estado:\s*(.+)$/m) || [])[1] || "").trim();
  const secciones = porSecciones(texto).filter((s) => s.titulo).map((s) => ({
    titulo: s.titulo, filas: filasTabla(s.lineas).filter((c) => c[0] !== "Campo").map((c) => [c[0], c.slice(1).join(" | ")])
  }));
  const campo = (re) => { for (const s of secciones) for (const [k, v] of s.filas) if (re.test(k)) return v; return ""; };
  return { estado, secciones, campo, titulo: ((texto.match(/^#\s+(.+)$/m) || [])[1] || "").replace(/^Ficha de marca:\s*/i, "") };
}

const IMAGEN = /\.(svg|png|jpe?g|webp|gif)$/i;
// Una marca nueva parte con una copia del estilo de ejemplo: su logo y sus colores no cuentan como los de la marca
const EJEMPLO = join(RAIZ, "estilos", "ejemplo-neutro", "assets");
const logosEjemplo = new Set(visibles(join(EJEMPLO, "logo")).map((f) => { try { return f + ":" + statSync(join(EJEMPLO, "logo", f)).size; } catch { return f; } }));
const paletaEjemplo = leerPaleta(join(EJEMPLO, "estilo.css"));
function logoDeMarca(dir) {
  const propios = visibles(dir).filter((f) => IMAGEN.test(f) && esArchivo(join(dir, f)) && !logosEjemplo.has(f + ":" + statSync(join(dir, f)).size));
  propios.sort((a, b) => statSync(join(dir, b)).mtimeMs - statSync(join(dir, a)).mtimeMs);
  return propios.length ? join(dir, propios[0]) : null;
}
function buscarArchivo(dir, nombre, prof = 2) {
  if (!esDir(dir)) return null;
  for (const f of visibles(dir)) {
    const p = join(dir, f);
    if (f.toLowerCase() === nombre && esArchivo(p)) return p;
  }
  if (prof > 0) for (const f of visibles(dir)) { const p = join(dir, f); if (esDir(p) && f !== "node_modules") { const r = buscarArchivo(p, nombre, prof - 1); if (r) return r; } }
  return null;
}

function leerLeemeVideo(dir) {
  const t = leer(join(dir, "LEEME.md")), datos = {};
  for (const c of filasTabla(t.split(/\r?\n/))) if (c[0] !== "Campo") datos[c[0]] = c.slice(1).join(" | ");
  return { titulo: ((t.match(/^#\s+(.+)$/m) || [])[1] || "").trim(), datos };
}

function videosDeMarca(d) {
  return visibles(d.videos).filter((f) => esDir(join(d.videos, f))).sort().reverse().map((carpeta) => {
    const dir = join(d.videos, carpeta), l = leerLeemeVideo(dir), ent = join(dir, "entregas");
    const entregas = visibles(ent).filter((f) => esArchivo(join(ent, f))).map((f) => ({ nombre: f, ruta: relRaiz(join(ent, f)) }));
    return {
      carpeta, ruta: relRaiz(dir), titulo: l.titulo || carpeta, estado: (l.datos.Estado || "").toLowerCase(),
      formato: l.datos.Formato || "", red: l.datos.Red || "", tipo: l.datos.Tipo || "", creado: l.datos.Creado || carpeta.slice(0, 10),
      tematica: l.datos["Temática"] || "", guion: esArchivo(join(dir, "guion.md")) ? relRaiz(join(dir, "guion.md")) : null, entregas
    };
  });
}

function leerPlan(archivo) {
  const secc = porSecciones(leer(archivo));
  const tabla = (re) => {
    const s = buscarSeccion(secc, re); if (!s) return [];
    const filas = filasTabla(s.lineas); if (!filas.length) return [];
    const cab = filas[0];
    return filas.slice(1).filter((c) => c.some((x) => x)).map((c) => Object.fromEntries(cab.map((k, i) => [k, c[i] || ""])));
  };
  const texto = (re) => {
    const s = buscarSeccion(secc, re); if (!s) return "";
    return s.lineas.map((l) => l.trim()).filter((l) => l && !l.startsWith("|") && !l.startsWith(">") && !/^Lectura:/i.test(l) && !/^Etapas:/i.test(l) && !/^\{\{/.test(l)).join(" ");
  };
  const funciono = buscarSeccion(secc, /^lo que funciono/);
  const lectura = funciono ? ((funciono.lineas.join("\n").match(/^Lectura:\s*(.*)$/m) || [])[1] || "").trim() : "";
  const ritmo = Object.fromEntries(tabla(/^ritmo/).map((r) => [r.Campo, r.Valor]));
  const mes = basename(archivo, ".md");
  return {
    mes, titulo: (((leer(archivo).match(/^#\s+(.+)$/m)) || [])[1] || mes).replace(/^Plan de contenido:\s*/i, ""),
    objetivo: texto(/^objetivo/), ritmo, fechas: tabla(/^fechas/), videos: tabla(/^videos/), ideas: tabla(/^banco/), funciono: tabla(/^lo que funciono/), lectura
  };
}

function pilaresDeFicha(f) {
  const v = f.campo(/^Pilares/i), out = [];
  for (const m of v.matchAll(/([^,;(]+?)\s*\(?\s*(\d{1,3})\s*%\s*\)?/g)) out.push({ nombre: m[1].replace(/^[\s:-]+/, "").trim(), meta: Number(m[2]) });
  if (!out.length) for (const n of v.split(/[,;]/).map((x) => x.trim()).filter((x) => x && !x.startsWith("("))) out.push({ nombre: n, meta: null });
  return out;
}

function leerMarca(id, global) {
  const d = dirMarca(id), f = leerFicha(id);
  const paleta = conPruebas(leerPaleta(join(d.estilo, "assets", "estilo.css")));
  if (paleta && paletaEjemplo) paleta.deEjemplo = ["fondo", "fondo2", "texto", "acento", "acento2"].every((k) => paleta[k] === paletaEjemplo[k]);
  const propuestas = (leerJson(join(d.estilo, "paletas-propuestas.json"), []) || []).filter((p) => p && p.fondo && p.texto && p.acento)
    .map((p) => conPruebas({ nombre: p.nombre || "Propuesta", fecha: p.fecha || "", para: p.para || "", fondo: p.fondo, fondo2: p.fondo2 || p.fondo, texto: p.texto, acento: p.acento, acento2: p.acento2 || p.acento }));
  const logo = logoDeMarca(join(d.estilo, "assets", "logo"));
  const logos = logosDeMarca(d, (dir, f) => { try { return logosEjemplo.has(f + ":" + statSync(join(dir, f)).size); } catch { return false; } });
  const pjMd = leer(join(d.personaje, "PERSONAJE.md"));
  const pjEstado = ((pjMd.match(/^Estado:\s*(.+)$/m) || [])[1] || "").trim();
  const pjPrueba = buscarArchivo(d.personaje, "prueba-personaje.mp4");
  const tematicas = visibles(d.tematicas).filter((t) => esDir(join(d.tematicas, t))).map((t) => {
    const md = leer(join(d.tematicas, t, "tematica.md"));
    return { id: t, nombre: ((md.match(/^#\s+Temática:\s*(.+)$/m) || [])[1] || t).trim(), para: ((md.match(/^\|\s*Para qué es\s*\|(.*)\|\s*$/m) || [])[1] || "").trim().replace(/^\(ej\..*\)$/, "") };
  });
  const planes = visibles(d.plan).filter((p) => /^\d{4}-\d{2}\.md$/.test(p)).sort().map((p) => leerPlan(join(d.plan, p)));
  const videos = videosDeMarca(d);
  const tieneLogo = !!logo;
  const sinPersonaje = /^no\b/i.test(f.campo(/Tiene personaje/i));
  const coloresEnFicha = !!f.campo(/^Colores/i).replace(/[`()]/g, "").trim();
  const entregado = videos.some((v) => v.estado.startsWith("entregado") || v.entregas.some((e) => /\.mp4$/i.test(e.nombre) && !/borrador|muestra/i.test(e.nombre)));
  return {
    id, nombre: f.campo(/^Nombre$/i) || f.titulo || id, activa: global.activa === id, rutaCarpeta: relRaiz(d.raiz), rutaFicha: relRaiz(d.ficha),
    estadoFicha: f.estado, secciones: f.secciones,
    resumen: {
      rubro: f.campo(/A qué se dedica/i), publico: f.campo(/A quién le habla/i), tono: f.campo(/^Tono/i), trato: f.campo(/Tú o usted/i),
      redes: f.campo(/Redes y formatos/i), musica: f.campo(/Música de la marca/i), objetivo: f.campo(/^Objetivo/i), cta: f.campo(/Llamado a la acción/i),
      limite: f.campo(/Límite de créditos/i) || "0", palabras: f.campo(/Palabras de la marca/i).split(",").map((x) => x.trim()).filter(Boolean),
      personaje: f.campo(/^Cómo es$/i), tienePersonaje: f.campo(/Tiene personaje/i), ritmo: f.campo(/^Ritmo/i)
    },
    pilares: pilaresDeFicha(f), paleta, propuestas, logo: logo ? relRaiz(logo) : null,
    personaje: { estado: pjEstado, prueba: pjPrueba ? relRaiz(pjPrueba) : null, carpeta: relRaiz(d.personaje), md: pjMd ? relRaiz(join(d.personaje, "PERSONAJE.md")) : null },
    tematicas, planes, videos,
    logos, bloques: bloquesDeMarca(d), referencias: referenciasDeMarca(d), pedidos: pedidosParaPanel(id),
    contexto: {
      slogan: f.campo(/^Slogan/i), distinto: f.campo(/Qué la hace distinta/i), productos: f.campo(/^Productos o servicios/i),
      ubicacion: f.campo(/^Dónde está/i), horario: f.campo(/^Horario/i), noToca: f.campo(/^Temas que no toca/i), admira: f.campo(/^Cuentas que admira/i),
      imagen: f.campo(/^Estilo de fotos/i), web: f.campo(/^Web y redes/i), usa: f.campo(/^Palabras que usa/i), evita: f.campo(/^Palabras que evita/i),
      fechas: f.campo(/^Fechas importantes/i), camara: f.campo(/^Sale en cámara/i), voz: f.campo(/^Voz \(/i)
    },
    pasos: {
      ficha: /^completa/i.test(f.estado),
      colores: coloresEnFicha && !!paleta && paleta.pasaTodo && !paleta.deEjemplo,
      material: tieneLogo || global.registro.some((r) => r.destino.includes(`marcas/${id}/`)),
      personaje: /^aprobado/i.test(pjEstado) || sinPersonaje,
      plan: planes.length > 0,
      video: entregado
    }
  };
}

// ------------------------------------------------------------------ bandeja y registro
function leerRegistro() {
  return filasTabla(leer(REGISTRO).split(/\r?\n/)).filter((c) => c[0] !== "Fecha" && c.length >= 3)
    .map((c) => ({ fecha: c[0], archivo: c[1], destino: c[2].replace(/^mis-videos\//, "") }));
}

let cacheBandeja = { firma: "", propuesta: [] };
function propuestaBandeja(archivos, activa) {
  if (!archivos.length || !activa) return Promise.resolve([]);
  const firma = activa + "|" + archivos.map((a) => a.nombre + a.tam).join("|");
  if (firma === cacheBandeja.firma) return Promise.resolve(cacheBandeja.propuesta);
  return new Promise((ok) => {
    execFile(NODE, [join(RAIZ, "herramientas", "ordenar.mjs"), "--marca", activa, "--json"], { cwd: RAIZ, timeout: 20000, windowsHide: true }, (err, out) => {
      let p = [];
      if (!err) try { p = JSON.parse(out); } catch {}
      cacheBandeja = { firma, propuesta: p };
      ok(p);
    });
  });
}

// ------------------------------------------------------------------ módulos
function leerModulos(config) {
  const dir = join(RAIZ, "modulos");
  return visibles(dir).filter((m) => esArchivo(join(dir, m, "modulo.json"))).map((m) => {
    const j = leerJson(join(dir, m, "modulo.json"), null);
    if (!j || j.id !== m) return null;
    const v = (config.modulos || {})[j.id];
    return { ...j, activo: j.siempre ? true : typeof v === "boolean" ? v : !!j.activoPorDefecto, guia: leer(join(dir, m, "PASO-A-PASO.md")) };
  }).filter(Boolean).sort((a, b) => orden(a.id) - orden(b.id) || a.nombre.localeCompare(b.nombre));
}
const ORDEN = ["base", "grabador", "editor", "animacion", "mixto", "personaje", "plan", "musica", "voz-ia", "ilustrar", "referencias"];
const orden = (id) => (ORDEN.indexOf(id) + 1 || 99);

// ------------------------------------------------------------------ estado completo
async function estado() {
  const sistema = leerJson(join(RAIZ, "sistema.json"), {});
  const config = leerConfig(), marcas = listaMarcas();
  const activa = config.marcaActiva && marcas.includes(config.marcaActiva) ? config.marcaActiva : marcas.length === 1 ? marcas[0] : null;
  const registro = leerRegistro();
  const instalacion = leerJson(join(DATOS, ".instalacion.json"), null);
  const archivos = visibles(BANDEJA).filter((f) => esArchivo(join(BANDEJA, f))).map((f) => { const s = statSync(join(BANDEJA, f)); return { nombre: f, tam: s.size, fecha: s.mtime.toISOString() }; });
  const propuesta = await propuestaBandeja(archivos, activa);
  const generales = {};
  for (const [k, dirs] of Object.entries({ musica: [join(RAIZ, "recursos", "musica"), join(DATOS, "recursos", "musica")], sonidos: [join(RAIZ, "recursos", "sonidos"), join(DATOS, "recursos", "sonidos")], iconos: [join(RAIZ, "recursos", "iconos"), join(DATOS, "recursos", "iconos")] }))
    generales[k] = dirs.reduce((n, d) => n + visibles(d).filter((f) => !/\.md$/i.test(f)).length, 0);
  return {
    sistema: { version: sistema.version || "?", repositorio: sistema.repositorio || "", raiz: RAIZ },
    ultimaConversacion: leer(join(DATOS, ".ultima-conversacion")).trim() || null, musicaIncluida: !!config.musicaIncluida, cambios: cambios(),
    app: config.app || (instalacion && instalacion.app) || "",
    activa, instalacion,
    marcas: marcas.map((id) => leerMarca(id, { activa, registro })),
    bandeja: archivos.map((a) => ({ ...a, propuesta: propuesta.find((p) => p.archivo === a.nombre) || null, acompana: !propuesta.some((p) => p.archivo === a.nombre) && propuesta.some((p) => p.meta && p.meta.archivo === a.nombre) })),
    registro: registro.slice(-12).reverse(), registroTotal: registro.length,
    generales, modulos: leerModulos(config)
  };
}

// ------------------------------------------------------------------ versión nueva (GitHub)
let cacheVersion = { t: 0, datos: null };
const AGENTE = { "User-Agent": "sistema-de-videos" };

// Sección "## <version> ..." de CHANGELOG.md, sin el título.
function seccionCambios(texto, version) {
  const lineas = String(texto).split(/\r?\n/), salida = [];
  let dentro = false;
  for (const l of lineas) {
    if (l.startsWith("## ")) { if (dentro) break; dentro = l.startsWith(`## ${version} `); continue; }
    if (dentro) salida.push(l);
  }
  return salida.join("\n").trim();
}

// Primero la API de GitHub. Sin cuenta permite 60 consultas por hora por dirección de internet, y muchos
// proveedores comparten una dirección entre sus clientes: si se pasó el límite (o falla), se usa la página
// pública "releases/latest", que redirige a la etiqueta, y las notas salen del CHANGELOG.md de esa etiqueta.
async function ultimaPublicada(repo) {
  try {
    const r = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, { headers: { ...AGENTE, Accept: "application/vnd.github+json" }, signal: AbortSignal.timeout(8000) });
    if (r.ok) { const j = await r.json(); if (j.tag_name) return { tag: String(j.tag_name), notas: String(j.body || "") }; }
  } catch { /* se intenta por la página pública */ }
  const r = await fetch(`https://github.com/${repo}/releases/latest`, { method: "HEAD", redirect: "manual", headers: AGENTE, signal: AbortSignal.timeout(8000) });
  const m = /\/releases\/tag\/(v\d+\.\d+\.\d+)$/.exec(r.headers.get("location") || "");
  if (!m) throw new Error(r.status >= 300 && r.status < 400 ? "todavía no hay versiones publicadas" : `GitHub respondió ${r.status}`);
  let notas = "";
  try {
    const c = await fetch(`https://raw.githubusercontent.com/${repo}/${m[1]}/CHANGELOG.md`, { headers: AGENTE, signal: AbortSignal.timeout(8000) });
    if (c.ok) notas = seccionCambios(await c.text(), m[1].slice(1));
  } catch { /* sin notas */ }
  return { tag: m[1], notas: notas || "Las notas de esta versión están en CHANGELOG.md." };
}
async function versionNueva() {
  const s = leerJson(join(RAIZ, "sistema.json"), {});
  if (!s.repositorio) return { actual: s.version, repositorio: false };
  if (Date.now() - cacheVersion.t < 3600e3 && cacheVersion.datos) return cacheVersion.datos;
  try {
    const j = await ultimaPublicada(s.repositorio), nueva = j.tag.replace(/^v/, "");
    const mayor = (a, b) => { const x = a.split(".").map(Number), y = b.split(".").map(Number); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; };
    cacheVersion = { t: Date.now(), datos: { actual: s.version, repositorio: true, nueva: mayor(nueva, s.version) ? nueva : null, notas: j.notas.slice(0, 4000) } };
    return cacheVersion.datos;
  } catch (e) {
    return { actual: s.version, repositorio: true, error: "No pude consultar GitHub: " + e.message };
  }
}

// ------------------------------------------------------------------ acciones
async function subir(req, res, url) {
  const largo = Number(req.headers["content-length"] || 0);
  if (largo > MAX_SUBIDA) return responder(res, 413, { error: "El archivo pesa más de 16 GB." });
  let destino = BANDEJA, pedido = null;
  if (url.searchParams.get("marca")) {
    const r = destinoSubida(url.searchParams.get("marca"), url.searchParams.get("tipo"), url.searchParams.get("carpeta"));
    if (r.error) return responder(res, 400, { error: r.error });
    destino = r.dir; pedido = r.pedido || null;
  }
  mkdirSync(destino, { recursive: true });
  const nombre = nombreSeguro(url.searchParams.get("nombre"));
  const parcial = join(destino, `.subiendo-${randomBytes(6).toString("hex")}`);
  let total = 0;
  const limite = new Transform({ transform(c, _e, cb) { total += c.length; cb(total > MAX_SUBIDA ? new Error("demasiado grande") : null, c); } });
  try {
    await pipeline(req, limite, createWriteStream(parcial, { flags: "wx" }));
    if (largo && total !== largo) throw new Error("la subida se cortó");
    const final = nombreLibre(destino, nombre);
    renameSync(parcial, join(destino, final));
    if (pedido) agregarArchivo(pedido, final, "fuentes/" + final);
    responder(res, 200, { ok: true, nombre: final, tam: total });
  } catch (e) {
    rmSync(parcial, { force: true });
    if (!res.headersSent) responder(res, 400, { error: "No se pudo guardar: " + e.message });
  }
}

const ABRIBLE = /\.(mp4|mov|webm|m4a|mp3|wav|png|jpe?g|webp|gif|pdf|md|txt)$/i;
function abrir(r) {
  const p = resolve(RAIZ, String(r || "."));
  if (!dentroDe(RAIZ, p) || !existsSync(p)) return { error: "Esa ruta no está dentro de la carpeta del sistema." };
  if (esArchivo(p) && !ABRIBLE.test(p)) return { error: "Ese tipo de archivo no se abre desde el panel." };
  spawn("explorer.exe", [p], { detached: true, stdio: "ignore", windowsHide: false }).unref();
  return { ok: true };
}

function correrModulo(id, accion) {
  return new Promise((ok) => {
    const mods = leerModulos(leerConfig());
    if (!mods.some((m) => m.id === id) || !["activar", "apagar"].includes(accion)) return ok({ error: "Módulo o acción desconocida." });
    execFile(NODE, [join(RAIZ, "herramientas", "modulos.mjs"), accion, id], { cwd: RAIZ, timeout: 60000, windowsHide: true }, (err, out, errOut) => {
      ok(err ? { error: (errOut || out || err.message).trim() } : { ok: true, mensaje: out.trim() });
    });
  });
}

function ventana(que) {
  const bat = que === "reparar" ? "Instalar.bat" : que === "actualizar" ? "Actualizar.bat" : null;
  if (!bat || !existsSync(join(RAIZ, bat))) return { error: "No encuentro " + (bat || "esa acción") + "." };
  const args = ["/d", "/c", join(RAIZ, bat)];
  if (que === "reparar") args.push("-SinPreguntas");
  spawn("cmd.exe", args, { cwd: RAIZ, detached: true, stdio: "ignore" }).unref();
  return { ok: true };
}

function guardarAjustes(b) {
  const c = leerConfig();
  if (b.app !== undefined) {
    if (!["Claude", "ChatGPT", "Antigravity"].includes(b.app)) return { error: "App desconocida." };
    c.app = b.app;
  }
  if (b.musicaIncluida !== undefined) c.musicaIncluida = !!b.musicaIncluida;
  mkdirSync(DATOS, { recursive: true });
  writeFileSync(CONFIG, JSON.stringify(c, null, 2) + "\n");
  return { ok: true };
}

// ------------------------------------------------------------------ archivos para mirar (logo, prueba del personaje, entregas)
const TIPOS = { ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".mp4": "video/mp4", ".webm": "video/webm", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".m4a": "audio/mp4" };
function servirArchivo(req, res, url) {
  const p = resolve(RAIZ, url.searchParams.get("r") || "");
  const tipo = TIPOS[extname(p).toLowerCase()];
  if (!tipo || !dentroDe(DATOS, p) || !esArchivo(p)) { res.writeHead(404); return res.end(); }
  const tam = statSync(p).size, rango = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
  const cab = { "Content-Type": tipo, "Accept-Ranges": "bytes", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  if (tipo === "image/svg+xml") cab["Content-Security-Policy"] = "default-src 'none'; style-src 'unsafe-inline'; sandbox";
  if (rango && (rango[1] || rango[2])) {
    let ini = rango[1] ? Number(rango[1]) : tam - Number(rango[2]), fin = rango[1] && rango[2] ? Number(rango[2]) : tam - 1;
    ini = Math.max(0, ini); fin = Math.min(fin, tam - 1);
    if (ini > fin) { res.writeHead(416, { "Content-Range": `bytes */${tam}` }); return res.end(); }
    res.writeHead(206, { ...cab, "Content-Range": `bytes ${ini}-${fin}/${tam}`, "Content-Length": fin - ini + 1 });
    return createReadStream(p, { start: ini, end: fin }).pipe(res);
  }
  res.writeHead(200, { ...cab, "Content-Length": tam });
  createReadStream(p).pipe(res);
}

// ------------------------------------------------------------------ servidor
let PUERTO = PUERTO_BASE;
const SEGURIDAD = {
  "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Cache-Control": "no-store", "X-Frame-Options": "DENY",
  "Content-Security-Policy": "default-src 'self'; img-src 'self' data:; media-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
};
function responder(res, cod, obj) {
  res.writeHead(cod, { ...SEGURIDAD, "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}
function estatico(res, archivo, tipo, reemplazos) {
  let t = leer(join(AQUI, archivo));
  if (!t) { res.writeHead(404); return res.end(); }
  if (reemplazos) for (const [k, v] of Object.entries(reemplazos)) t = t.replaceAll(k, v);
  res.writeHead(200, { ...SEGURIDAD, "Content-Type": tipo + "; charset=utf-8" });
  res.end(t);
}
// panel.js se arma con las partes de panel/js/ (en orden de nombre), todas dentro de la misma función
function servirScript(res) {
  const dir = join(AQUI, "js"), partes = visibles(dir).filter((f) => f.endsWith(".js")).sort();
  const t = partes.length ? '(function () {\n  "use strict";\n' + partes.map((f) => `// ---- ${f}\n` + leer(join(dir, f))).join("\n") + "\n})();\n" : leer(join(AQUI, "panel.js"));
  res.writeHead(200, { ...SEGURIDAD, "Content-Type": "text/javascript; charset=utf-8" });
  res.end(t);
}
function cuerpoJson(req) {
  return new Promise((ok, mal) => {
    let s = "";
    req.setEncoding("utf8");
    req.on("data", (c) => { s += c; if (s.length > 1e5) { mal(new Error("muy largo")); req.destroy(); } });
    req.on("end", () => { try { ok(JSON.parse(s || "{}")); } catch (e) { mal(e); } });
    req.on("error", mal);
  });
}

const servidor = http.createServer(async (req, res) => {
  try {
    const host = String(req.headers.host || "");
    if (host !== `127.0.0.1:${PUERTO}` && host !== `localhost:${PUERTO}`) { res.writeHead(421); return res.end("Host no permitido"); }
    const url = new URL(req.url, `http://${host}`);
    if (req.method === "GET") {
      if (url.pathname === "/") return estatico(res, "index.html", "text/html", { "{{TOKEN}}": TOKEN });
      if (url.pathname === "/panel.css") return estatico(res, "panel.css", "text/css");
      if (url.pathname === "/panel.js") return servirScript(res);
      if (url.pathname === "/api/hola") return responder(res, 200, { panel: "sistema-de-videos", raiz: RAIZ });
      if (url.pathname === "/api/estado") return responder(res, 200, await estado());
      if (url.pathname === "/api/version") return responder(res, 200, await versionNueva());
      if (url.pathname === "/api/almacenamiento") return responder(res, 200, { ...medir(), grupos: sugerencias() });
      if (url.pathname === "/archivo") return servirArchivo(req, res, url);
      res.writeHead(404); return res.end();
    }
    if (req.method !== "POST") { res.writeHead(405); return res.end(); }
    // Toda acción: mismo origen y código de esta sesión
    const origen = req.headers.origin;
    if ((origen && origen !== `http://127.0.0.1:${PUERTO}` && origen !== `http://localhost:${PUERTO}`) || req.headers["x-panel-token"] !== TOKEN)
      return responder(res, 403, { error: "Acción no autorizada. Recarga el panel." });
    if (url.pathname === "/api/subir") return await subir(req, res, url);
    const b = await cuerpoJson(req);
    if (url.pathname === "/api/modulo") return responder(res, 200, await correrModulo(b.id, b.accion));
    if (url.pathname === "/api/abrir") return responder(res, 200, abrir(b.ruta));
    if (url.pathname === "/api/ventana") return responder(res, 200, ventana(b.que));
    if (url.pathname === "/api/ajustes") return responder(res, 200, guardarAjustes(b));
    if (url.pathname === "/api/marca") return responder(res, 200, await crearMarca(b));
    if (url.pathname === "/api/paleta") return responder(res, 200, await aplicarPaleta(b));
    if (url.pathname === "/api/ficha") return responder(res, 200, ponerFicha(b));
    if (url.pathname === "/api/pedido") return responder(res, 200, guardarPedido(b));
    if (url.pathname === "/api/pedido/responder") return responder(res, 200, responderPedido(b));
    if (url.pathname === "/api/liberar") return responder(res, 200, await liberar(b.grupo, b.rutas, !!b.entiendo));
    responder(res, 404, { error: "No existe." });
  } catch (e) {
    if (!res.headersSent) responder(res, 500, { error: e.message });
  }
});

function abrirNavegador(u) { spawn("explorer.exe", [u], { detached: true, stdio: "ignore" }).unref(); }

async function yaAbierto(puerto) {
  try {
    const r = await fetch(`http://127.0.0.1:${puerto}/api/hola`, { signal: AbortSignal.timeout(1500) });
    const j = await r.json();
    return j.panel === "sistema-de-videos" && resolve(j.raiz).toLowerCase() === RAIZ.toLowerCase();
  } catch { return false; }
}

async function arrancar(puerto, intentos = 12) {
  if (await yaAbierto(puerto)) {
    console.log("El panel ya estaba abierto: lo muestro en el navegador.");
    if (!process.argv.includes("--sin-navegador")) abrirNavegador(`http://127.0.0.1:${puerto}/`);
    setTimeout(() => process.exit(0), 500);
    return;
  }
  PUERTO = puerto;
  servidor.once("error", (e) => {
    if (e.code === "EADDRINUSE" && intentos > 0) return arrancar(puerto + 1, intentos - 1);
    console.error("No pude abrir el panel: " + e.message); process.exit(1);
  });
  servidor.listen(puerto, "127.0.0.1", () => {
    const u = `http://127.0.0.1:${puerto}/`;
    console.log(`Panel abierto en ${u}`);
    console.log("Deja esta ventana abierta mientras uses el panel. Para apagarlo, ciérrala.");
    if (!process.argv.includes("--sin-navegador")) abrirNavegador(u);
  });
}
arrancar(Number(process.env.PANEL_PUERTO) || PUERTO_BASE);
