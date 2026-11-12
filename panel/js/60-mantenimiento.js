// ---------- Mantenimiento: versión, novedades, instalación, almacenamiento, herramientas y ajustes ----------
vistas.mantenimiento = function () {
  var html = '<div class="cabeza"><span class="eyebrow">Mantenimiento</span><h1>Actualizar y ajustar</h1><p class="muted">La versión del sistema, qué herramientas están activas, el espacio que ocupa y la app que usas. Actualizar nunca toca tus marcas, videos ni grabaciones.</p></div>';
  var v = ui.version;
  html += '<div class="grid g2" style="align-items:start"><section class="tarjeta" data-guia="version"><div class="tarjeta-head"><h2>Versión</h2><span class="mono">v' + esc(E.sistema.version) + "</span></div>";
  if (!E.sistema.repositorio) html += '<p class="muted chico">Esta copia no tiene un repositorio configurado para buscar versiones nuevas (<code>sistema.json</code>).</p>';
  else if (!v) html += '<p class="muted chico">Buscando si hay una versión nueva…</p>';
  else if (v.error) html += '<p class="muted chico">' + esc(v.error) + '</p><div><button class="btn btn-chico" type="button" id="btn-buscar">Buscar de nuevo</button></div>';
  else if (v.nueva) html += "<p><strong>Versión " + esc(v.nueva) + ' disponible</strong></p><div class="notas-md">' + md(v.notas || "Sin notas.") + '</div><div><button class="btn btn-pri" type="button" id="btn-actualizar">Actualizar</button></div>';
  else html += '<span class="pill p-ok" style="align-self:flex-start">Estás al día</span>';
  var mia = (E.cambios || []).filter(function (c) { return c.titulo.indexOf(E.sistema.version + " ") === 0; })[0];
  if (mia) html += '<details class="mas"><summary>Lo que trae tu versión (' + esc(E.sistema.version) + ")</summary>" + md(mia.md) + "</details>";
  html += '<div><button class="btn btn-chico" type="button" data-cambios="1">Ver todos los cambios</button></div></section>';
  var inst = E.instalacion;
  if (inst) {
    var faltan = (inst.piezas || []).filter(function (p) { return !p.quedo && p.imprescindible; });
    html += '<section class="tarjeta"><div class="tarjeta-head"><h2>Instalación</h2>' + (faltan.length ? '<span class="pill p-warn">Faltan ' + faltan.length + "</span>" : '<span class="pill p-ok">Todo listo</span>') + '</div><ul class="lista">' +
      (inst.piezas || []).map(function (p) { return "<li><span>" + esc(p.pieza) + (p.quedo ? "" : '<br><span class="muted chico">' + esc(p.siFalla) + "</span>") + "</span>" + (p.quedo ? '<span class="pill p-ok">Listo</span>' : p.imprescindible ? '<span class="pill p-warn">Falta</span>' : '<span class="pill p-gris">Opcional</span>') + "</li>"; }).join("") +
      '</ul><p class="muted chico">Revisada el ' + esc(String(inst.fecha || "").replace("T", " ").slice(0, 16)) + '.</p><div><button class="btn btn-chico" type="button" id="btn-reparar">Reparar instalación</button></div></section></div>';
  } else html += '<section class="tarjeta"><div class="tarjeta-head"><h2>Instalación</h2><span class="pill p-gris">Sin revisar</span></div><p class="muted chico">No encuentro el resumen de la instalación. Revísala con el botón: abre una ventana que instala lo que falte.</p><div><button class="btn btn-chico" type="button" id="btn-reparar">Reparar instalación</button></div></section></div>';

  html += tarjetaAlmacen();

  html += '<h2 style="margin-top:4px">Herramientas</h2><p class="muted chico" style="margin-top:-12px">El agente solo conoce las que están activas. Antes de activar una ves qué instala, si usa internet y si cuesta créditos. ' + esc(appInfo().nueva) + "</p>";
  var porId = {}; E.modulos.forEach(function (m) { porId[m.id] = m; });
  html += '<div class="grid g3" data-guia="herramientas">' + E.modulos.map(function (m) {
    var badges = (m.siempre ? '<span class="pill p-azul">Parte de la base</span>' : "") + (m.usaInternet ? '<span class="pill p-azul">Usa internet</span>' : '<span class="pill p-gris">Solo en tu equipo</span>') + (m.cuestaCreditos ? '<span class="pill p-warn">Cuesta créditos</span>' : "") + (m.deTerceros ? '<span class="pill p-rec">De terceros</span>' : "");
    var req = (m.requiere || []).map(function (r) { return porId[r] ? porId[r].nombre : r; });
    var conf = ui.pendiente === m.id ? '<div class="confirmar" role="group" aria-label="Confirmar activación"><strong>Al activarla:</strong><ul>' + (m.instala || []).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") +
      (req.length ? "<li>Se activa" + (req.length > 1 ? "n" : "") + " también: " + esc(req.join(", ")) + "</li>" : "") + "<li>" + (m.usaInternet ? "Usa internet" : "No usa internet") + "</li><li>" + (m.cuestaCreditos ? "Puede costar créditos (siempre con tu sí y dentro del límite de la marca)" : "No cuesta créditos") + "</li>" + (m.deTerceros ? "<li>Es de terceros: revisa su licencia en TERCEROS.md</li>" : "") +
      '</ul><div class="botones"><button class="btn btn-pri btn-chico" type="button" data-activar="' + esc(m.id) + '">Activar</button><button class="btn btn-chico" type="button" data-cancelar="1">Cancelar</button></div></div>' : "";
    return '<section class="tarjeta modulo' + (ui.ocupado === m.id ? " ocupado" : "") + '" data-modcard="' + esc(m.id) + '"><div class="arriba"><h3>' + esc(m.nombre) + '</h3><label class="switch"><input type="checkbox" data-mod="' + esc(m.id) + '"' + (m.activo ? " checked" : "") + (m.siempre ? " disabled" : "") + ' aria-label="' + (m.activo ? "Apagar " : "Activar ") + esc(m.nombre) + '"><span></span></label></div><p class="muted" style="font-size:.9rem">' + esc(m.descripcion) + "</p>" +
      (req.length ? '<span class="muted chico">Necesita: ' + esc(req.join(", ")) + "</span>" : "") + '<div class="chips">' + badges + "</div>" + conf +
      (m.guia ? '<button class="enlace chico" type="button" data-guia="' + esc(m.id) + '" style="align-self:flex-start">Ver su guía paso a paso</button>' : "") + "</section>";
  }).join("") + "</div>";
  html += '<section class="tarjeta"><h2>Ajustes</h2>' +
    '<div class="opcion"><div><strong>Tu app de agente</strong><p class="muted chico">Cambia las instrucciones del manual y de Primeros pasos. La carpeta funciona con las tres.</p></div>' + selectorApp() + "</div>" +
    '<div class="opcion"><div><strong>Tus datos</strong><p class="muted chico">Marcas, videos, grabaciones y bandeja. Actualizar nunca los toca.</p><p class="mono muted">mis-videos</p></div><button class="btn btn-chico" type="button" data-abrir="mis-videos">Abrir</button></div>' +
    '<div class="opcion"><div><strong>Carpeta del sistema</strong><p class="mono muted" style="overflow-wrap:anywhere">' + esc(E.sistema.raiz) + '</p></div><button class="btn btn-chico" type="button" data-abrir=".">Abrir</button></div>' +
    '<div class="opcion"><div><strong>Seguridad y privacidad</strong><p class="muted chico">Qué sale de tu computador, cuentas, gastos y versiones.</p></div><button class="btn btn-chico" type="button" data-abrir="SEGURIDAD.md">Leer</button></div></section>';
  return html;
};

