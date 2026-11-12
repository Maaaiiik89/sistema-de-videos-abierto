// Panel del sistema de videos. Lee el estado de la carpeta (/api/estado) cada pocos segundos y lo muestra.
// No le habla al agente: lo que cambia el agente aparece aquí solo; lo que subes o pides queda en la carpeta.
// Este archivo y los demás de panel/js/ se sirven unidos, en orden, dentro de una sola función.
var $ = function (s, r) { return (r || document).querySelector(s); };
var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
var TOKEN = $('meta[name="panel-token"]').content;
var DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
var ETAPAS = ["Idea", "Guion", "Grabar", "Editar", "Revisar", "Listo", "Publicado"];
var COLORES = ["#2E6BE6", "#D9622B", "#1E9E61", "#9B4DE0", "#C23B7A", "#0E8C99", "#8A6D1F", "#5B6170"];

var E = null, textoE = "";
var vistas = {};
var ui = { marca: null, tabVer: "marca", subMarca: "ficha", tema: "como", mes: null, abiertos: {}, pendiente: null, ocupado: null, subidas: [], subiendo: false, version: null, almacen: null };
try { var g = JSON.parse(localStorage.getItem("panel-videos") || "{}"); if (g.tabVer) ui.tabVer = g.tabVer; if (g.tema) ui.tema = g.tema; if (g.marca) ui.marca = g.marca; if (g.subMarca) ui.subMarca = g.subMarca; } catch (e) { }
function recordar() { try { localStorage.setItem("panel-videos", JSON.stringify({ tabVer: ui.tabVer, tema: ui.tema, marca: ui.marca, subMarca: ui.subMarca })); } catch (e) { } }

// ---------- Utilidades ----------
function api(ruta, cuerpo) {
  var op = cuerpo ? { method: "POST", headers: { "Content-Type": "application/json", "X-Panel-Token": TOKEN }, body: JSON.stringify(cuerpo) } : { cache: "no-store" };
  return fetch(ruta, op).then(function (r) { return r.json(); });
}
var toastT;
function toast(msg) {
  var t = $(".toast"); if (t) t.remove();
  t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg;
  document.body.appendChild(t); clearTimeout(toastT); toastT = setTimeout(function () { t.remove(); }, 4200);
}
function abrir(ruta, aviso) { api("/api/abrir", { ruta: ruta }).then(function (r) { toast(r.error || aviso || "Abriendo…"); }); }
function archivo(ruta) { return "/archivo?r=" + encodeURIComponent(ruta); }
function cerrarCapas() { $("#capas").innerHTML = ""; }
function norm(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim(); }
function tam(n) { return n >= 1073741824 ? (n / 1073741824).toFixed(1).replace(".", ",") + " GB" : n >= 1048576 ? (n / 1048576).toFixed(1).replace(".", ",") + " MB" : Math.max(1, Math.round(n / 1024)) + " KB"; }
function slug(s) { return norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50); }
function iniciales(n) { return String(n).split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join("").toUpperCase(); }
function hoyISO() { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }

