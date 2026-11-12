#!/usr/bin/env node
// Módulos: cada herramienta del sistema es una carpeta en modulos/<id>/ con
//   modulo.json      ficha: qué hace, qué instala, si usa internet, si cuesta créditos, de qué depende
//   PASO-A-PASO.md   guía para personas
//   skills/<nombre>/SKILL.md   instrucciones para el agente
//
// Solo las skills de los módulos encendidos se copian a las carpetas que leen las apps:
//   .agents/skills/ (ChatGPT/Codex y Antigravity) y .claude/skills/ (Claude).
//
// Uso:
//   node herramientas/modulos.mjs lista
//   node herramientas/modulos.mjs activar <id>      (enciende también los módulos que necesita)
//   node herramientas/modulos.mjs apagar <id>
//   node herramientas/modulos.mjs sincronizar       (lo corre Instalar.bat y Actualizar.bat)

import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync, cpSync, rmSync } from "node:fs";
import { join } from "node:path";
import { RAIZ, MODULOS, salir, leerConfig, guardarConfig } from "./lib/sistema.mjs";

const DESTINOS = [join(RAIZ, ".agents", "skills"), join(RAIZ, ".claude", "skills")];
const MANIFIESTO = ".del-sistema.json"; // qué skills puso el sistema (las demás no se tocan)

export function leerModulos() {
  if (!existsSync(MODULOS)) return [];
  return readdirSync(MODULOS, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(MODULOS, d.name, "modulo.json")))
    .map((d) => {
      const m = JSON.parse(readFileSync(join(MODULOS, d.name, "modulo.json"), "utf8"));
      if (m.id !== d.name) salir(`modulos/${d.name}/modulo.json dice id "${m.id}": debe ser igual al nombre de la carpeta.`);
      return m;
    });
}

export function estaActivo(m, config) {
  if (m.siempre) return true;
  const v = (config.modulos || {})[m.id];
  return typeof v === "boolean" ? v : !!m.activoPorDefecto;
}

function sincronizar(mods, config) {
  const activas = new Map();
  for (const m of mods) if (estaActivo(m, config)) for (const s of m.skills || []) {
    const src = join(MODULOS, m.id, "skills", s);
    if (!existsSync(join(src, "SKILL.md"))) salir(`Falta modulos/${m.id}/skills/${s}/SKILL.md`);
    if (activas.has(s)) salir(`La skill "${s}" está en dos módulos (${activas.get(s).id} y ${m.id}).`);
    activas.set(s, { id: m.id, src });
  }
  for (const dest of DESTINOS) {
    mkdirSync(dest, { recursive: true });
    const man = join(dest, MANIFIESTO);
    const antes = existsSync(man) ? JSON.parse(readFileSync(man, "utf8")) : [];
    // Retira solo lo que puso el sistema y ya no corresponde
    for (const s of antes) if (!activas.has(s) && /^[a-z0-9-]+$/.test(s)) rmSync(join(dest, s), { recursive: true, force: true });
    for (const [s, { src }] of activas) {
      if (!antes.includes(s) && existsSync(join(dest, s))) salir(`Ya existe ${join(dest, s)} y no la puso el sistema. Cámbiale el nombre para no pisarla.`);
      rmSync(join(dest, s), { recursive: true, force: true });
      cpSync(src, join(dest, s), { recursive: true });
    }
    writeFileSync(man, JSON.stringify([...activas.keys()].sort(), null, 2) + "\n");
  }
  return [...activas.keys()];
}

const esPrincipal = process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("herramientas/modulos.mjs");
if (esPrincipal) {
  const [orden, id] = process.argv.slice(2);
  const mods = leerModulos(), config = leerConfig(), porId = Object.fromEntries(mods.map((m) => [m.id, m]));

  if (!orden || orden === "lista") {
    for (const m of mods) {
      const marcas = [m.siempre ? "siempre" : null, m.usaInternet ? "usa internet" : null, m.cuestaCreditos ? "cuesta créditos" : null, m.deTerceros ? "de terceros" : null].filter(Boolean);
      console.log(`${estaActivo(m, config) ? "[x]" : "[ ]"} ${m.id.padEnd(10)} ${m.nombre}${marcas.length ? "  (" + marcas.join(", ") + ")" : ""}`);
    }
  } else if (orden === "activar" || orden === "apagar") {
    const m = porId[id];
    if (!m) salir(`No existe el módulo "${id}". Módulos: ${mods.map((x) => x.id).join(", ")}`);
    config.modulos = config.modulos || {};
    if (orden === "activar") {
      const encendidos = [];
      const encender = (x) => { if (!estaActivo(x, config)) { config.modulos[x.id] = true; encendidos.push(x.nombre); } for (const r of x.requiere || []) encender(porId[r]); };
      encender(m);
      config.modulos[m.id] = true;
      guardarConfig(config);
      console.log(`Encendido: ${m.nombre}.${encendidos.length > 1 ? " También: " + encendidos.filter((n) => n !== m.nombre).join(", ") + "." : ""}`);
      console.log(`Qué implica: ${m.instala.join("; ")}. ${m.usaInternet ? "Usa internet." : "No usa internet."} ${m.cuestaCreditos ? "Puede costar créditos (siempre con un sí y dentro del límite de la marca)." : "No cuesta créditos."}`);
    } else {
      if (m.siempre) salir(`"${m.nombre}" es parte de la base y no se puede apagar.`);
      const dependen = mods.filter((x) => x.id !== m.id && estaActivo(x, config) && (x.requiere || []).includes(m.id));
      if (dependen.length) salir(`No se puede apagar "${m.nombre}": lo usa ${dependen.map((x) => x.nombre).join(", ")}. Apaga primero ${dependen.length > 1 ? "esos" : "ese"}.`);
      config.modulos[m.id] = false;
      guardarConfig(config);
      console.log(`Apagado: ${m.nombre}. Tus archivos no se tocan; el agente deja de usar sus instrucciones.`);
    }
    const skills = sincronizar(mods, config);
    console.log(`Skills activas (${skills.length}): ${skills.join(", ")}. Si tu app ya estaba abierta, empieza una conversación nueva para que las vea.`);
  } else if (orden === "sincronizar") {
    const skills = sincronizar(mods, config);
    console.log(`   skills activas: ${skills.length} (en .agents/skills y .claude/skills)`);
  } else {
    salir("Órdenes: lista, activar <id>, apagar <id>, sincronizar");
  }
}