// Almacenamiento (se mide al abrir Mantenimiento: recorrer la carpeta tarda un poco)
var USO = [["grabaciones", "Grabaciones y material original", "#2E6BE6"], ["enCurso", "Videos en curso", "#9B4DE0"], ["entregados", "Videos entregados", "#1E9E61"], ["referencias", "Referencias", "#D9622B"], ["bandeja", "Bandeja", "#C23B7A"], ["otros", "Resto de tus marcas", "#0E8C99"], ["respaldos", "Respaldos del sistema", "#8A8FA3"], ["programas", "Programas descargados", "#C9A227"]];
function cargarAlmacen() {
  if (ui.almacen === "cargando") return;
  ui.almacen = "cargando";
  api("/api/almacenamiento").then(function (r) { ui.almacen = r; if (actual() === "mantenimiento") { var el = $("#almacen"); if (el) el.outerHTML = tarjetaAlmacen(); } }).catch(function () { ui.almacen = { error: true }; });
}
function tarjetaAlmacen() {
  var a = ui.almacen, html = '<section class="tarjeta" id="almacen" data-guia="almacenamiento"><div class="tarjeta-head"><h2>Almacenamiento</h2>';
  if (!a || a === "cargando") return html + '</div><p class="muted chico">Midiendo lo que ocupa la carpeta…</p></section>';
  if (a.error) return html + '</div><p class="muted chico">No pude medir la carpeta.</p></section>';
  var total = USO.reduce(function (n, u) { return n + (a.cats[u[0]] || 0); }, 0) || 1;
  html += '<span class="muted chico">' + tam(total) + (a.libre != null ? " en total · quedan " + tam(a.libre) + " libres en el disco" : "") + "</span></div>";
  html += '<div class="barra-uso" role="img" aria-label="Uso del espacio por tipo">' + USO.filter(function (u) { return a.cats[u[0]]; }).map(function (u) { return '<i style="width:' + (a.cats[u[0]] / total * 100) + "%;background:" + u[2] + '" title="' + u[1] + ": " + tam(a.cats[u[0]]) + '"></i>'; }).join("") + "</div>";
  html += '<div class="leyenda-uso">' + USO.filter(function (u) { return a.cats[u[0]]; }).map(function (u) { return '<span><i style="background:' + u[2] + '"></i>' + u[1] + " <b>" + tam(a.cats[u[0]]) + "</b></span>"; }).join("") + "</div>";
  html += a.grupos.length ? '<h3 style="margin-top:8px">Lo que puedes liberar</h3><ul class="lista">' + a.grupos.map(function (g) {
    return '<li><span><strong class="chico">' + esc(g.titulo) + '</strong><br><span class="muted chico">Queda: ' + esc(g.queda) + '</span></span><span style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end"><span class="pill ' + (g.seguro ? "p-ok" : "p-warn") + '">' + (g.seguro ? "Seguro" : "Revisar bien") + '</span><span class="mono chico">' + tam(g.total) + '</span><button class="btn btn-chico" type="button" data-revisaralm="' + esc(g.id) + '">Revisar</button></span></li>';
  }).join("") + "</ul>" : '<p class="muted chico">No hay nada sugerido para liberar.</p>';
  return html + '<p class="muted chico">Nada se borra solo: siempre ves qué es, cuánto pesa y confirmas. Va a la Papelera de reciclaje de Windows y queda anotado en el registro de archivos.</p><div><button class="btn btn-chico" type="button" data-medir="1">Medir de nuevo</button></div></section>';
}
function abrirLimpieza(id) {
  var g = ui.almacen && ui.almacen.grupos && ui.almacen.grupos.filter(function (x) { return x.id === id; })[0]; if (!g) return;
  var h = '<div class="velo" data-cerrar="1"></div><aside class="hoja" role="dialog" aria-modal="true" aria-labelledby="t-alm"><div class="tarjeta-head"><h2 id="t-alm">' + esc(g.titulo) + '</h2><button class="btn btn-chico" type="button" data-cerrar="1">Cerrar</button></div>';
  h += '<p class="chico"><strong>Queda:</strong> ' + esc(g.queda) + "</p>";
  h += '<ul class="lista">' + g.items.map(function (it, i) { return '<li><label style="display:flex;gap:10px;align-items:flex-start;min-width:0"><input type="checkbox" checked data-almitem="' + i + '"><span class="chico" style="overflow-wrap:anywhere">' + esc(it.ruta.replace(/^mis-videos\/marcas\//, "")) + '</span></label><span class="mono chico">' + tam(it.tam) + "</span></li>"; }).join("") + "</ul>";
  if (!g.seguro) h += '<label class="ojo" style="display:flex;gap:10px;align-items:flex-start"><input type="checkbox" data-entiendo="1"><span>Entiendo que no podré rehacer estos videos desde cero. Los videos finales se conservan.</span></label>';
  h += '<div class="botones-fila"><button class="btn btn-pri" type="button" id="btn-papelera" data-papelera="' + esc(g.id) + '"' + (g.seguro ? "" : " disabled") + '>Mandar a la Papelera (<span id="alm-total">' + tam(g.total) + "</span>)</button></div>";
  h += '<p class="muted chico">Si te arrepientes, lo recuperas desde la Papelera de reciclaje de Windows.</p>';
  $("#capas").innerHTML = h + "</aside>";
  $(".hoja [data-cerrar]").focus();
}
function clicMantenimiento(t, d) {
  if (d.medir) { ui.almacen = null; cargarAlmacen(); render(); return true; }
  if (d.revisaralm) { abrirLimpieza(d.revisaralm); return true; }
  if (d.papelera) {
    var g = ui.almacen.grupos.filter(function (x) { return x.id === d.papelera; })[0], rutas = [];
    document.querySelectorAll("[data-almitem]").forEach(function (c) { if (c.checked) rutas.push(g.items[Number(c.dataset.almitem)].ruta); });
    var ent = $("[data-entiendo]");
    if (!rutas.length) { toast("Marca al menos una cosa."); return true; }
    t.disabled = true;
    api("/api/liberar", { grupo: g.id, rutas: rutas, entiendo: !!(ent && ent.checked) }).then(function (r) {
      cerrarCapas();
      if (r.error) toast(r.error); else toast(tam(r.liberado) + " a la Papelera de reciclaje (" + r.cuantos + " archivo" + (r.cuantos === 1 ? "" : "s") + "). Se puede recuperar." + (r.fallaron.length ? " " + r.fallaron.length + " no se pudieron mover." : ""));
      ui.almacen = null; cargarAlmacen(); textoE = ""; refrescar();
    });
    return true;
  }
  if (d.cambios) { abrirCambios(); return true; }
  return false;
}
function cambioMantenimiento(t) {
  if (!t.dataset) return false;
  if (t.dataset.entiendo !== undefined) { var b = $("#btn-papelera"); if (b) b.disabled = !t.checked; return true; }
  if (t.dataset.almitem !== undefined) {
    var g = ui.almacen.grupos.filter(function (x) { return x.id === $("#btn-papelera").dataset.papelera; })[0], s = 0;
    document.querySelectorAll("[data-almitem]").forEach(function (c) { if (c.checked) s += g.items[Number(c.dataset.almitem)].tam; });
    $("#alm-total").textContent = tam(s); return true;
  }
  return false;
}
function abrirCambios() {
  var c = E.cambios || [];
  $("#capas").innerHTML = '<div class="velo" data-cerrar="1"></div><aside class="hoja cambios" role="dialog" aria-modal="true" aria-labelledby="t-cambios"><div class="tarjeta-head"><h2 id="t-cambios">Todos los cambios</h2><button class="btn btn-chico" type="button" data-cerrar="1">Cerrar</button></div>' +
    '<p class="muted chico">Lo de «En desarrollo» ya está hecho y llega con la próxima versión. Cada mejora se anota apenas se termina (CHANGELOG.md).</p>' +
    c.map(function (s) { return "<h3>" + esc(s.titulo) + (/^en desarrollo/i.test(s.titulo) ? ' <span class="pill p-azul">En camino</span>' : "") + "</h3>" + md(s.md); }).join("") + "</aside>";
  $(".hoja [data-cerrar]").focus();
}
function confirmarVentana(que) {
  var act = que === "actualizar";
  $("#capas").innerHTML = '<div class="velo" data-cerrar="1"></div><div class="modal" role="dialog" aria-modal="true" aria-labelledby="t-ven"><h2 id="t-ven">' + (act ? "Actualizar a la versión " + esc(ui.version.nueva) : "Reparar la instalación") + "</h2>" +
    '<p class="pill p-ok" style="align-self:flex-start">Tus marcas, videos, grabaciones y la bandeja no se tocan</p><ol class="pasos">' +
    (act ? "<li>Se abre una ventana que descarga la versión nueva y comprueba su huella SHA-256.</li><li>Te pregunta si quieres seguir: escribe S y Enter.</li><li>Guarda un respaldo del sistema actual y reemplaza solo los archivos del sistema.</li><li>Revisa la instalación. Al terminar, cierra la ventana negra del panel y abre Panel.bat de nuevo.</li>"
      : "<li>Se abre una ventana que revisa cada pieza e instala lo que falte.</li><li>Puede tardar unos minutos. No la cierres hasta que muestre el resumen.</li><li>Al terminar, este panel se actualiza solo.</li>") +
    '</ol><div class="botones-fila" style="justify-content:flex-end"><button class="btn" type="button" data-cerrar="1">Cancelar</button><button class="btn btn-pri" type="button" data-ventana="' + que + '">' + (act ? "Abrir la ventana de actualización" : "Reparar") + "</button></div></div>";
  $("#capas [data-ventana]").focus();
}
function buscarVersion() {
  if (!E.sistema.repositorio) return;
  ui.version = null;
  api("/api/version").then(function (v) { ui.version = v; render(); }).catch(function () { ui.version = { error: "No pude consultar si hay una versión nueva." }; render(); });
}
