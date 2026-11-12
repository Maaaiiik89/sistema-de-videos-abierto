// Almacenamiento: cuánto ocupa cada cosa de mis-videos y qué se puede liberar.
// Nada se borra solo: el panel muestra sugerencias y la persona confirma. Lo liberado va a la Papelera
// de reciclaje de Windows (se puede recuperar) y queda anotado en el registro de archivos.
import { existsSync, statSync, statfsSync, appendFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { RAIZ, DATOS, BANDEJA, REGISTRO, listaMarcas, dirMarca, hoy } from "../../herramientas/lib/sistema.mjs";
import { leer, esDir, esArchivo, visibles, relRaiz, dentroDe, filasTabla } from "./util.mjs";

const RESPALDOS = join(RAIZ, ".respaldos");
const MEDIA = /\.(mp4|mov|mkv|webm|avi|m4v|wav|m4a|mp3|aac|flac|ogg)$/i;
const DIAS30 = 30 * 24 * 3600e3;

// Tamaño de un archivo o carpeta (con lo oculto: .venv, .hyperframes). Límite de profundidad por si hay enlaces en bucle.
function peso(p, prof = 0) {
  try {
    const s = statSync(p);
    if (s.isFile()) return s.size;
    if (!s.isDirectory() || prof > 12) return 0;
    let n = 0;
    for (const f of readdirSync(p)) n += peso(join(p, f), prof + 1);
    return n;
  } catch { return 0; }
}

function estadoVideo(dir) {
  for (const c of filasTabla(leer(join(dir, "LEEME.md")).split(/\r?\n/))) if (c[0] === "Estado") return (c[1] || "").toLowerCase();
  return "";
}
function videos() {
  const out = [];
  for (const m of listaMarcas()) {
    const v = dirMarca(m).videos;
    for (const c of visibles(v)) {
      const dir = join(v, c); if (!esDir(dir)) continue;
      let t = 0; try { t = statSync(dir).mtimeMs; } catch { }
      out.push({ marca: m, carpeta: c, dir, entregado: /^entregado/.test(estadoVideo(dir)), mtime: t });
    }
  }
  return out;
}

export function medir() {
  const cats = { grabaciones: 0, enCurso: 0, entregados: 0, referencias: 0, bandeja: 0, otros: 0, respaldos: 0, programas: 0 };
  for (const m of listaMarcas()) {
    const d = dirMarca(m);
    cats.grabaciones += peso(d.grabaciones);
    cats.referencias += peso(d.referencias);
    for (const f of visibles(d.raiz)) if (!["grabaciones", "referencias", "videos"].includes(f)) cats.otros += peso(join(d.raiz, f));
  }
  for (const v of videos()) {
    const fuentes = peso(join(v.dir, "fuentes")), total = peso(v.dir);
    cats.grabaciones += fuentes;
    cats[v.entregado ? "entregados" : "enCurso"] += total - fuentes;
  }
  cats.bandeja = peso(BANDEJA);
  cats.respaldos = peso(RESPALDOS);
  for (const p of [join(RAIZ, "mcp-video", ".venv")].concat(visibles(join(RAIZ, "modulos")).map((m) => join(RAIZ, "modulos", m, "entorno", ".venv")))) cats.programas += peso(p);
  let libre = null;
  try { const s = statfsSync(RAIZ); libre = s.bavail * s.bsize; } catch { }
  return { cats, libre };
}

// Grupos que se pueden liberar, de lo más seguro a lo más delicado
export function sugerencias() {
  const grupos = [];
  const vids = videos(), item = (p) => ({ ruta: relRaiz(p), tam: peso(p) });
  const borr = [];
  for (const v of vids.filter((x) => x.entregado)) for (const f of visibles(join(v.dir, "entregas"))) if (/borrador|muestra/i.test(f) && esArchivo(join(v.dir, "entregas", f))) borr.push(item(join(v.dir, "entregas", f)));
  if (borr.length) grupos.push({ id: "borradores", titulo: `Borradores y muestras de videos entregados`, seguro: true, queda: "Los videos finales, los pedidos y los guiones.", items: borr });
  const refs = [];
  for (const m of listaMarcas()) { const r = dirMarca(m).referencias; for (const c of visibles(r)) for (const f of visibles(join(r, c))) if (/^video\./i.test(f) && esArchivo(join(r, c, f))) refs.push(item(join(r, c, f))); }
  if (refs.length) grupos.push({ id: "referencias", titulo: `Videos de ${refs.length} referencia${refs.length === 1 ? "" : "s"}`, seguro: true, queda: "Su análisis y la imagen con 12 cuadros: es lo que usa el agente.", items: refs });
  const resp = visibles(RESPALDOS).map((f) => join(RESPALDOS, f)).filter(esDir).sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs).slice(1);
  if (resp.length) grupos.push({ id: "respaldos", titulo: `${resp.length} respaldo${resp.length === 1 ? "" : "s"} viejo${resp.length === 1 ? "" : "s"} del sistema`, seguro: true, queda: "El último respaldo.", items: resp.map(item) });
  const orig = [];
  for (const v of vids.filter((x) => x.entregado && Date.now() - x.mtime > DIAS30)) for (const f of visibles(join(v.dir, "fuentes"))) if (MEDIA.test(f) && esArchivo(join(v.dir, "fuentes", f))) orig.push(item(join(v.dir, "fuentes", f)));
  if (orig.length) grupos.push({ id: "originales", titulo: "Grabaciones originales de videos entregados hace más de 30 días", seguro: false, queda: "Los videos finales y los pedidos. Ya no podrás rehacer esos videos desde cero.", items: orig });
  return grupos.map((g) => ({ ...g, total: g.items.reduce((a, i) => a + i.tam, 0) }));
}

