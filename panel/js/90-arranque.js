// ---------- Barra superior, navegación, refresco y eventos ----------
function pintarBarra() {
  var z = $("#zona-marca"), m = marcaVista();
  if (!E.marcas.length) z.innerHTML = '<span class="muted">Todavía no hay ninguna marca</span>';
  else if (E.marcas.length === 1) z.innerHTML = '<div class="marca-unica">' + logoTile(m, m.logo, 32) + esc(m.nombre) + "</div>";
  else z.innerHTML = '<label class="selector"><span class="eyebrow">Revisando</span><select id="sel-marca">' + E.marcas.map(function (x) {
    return '<option value="' + esc(x.id) + '"' + (x.id === m.id ? " selected" : "") + ">" + esc(x.nombre) + (x.activa ? " (activa)" : "") + "</option>";
  }).join("") + "</select></label>";
  $("#chip-version").textContent = "v" + E.sistema.version;
  $("#ruta-sistema").textContent = E.sistema.raiz;
  var L = listaPasos(m), faltan = L.filter(function (p) { return !p.hecho && !p.opcional && !p.enviado; }).length, sig = pasoActual(L), cs = $("#chip-sig");
  $("#cuenta-pasos").textContent = faltan; $("#cuenta-pasos").hidden = !faltan;
  $("#cuenta-bandeja").textContent = E.bandeja.length; $("#cuenta-bandeja").hidden = !E.bandeja.length;
  var esperan = m ? m.pedidos.filter(function (p) { return p.estado === "con preguntas"; }).length : 0;
  $("#cuenta-pedidos").textContent = esperan; $("#cuenta-pedidos").hidden = !esperan;
  cs.hidden = !sig || actual() === "inicio"; if (sig) { cs.textContent = "Siguiente paso: " + sig.t; cs.dataset.irpaso = sig.id; }
  var cn = $("#chip-nueva");
  if (ui.version && ui.version.nueva) { cn.textContent = "Versión " + ui.version.nueva + " disponible"; cn.hidden = false; } else cn.hidden = true;
}