// ---------- Color y contraste (las mismas reglas que herramientas/paleta.mjs) ----------
function rgb(hex) { var n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function lum(hex) { return rgb(hex).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }).reduce(function (a, v, i) { return a + v * [0.2126, 0.7152, 0.0722][i]; }, 0); }
function ratio(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
function tinta(hex) { return 1.05 / (lum(hex) + 0.05) >= 3 ? "#FFFFFF" : "#111111"; }
function pruebasDe(p) {
  return [["texto sobre fondo", ratio(p.texto, p.fondo), 4.5], ["acento sobre fondo", ratio(p.acento, p.fondo), 3], ["palabra marcada en subtítulos", ratio(tinta(p.acento), p.acento), 3], ["acento 2 sobre fondo", ratio(p.acento2, p.fondo), 3]]
    .map(function (x) { return { prueba: x[0], ratio: Math.round(x[1] * 10) / 10, minimo: x[2], pasa: x[1] >= x[2] }; });
}
function pasaTodo(p) { return (p.pruebas || pruebasDe(p)).every(function (x) { return x.pasa; }); }
function chipsPruebas(p) {
  var nombres = { "texto sobre fondo": "Texto", "acento sobre fondo": "Acento", "palabra marcada en subtítulos": "Subtítulo marcado", "acento 2 sobre fondo": "Acento 2" };
  return (p.pruebas || pruebasDe(p)).map(function (x) { return '<span class="pill ' + (x.pasa ? "p-ok" : "p-warn") + '" title="Mínimo ' + String(x.minimo).replace(".", ",") + ':1">' + (nombres[x.prueba] || x.prueba) + " " + String(x.ratio).replace(".", ",") + ":1</span>"; }).join("");
}
function muestras(p) {
  return '<div class="muestras">' + [["fondo", p.fondo], ["fondo 2", p.fondo2], ["texto", p.texto], ["acento", p.acento], ["acento 2", p.acento2]].map(function (x) {
    return '<span style="background:' + x[1] + ";color:" + tinta(x[1]) + '" title="' + x[0] + " " + x[1] + '">' + x[1] + "</span>";
  }).join("") + "</div>";
}
function pillPasa(p) { return pasaTodo(p) ? '<span class="pill p-ok">Pasa las 4 pruebas</span>' : '<span class="pill p-warn">Revisar contraste</span>'; }

// ---------- Texto ----------
// Texto de la ficha: `código`, **negrita**, [texto](https://...)
function fmt(s) {
  return esc(s).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a class="enlace" href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}
function vacioV(s) { var v = String(s || "").trim(); return !v || /^\(ej\./i.test(v) || /^\(preguntar\)$/i.test(v); }
function valor(s, hint) { return vacioV(s) ? '<span class="valor-vacio">Sin completar' + (hint ? " · " + esc(hint) : "") + "</span>" : fmt(s); }
function decile(t) { return '<div class="decile"><span class="eyebrow">Qué decirle al agente</span><q>' + esc(t) + "</q></div>"; }
function vacio(titulo, texto, dec) { return '<div class="estado-vacio"><strong>' + esc(titulo) + '</strong><span class="muted">' + texto + "</span>" + (dec ? decile(dec) : "") + "</div>"; }

// Markdown simple para las guías de los módulos y las novedades
function md(t) {
  var L = String(t || "").replace(/\r/g, "").split("\n"), out = [], i = 0, primero = true;
  var bloque = /^(#{1,4}\s|\s*\||\s*[-*]\s|\s*\d+[.)]\s|>|```)/;
  while (i < L.length) {
    var l = L[i];
    if (!l.trim()) { i++; continue; }
    var h = l.match(/^(#{1,4})\s+(.*)/);
    if (h) { if (!(primero && h[1].length === 1)) { var n = Math.min(4, h[1].length + 1); out.push("<h" + n + ">" + fmt(h[2]) + "</h" + n + ">"); } primero = false; i++; continue; }
    primero = false;
    if (/^```/.test(l)) { var c = []; i++; while (i < L.length && !/^```/.test(L[i])) c.push(L[i++]); i++; out.push('<pre class="arbol">' + esc(c.join("\n")) + "</pre>"); continue; }
    if (/^\s*\|/.test(l)) {
      var filas = []; while (i < L.length && /^\s*\|/.test(L[i])) filas.push(L[i++]);
      filas = filas.map(function (f) { return f.trim().replace(/^\||\|$/g, "").split("|").map(function (x) { return x.trim(); }); }).filter(function (f) { return !f.every(function (x) { return /^:?-{2,}:?$/.test(x); }); });
      out.push('<div class="tabla-wrap"><table><thead><tr>' + filas[0].map(function (x) { return "<th>" + fmt(x) + "</th>"; }).join("") + "</tr></thead><tbody>" +
        filas.slice(1).map(function (f) { return "<tr>" + f.map(function (x) { return "<td>" + fmt(x) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>");
      continue;
    }
    if (/^\s*[-*]\s+/.test(l)) { var it = []; while (i < L.length && /^\s*[-*]\s+/.test(L[i])) it.push("<li>" + fmt(L[i++].replace(/^\s*[-*]\s+/, "")) + "</li>"); out.push("<ul>" + it.join("") + "</ul>"); continue; }
    if (/^\s*\d+[.)]\s+/.test(l)) { var ol = []; while (i < L.length && /^\s*\d+[.)]\s+/.test(L[i])) ol.push("<li>" + fmt(L[i++].replace(/^\s*\d+[.)]\s+/, "")) + "</li>"); out.push("<ol>" + ol.join("") + "</ol>"); continue; }
    if (/^>/.test(l)) { var q = []; while (i < L.length && /^>/.test(L[i])) q.push(L[i++].replace(/^>\s?/, "")); out.push("<blockquote>" + fmt(q.join(" ")) + "</blockquote>"); continue; }
    var p = []; while (i < L.length && L[i].trim() && !bloque.test(L[i])) p.push(L[i++]);
    out.push("<p>" + fmt(p.join(" ")) + "</p>");
  }
  return '<div class="guia">' + out.join("") + "</div>";
}

// ---------- Estado ----------
function marcaVista() {
  if (!E || !E.marcas.length) return null;
  var m = E.marcas.filter(function (x) { return x.id === ui.marca; })[0];
  return m || E.marcas.filter(function (x) { return x.id === E.activa; })[0] || E.marcas[0];
}
function moduloActivo(id) { return E.modulos.some(function (m) { return m.id === id && m.activo; }); }
function appNombre() { return E && E.app ? E.app : "tu app"; }

// ---------- Tu app: lo que cambia entre Claude, ChatGPT (Codex) y Antigravity ----------
var APPS = {
  Claude: { abrir: ["Abre la app de Claude e inicia sesión (plan Pro o superior).", "Entra a la pestaña «Code».", "Elige la carpeta del sistema como proyecto."],
    permiso: "La primera vez te pide permiso para el editor de video (video-editor): elige Permitir.",
    nueva: "Después de encender o apagar una herramienta, empieza una sesión nueva para que el agente la vea.",
    falla: "Si el agente no ve el editor de video, cierra y vuelve a abrir la app." },
  ChatGPT: { abrir: ["Abre la app de ChatGPT e inicia sesión.", "Entra a Codex y toca «Add new project» (o Ctrl+O).", "Elige la carpeta del sistema y márcala como de confianza."],
    permiso: "Si no marcas la carpeta como de confianza, el agente no puede usar el editor de video.",
    nueva: "Después de encender o apagar una herramienta, abre un hilo nuevo para que el agente la vea.",
    falla: "Si el agente no ve el editor de video, revisa que la carpeta esté marcada como de confianza y reinicia la app." },
  Antigravity: { abrir: ["Abre Antigravity e inicia sesión con tu cuenta de Google.", "Abre la carpeta del sistema como espacio de trabajo (workspace).", "Si pregunta si confías en la carpeta, di que sí."],
    permiso: "Si pregunta por el editor de video o por correr herramientas de esta carpeta, acepta. Si pide algo fuera de la carpeta, no.",
    nueva: "Después de encender o apagar una herramienta, abre una conversación nueva para que el agente la vea.",
    falla: "Si el agente no ve el editor de video, confía en la carpeta y vuelve a abrirla." },
  "": { abrir: ["Abre tu app (Claude, ChatGPT o Antigravity) e inicia sesión.", "Abre la carpeta del sistema como proyecto.", "Si pregunta si confías en la carpeta, di que sí."],
    permiso: "La primera vez te pide permiso para el editor de video: acéptalo. Si pide algo fuera de la carpeta, no.",
    nueva: "Después de encender o apagar una herramienta, empieza una conversación nueva para que el agente la vea.",
    falla: "Si el agente no ve el editor de video, cierra y vuelve a abrir la app." }
};
function appInfo() { return APPS[E && E.app] || APPS[""]; }
function selectorApp() {
  return '<div class="segmentos" role="group" aria-label="App con la que trabajas">' + ["Claude", "ChatGPT", "Antigravity"].map(function (a) { return '<button type="button" data-app="' + a + '" aria-pressed="' + (E.app === a) + '">' + a + "</button>"; }).join("") + "</div>";
}
function pasosMan(l) { return '<ol class="pasos-man">' + l.map(function (x) { return "<li><span>" + x + "</span></li>"; }).join("") + "</ol>"; }
function cajaApp(texto) { return '<div class="caja-app"><span class="eyebrow" style="color:var(--accent)">En ' + esc(appNombre()) + "</span>" + texto + "</div>"; }
function irPanel(txt, hash) { return '<a class="tarjeta enlace-panel" href="#' + hash + '"><span class="eyebrow">En el panel</span><strong>' + txt + "</strong></a>"; }