// Manda a la Papelera solo rutas que estén en el grupo pedido (recalculado aquí, no lo que diga la página)
export function liberar(grupo, rutas, entiendo) {
  return new Promise((ok) => {
    const g = sugerencias().find((x) => x.id === grupo);
    if (!g) return ok({ error: "Ese grupo ya no tiene nada para liberar." });
    if (!g.seguro && !entiendo) return ok({ error: "Falta confirmar que entiendes lo que se pierde." });
    const pedidas = new Set((rutas || []).map(String));
    const elegidos = g.items.filter((i) => pedidas.has(i.ruta)).map((i) => ({ ...i, abs: resolve(RAIZ, i.ruta) }))
      .filter((i) => dentroDe(DATOS, i.abs) || dentroDe(RESPALDOS, i.abs));
    if (!elegidos.length) return ok({ error: "No hay nada marcado." });
    const lista = elegidos.map((i) => "'" + i.abs.replace(/'/g, "''") + "'").join(",");
    const ps = "$ErrorActionPreference='Stop'; Add-Type -AssemblyName Microsoft.VisualBasic; " +
      `foreach ($p in @(${lista})) { if (Test-Path -LiteralPath $p -PathType Container) { [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory($p,'OnlyErrorDialogs','SendToRecycleBin') } elseif (Test-Path -LiteralPath $p) { [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile($p,'OnlyErrorDialogs','SendToRecycleBin') } }`;
    execFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(ps, "utf16le").toString("base64")], { timeout: 120000, windowsHide: true }, (err, _o, errOut) => {
      const quedaron = elegidos.filter((i) => existsSync(i.abs)), idas = elegidos.filter((i) => !existsSync(i.abs));
      if (idas.length) {
        if (!existsSync(REGISTRO)) writeFileSync(REGISTRO, "# Registro de archivos\n\nQué movió el agente desde la bandeja y a dónde, y qué se mandó a la Papelera desde el panel.\n\n| Fecha | Archivo original | Quedó en |\n| --- | --- | --- |\n");
        for (const i of idas) appendFileSync(REGISTRO, `| ${hoy()} | ${i.ruta} | Papelera de reciclaje (liberar espacio desde el panel; se puede recuperar) |\n`);
      }
      const liberado = idas.reduce((a, i) => a + i.tam, 0);
      if (err && !idas.length) return ok({ error: "No se pudo mandar a la Papelera: " + String(errOut || err.message).trim().split("\n")[0] });
      ok({ ok: true, liberado, cuantos: idas.length, fallaron: quedaron.map((i) => i.ruta) });
    });
  });
}
