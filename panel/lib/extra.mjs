// Lo que agrega la versión 0.5 al panel: referencias, versiones del logo, elementos reutilizables,
// novedades (CHANGELOG.md), y las acciones que escriben: crear una marca, aplicar una paleta,
// un campo puntual de la ficha y los pedidos de video.
import { statSync } from "node:fs";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { RAIZ, listaMarcas, dirMarca, slug, ponerCampoFicha, celda } from "../../herramientas/lib/sistema.mjs";
import { pruebas } from "../../herramientas/paleta.mjs";
import { CAMPOS, crearPedido, leerPedido, escribirPedido, pedidosDeMarca, responder } from "../../herramientas/lib/pedidos.mjs";
import { leer, esArchivo, visibles, relRaiz, filasTabla, porSecciones, buscarSeccion } from "./util.mjs";

const NODE = process.execPath;
const correr = (args, timeout = 60000) => new Promise((ok) => {
  execFile(NODE, args, { cwd: RAIZ, timeout, windowsHide: true }, (err, out, errOut) => ok(err ? { error: String(errOut || out || err.message).trim().split("\n").slice(-3).join(" ") } : { ok: true, salida: String(out).trim() }));
});
const marcaValida = (id) => typeof id === "string" && listaMarcas().includes(id);

// ------------------------------------------------------------------ lectura
const IMAGEN = /\.(svg|png|jpe?g|webp|gif)$/i;
export function logosDeMarca(d, esEjemplo) {
  const dir = join(d.estilo, "assets", "logo");
  const propios = visibles(dir).filter((f) => IMAGEN.test(f) && esArchivo(join(dir, f)) && !esEjemplo(dir, f))
    .sort((a, b) => statSync(join(dir, b)).mtimeMs - statSync(join(dir, a)).mtimeMs);
  const es = (re) => propios.find((f) => re.test(f));
  const oscuro = es(/oscuro|dark|negativ|blanco|white/i), icono = es(/icono|isotipo|icon|simbolo|símbolo|favicon/i);
  const principal = propios.find((f) => f !== oscuro && f !== icono) || null;
  const r = (f) => (f ? relRaiz(join(dir, f)) : null);
  return { principal: r(principal), oscuro: r(oscuro), icono: r(icono) };
}
export function bloquesDeMarca(d) {
  const dir = join(d.estilo, "bloques");
  return visibles(dir).filter((f) => !/^(leeme|readme)/i.test(f)).map((f) => ({ nombre: f.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " "), ruta: relRaiz(join(dir, f)) }));
}
export function referenciasDeMarca(d) {
  return visibles(d.referencias).filter((c) => esArchivo(join(d.referencias, c, "referencia.md"))).map((c) => {
    const dir = join(d.referencias, c), t = leer(join(dir, "referencia.md")), secc = porSecciones(t);
    const tabla = (s) => Object.fromEntries(s ? filasTabla(s.lineas).filter((x) => x[0] !== "Dato").map((x) => [x[0], x.slice(1).join(" | ")]) : []);
    const datos = tabla(secc[0]), analisis = tabla(buscarSeccion(secc, /^analisis/));
    const toma = (buscarSeccion(secc, /^lo que se toma/) || { lineas: [] }).lineas.map((l) => l.trim()).filter((l) => /^[-*]\s/.test(l)).map((l) => l.replace(/^[-*]\s+/, ""));
    return {
      id: c, titulo: ((t.match(/^#\s+Referencia:\s*(.+)$/m) || [])[1] || c).trim(), fuente: datos.Fuente || "", red: datos.Red || "", cuenta: datos.Cuenta || "",
      gusta: (datos["Qué le gusta a la persona"] || "").replace(/^\(preguntar\)$/, ""), analisis, toma,
      cuadros: esArchivo(join(dir, "cuadros.jpg")) ? relRaiz(join(dir, "cuadros.jpg")) : null
    };
  });
}
// Novedades: las secciones de CHANGELOG.md ("## …"), con su texto en Markdown
export function cambios() {
  return porSecciones(leer(join(RAIZ, "CHANGELOG.md"))).filter((s) => s.titulo).slice(0, 8)
    .map((s) => ({ titulo: s.titulo, md: s.lineas.join("\n").trim() })).filter((s) => s.md);
}
export function pedidosParaPanel(id) {
  return pedidosDeMarca(id).map((p) => {
    const est = (filasTabla(leer(join(p.dir, "LEEME.md")).split(/\r?\n/)).find((c) => c[0] === "Estado") || [])[1] || "";
    const entregado = /^entregado/i.test(est) || p.estado === "entregado";
    return { carpeta: p.carpeta, ruta: relRaiz(p.dir), titulo: p.titulo, estado: entregado ? "entregado" : p.estado, origen: p.origen, creado: p.creado,
      etapaVideo: est.toLowerCase(), datos: p.datos, refs: p.refs, archivos: p.archivos, notas: p.notas, revision: p.revision, preguntas: p.preguntas };
  });
}

// ------------------------------------------------------------------ acciones
export async function crearMarca(b) {
  const nombre = celda(b.nombre, 80), rubro = celda(b.rubro, 200);
  if (!nombre || !rubro) return { error: "Falta el nombre y a qué se dedica." };
  const id = slug(nombre);
  if (!id) return { error: "El nombre necesita letras o números." };
  if (listaMarcas().includes(id)) return { error: `Ya existe una marca con ese nombre (${id}).` };
  const r = await correr([join(RAIZ, "herramientas", "marcas.mjs"), "nueva", nombre]);
  if (r.error) return r;
  ponerCampoFicha(id, "A qué se dedica", rubro, "Negocio");
  if (b.publico) ponerCampoFicha(id, "A quién le habla", celda(b.publico, 200), "Negocio");
  if (b.redes) ponerCampoFicha(id, "Web y redes", celda(b.redes, 300), "Negocio");
  if (b.trato === "Tú" || b.trato === "Usted") ponerCampoFicha(id, "Tú o usted", b.trato, "Cómo habla");
  return { ok: true, id };
}

const HEX = /^#[0-9a-fA-F]{6}$/;
export async function aplicarPaleta(b) {
  if (!marcaValida(b.marca)) return { error: "Marca desconocida." };
  const p = {};
  for (const k of ["fondo", "fondo2", "texto", "acento", "acento2"]) { if (!HEX.test(b[k] || "")) return { error: `Color no válido: ${k}.` }; p[k] = b[k].toUpperCase(); }
  if (!pruebas(p).every((x) => x.pasa)) return { error: "La paleta no pasa las 4 pruebas de contraste: usa «Arreglar el contraste»." };
  return correr([join(RAIZ, "herramientas", "paleta.mjs"), "aplicar", "--marca", b.marca, ...Object.entries(p).flatMap(([k, v]) => ["--" + k, v])]);
}

// Campos de la ficha que el panel puede escribir (los demás se conversan con el agente)
const FICHA_PANEL = { "¿Tiene personaje?": ["no", "sí"] };
export function ponerFicha(b) {
  if (!marcaValida(b.marca)) return { error: "Marca desconocida." };
  const permitidos = FICHA_PANEL[b.campo];
  if (!permitidos || !permitidos.includes(b.valor)) return { error: "Ese campo se cambia conversando con el agente." };
  ponerCampoFicha(b.marca, b.campo, b.valor, "Personaje");
  return { ok: true };
}

// Pedido desde el formulario. Si trae "carpeta", actualiza ese borrador (solo si sigue en borrador).
export function guardarPedido(b) {
  if (!marcaValida(b.marca)) return { error: "Marca desconocida." };
  const titulo = celda(b.titulo, 120);
  if (!titulo) return { error: "Falta el nombre del video." };
  const enviar = !!b.enviar;
  const datos = {};
  for (const [, et] of CAMPOS) if (b.datos && b.datos[et] != null) datos[et] = celda(b.datos[et], 600);
  if (datos.Publicar && !/^\d{4}-\d{2}-\d{2}$/.test(datos.Publicar)) datos.Publicar = "";
  if (enviar && (!datos.Tipo || !datos.Mensaje || !datos.Redes)) return { error: "Para enviarlo falta el tipo, el mensaje o dónde se publica." };
  const refs = (Array.isArray(b.refs) ? b.refs : []).slice(0, 10).map((r) => ({ link: celda(r.link, 300), gusta: celda(r.gusta, 300) }))
    .filter((r) => /^https:\/\/[^\s]+$/i.test(r.link));
  const notas = celda(b.notas, 2000), estado = enviar ? "enviado" : "borrador";
  if (b.carpeta) {
    if (!/^[\w.-]+$/.test(b.carpeta)) return { error: "Carpeta no válida." };
    const dir = join(dirMarca(b.marca).videos, b.carpeta), p = leerPedido(dir);
    if (!p || p.estado !== "borrador") return { error: "Ese pedido ya no es un borrador." };
    escribirPedido(dir, { ...p, titulo, estado, origen: "panel", datos, refs, notas });
    return { ok: true, carpeta: b.carpeta };
  }
  const { carpeta } = crearPedido(b.marca, { titulo, estado, origen: "panel", datos, refs, notas });
  return { ok: true, carpeta };
}
export function responderPedido(b) {
  if (!marcaValida(b.marca) || !/^[\w.-]+$/.test(b.carpeta || "")) return { error: "Pedido desconocido." };
  const dir = join(dirMarca(b.marca).videos, b.carpeta);
  if (!esArchivo(join(dir, "PEDIDO.md"))) return { error: "No encuentro el pedido." };
  const p = responder(dir, b.respuestas);
  return { ok: true, estado: p.estado };
}
// Destino de una subida que no va a la bandeja: el logo de una marca o las fuentes de un pedido
export function destinoSubida(marca, tipo, carpeta) {
  if (!marcaValida(marca)) return { error: "Marca desconocida." };
  const d = dirMarca(marca);
  if (tipo === "logo") return { dir: join(d.estilo, "assets", "logo") };
  if (tipo === "fuente") {
    if (!/^[\w.-]+$/.test(carpeta || "")) return { error: "Pedido desconocido." };
    const dir = join(d.videos, carpeta);
    if (!esArchivo(join(dir, "PEDIDO.md"))) return { error: "No encuentro el pedido." };
    return { dir: join(dir, "fuentes"), pedido: dir };
  }
  return { error: "Destino desconocido." };
}