var nombres = ["inicio", "pedidos", "manual", "verificar", "subir", "mantenimiento"];
function actual() {
  var h = location.hash.replace("#", "").split("/");
  if (h[0] === "verificar" && ["marca", "plan", "videos"].indexOf(h[1]) >= 0) ui.tabVer = h[1];
  return nombres.indexOf(h[0]) >= 0 ? h[0] : "inicio";
}
function irA(v) { if (actual() !== v) location.hash = "#" + v; else render(); }
function render() {
  if (!E) return;
  var v = actual();
  document.querySelectorAll(".nav a").forEach(function (a) { if (a.dataset.vista === v) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
  var foco = document.activeElement && document.activeElement.id;
  $("#vista").innerHTML = vistas[v]();
  ui.porRender = false;
  if (v === "verificar" && ui.tabVer === "marca" && ui.subMarca === "visual") pintarPantalla();
  if (v === "subir") prepararZona($("#soltar"), $("#archivos-in"), function (files) { encolar(files, null); });
  if (v === "inicio") prepararPaso();
  if (v === "pedidos") prepararPedidos();
  if (v === "mantenimiento" && !ui.almacen) cargarAlmacen();
  pintarBarra();
  if (foco && document.getElementById(foco)) document.getElementById(foco).focus();
  if (tourI !== -1) posicionarTour();
}
// Mientras la persona escribe o llena un formulario, el refresco no redibuja (no pierde lo escrito ni el cursor)
function editando() {
  var a = document.activeElement;
  return !!(ui.form || nm || (ui.arm && ui.arm.edit)) || !!(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.closest("#vista") && a.type !== "checkbox" && a.type !== "radio");
}
function refrescar() {
  // textoE vacío = lo pidió una acción del panel (guardar, crear, subir): se redibuja aunque haya un campo con el cursor
  var forzado = textoE === "";
  return api("/api/estado").then(function (d) {
    $("#aviso").hidden = true;
    var t = JSON.stringify(d);
    if (t === textoE) return;
    textoE = t; E = d;
    if (ui.marca && !E.marcas.some(function (m) { return m.id === ui.marca; })) ui.marca = null;
    if (!forzado && editando()) { ui.porRender = true; pintarBarra(); return; }
    if (forzado && document.activeElement && document.activeElement.closest && document.activeElement.closest("#vista")) document.activeElement.blur();
    render();
  }).catch(function () {
    var a = $("#aviso"); a.textContent = "El panel se apagó (se cerró su ventana negra). Ábrelo de nuevo con Panel.bat."; a.hidden = false;
  });
}
window.addEventListener("hashchange", function () { cerrarCapas(); if (tourI === -2) cerrarGuia(); ui.pendiente = null; if (ui.arm && ui.arm.donde !== "paso") ui.arm = null; render(); window.scrollTo(0, 0); });
setInterval(function () { if (!document.hidden && !ui.pendiente && !$("#capas").innerHTML) refrescar(); }, 4000);
document.addEventListener("visibilitychange", function () { if (!document.hidden) refrescar(); });
document.addEventListener("focusout", function () { setTimeout(function () { if (ui.porRender && !editando() && !$("#capas").innerHTML) render(); }, 200); });
window.addEventListener("beforeunload", function (e) { if (ui.subiendo || ui.form) { e.preventDefault(); e.returnValue = ""; } });

document.addEventListener("click", function (e) {
  var t = e.target.closest("button, [data-cerrar]");
  if (!t) return;
  var d = t.dataset;
  if (d.cerrar) { cerrarCapas(); if (ui.porRender) render(); return; }
  if (d.copiarRuta) {
    var hecho = function () { toast("Ruta copiada. Pégala con Ctrl+V donde tu app te pida la carpeta."); };
    if (navigator.clipboard) navigator.clipboard.writeText(E.sistema.raiz).then(hecho, function () { toast(E.sistema.raiz); }); else toast(E.sistema.raiz);
    return;
  }
  if (d.abrir) { abrir(d.abrir); return; }
  if (d.tema) { ui.tema = d.tema; recordar(); render(); return; }
  if (d.guia) { ui.tema = "mod:" + d.guia; recordar(); irA("manual"); return; }
  if (d.cancelar) { ui.pendiente = null; render(); return; }
  if (d.activar) { cerrarGuia(); cambiarModulo(d.activar, "activar"); return; }
  if (d.app) { api("/api/ajustes", { app: d.app }).then(function (r) { if (r.error) toast(r.error); else { toast("Listo: el manual y los pasos ahora son para " + d.app + "."); textoE = ""; refrescar(); } }); return; }
  if (d.ventana) { api("/api/ventana", { que: d.ventana }).then(function (r) { cerrarCapas(); toast(r.error || "Se abrió una ventana: sigue ahí. Este panel se actualiza solo."); }); return; }
  if (t.id === "btn-actualizar") { confirmarVentana("actualizar"); return; }
  if (t.id === "btn-reparar") { confirmarVentana("reparar"); return; }
  if (t.id === "btn-buscar") { buscarVersion(); render(); return; }
  if (clicInicio(t, d) || clicPaleta(t, d) || clicPedidos(t, d) || clicVerificar(t, d) || clicMantenimiento(t, d)) return;
});
function cambiarModulo(id, accion) {
  ui.pendiente = null; ui.ocupado = id; render();
  api("/api/modulo", { id: id, accion: accion }).then(function (r) {
    ui.ocupado = null;
    if (r.error) toast(r.error); else toast((r.mensaje || "Listo.").split("\n")[0] + " " + appInfo().nueva);
    textoE = ""; refrescar();
  }).catch(function () { ui.ocupado = null; toast("No se pudo cambiar."); render(); });
}
document.addEventListener("change", function (e) {
  var t = e.target;
  if (t.id === "sel-marca") { ui.marca = t.value; ui.mes = null; ui.arm = null; recordar(); render(); return; }
  if (t.id === "sel-mes") { ui.mes = t.value; render(); return; }
  if (t.dataset && t.dataset.mod) {
    var id = t.dataset.mod;
    if (t.checked) { t.checked = false; ui.pendiente = id; render(); var b = $('[data-activar="' + id + '"]'); if (b) b.focus(); }
    else cambiarModulo(id, "apagar");
    return;
  }
  if (cambioMantenimiento(t)) return;
  cambioPedido(t);
});
document.addEventListener("keydown", function (e) { if (e.key === "Escape") { cerrarCapas(); if (ui.pendiente) { ui.pendiente = null; render(); } } });

refrescar().then(function () {
  if (E && E.sistema.repositorio) buscarVersion();
  var visto = false; try { visto = localStorage.getItem("panel-recorrido-visto") === "1"; } catch (e) { visto = false; }
  if (E && !visto) setTimeout(iniciarTour, 600);
});
