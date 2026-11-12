// ---------- Armar una paleta desde un color (misma fórmula que herramientas/paleta.mjs generar) ----------
function aHsl(hex) {
  var c = rgb(hex).map(function (v) { return v / 255; }), mx = Math.max.apply(null, c), mn = Math.min.apply(null, c), l = (mx + mn) / 2, d = mx - mn, h = 0, s = 0;
  if (d) { s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === c[0] ? (c[1] - c[2]) / d + (c[1] < c[2] ? 6 : 0) : mx === c[1] ? (c[2] - c[0]) / d + 2 : (c[0] - c[1]) / d + 4; h *= 60; }
  return { h: h, s: s, l: l };
}
function deHsl(h, s, l) {
  h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
  var k = function (n) { return (n + h / 30) % 12; }, a = s * Math.min(l, 1 - l), f = function (n) { return l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); };
  return "#" + [f(0), f(8), f(4)].map(function (v) { return ("0" + Math.round(v * 255).toString(16)).slice(-2); }).join("").toUpperCase();
}
function conContraste(hex, fondo, min) {
  var c = aHsl(hex), oscuro = lum(fondo) < 0.25, out = hex;
  for (var i = 0; i < 60 && ratio(out, fondo) < min; i++) { c.l += oscuro ? 0.015 : -0.015; out = deHsl(c.h, c.s, c.l); }
  return out;
}
var ARMONIAS = [["complementaria", 180, "Complementaria", "Colores opuestos: mucho contraste"], ["analoga", 32, "Análoga", "Colores vecinos: tranquila y armónica"], ["triadica", 120, "Tríada", "Tres colores repartidos: alegre y variada"], ["dividida", 150, "Dividida", "Contraste, pero más suave"]];
function generarDesde(base, giro, oscuro) {
  var b = aHsl(base), fondo = oscuro ? deHsl(b.h, Math.min(b.s, 0.35), 0.11) : deHsl(b.h, Math.min(b.s, 0.3), 0.97);
  return { fondo: fondo, fondo2: oscuro ? deHsl(b.h, Math.min(b.s, 0.3), 0.17) : deHsl(b.h, Math.min(b.s, 0.3), 0.91), texto: oscuro ? deHsl(b.h, 0.3, 0.95) : deHsl(b.h, 0.4, 0.13),
    acento: conContraste(deHsl(b.h, Math.max(b.s, 0.78), 0.55), fondo, 3), acento2: conContraste(deHsl(b.h + giro, 0.7, 0.55), fondo, 3) };
}
function arreglarContraste(p) {
  var q = { fondo: p.fondo, fondo2: p.fondo2, texto: conContraste(p.texto, p.fondo, 4.5), acento: conContraste(p.acento, p.fondo, 3), acento2: conContraste(p.acento2, p.fondo, 3) };
  var c = aHsl(q.acento);
  for (var i = 0; i < 40 && ratio(tinta(q.acento), q.acento) < 3; i++) { c.l += lum(p.fondo) < 0.25 ? 0.02 : -0.02; q.acento = deHsl(c.h, c.s, c.l); }
  return q;
}

// Colores del logo, sacados en el navegador: los del SVG (fill, stroke) o muestreando la imagen
var coloresLogo = {};
function sacarColoresLogo(ruta) {
  if (!ruta || coloresLogo[ruta]) return;
  coloresLogo[ruta] = [];
  var listo = function (lista) { coloresLogo[ruta] = lista.slice(0, 5); if (ui.arm) pintarArmador(); };
  var util = function (hex) { var l = lum(hex), c = aHsl(hex); return l > 0.03 && l < 0.92 && c.s > 0.12; };
  if (/\.svg$/i.test(ruta)) {
    fetch(archivo(ruta)).then(function (r) { return r.text(); }).then(function (t) {
      var cuenta = {};
      (t.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) || []).forEach(function (h) { if (h.length === 4) h = "#" + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]; h = h.toUpperCase(); cuenta[h] = (cuenta[h] || 0) + 1; });
      listo(Object.keys(cuenta).filter(util).sort(function (a, b) { return cuenta[b] - cuenta[a]; }));
    }).catch(function () { listo([]); });
    return;
  }
  var img = new Image();
  img.onload = function () {
    try {
      var cv = document.createElement("canvas"), w = 64, h = Math.max(1, Math.round(64 * img.height / img.width));
      cv.width = w; cv.height = h; var cx = cv.getContext("2d"); cx.drawImage(img, 0, 0, w, h);
      var px = cx.getImageData(0, 0, w, h).data, cuenta = {};
      for (var i = 0; i < px.length; i += 4) {
        if (px[i + 3] < 200) continue;
        var hex = "#" + [px[i], px[i + 1], px[i + 2]].map(function (v) { return ("0" + (Math.round(v / 32) * 32 > 255 ? 255 : Math.round(v / 32) * 32).toString(16)).slice(-2); }).join("").toUpperCase();
        cuenta[hex] = (cuenta[hex] || 0) + 1;
      }
      listo(Object.keys(cuenta).filter(util).sort(function (a, b) { return cuenta[b] - cuenta[a]; }));
    } catch (e) { listo([]); }
  };
  img.onerror = function () { listo([]); };
  img.src = archivo(ruta);
}

// ui.arm = { donde: "paso" | "visual", marca, base, oscuro, edit, nombre }
function abrirArmador(donde, m) {
  var p = m.paleta && !m.paleta.deEjemplo ? m.paleta : null;
  ui.arm = { donde: donde, marca: m.id, base: p ? p.acento : "#E8A33C", oscuro: p ? lum(p.fondo) < 0.25 : true, edit: null, nombre: "" };
  if (m.logo) sacarColoresLogo(m.logo);
}
function miniReel(p) {
  return '<div class="mini-reel" style="background:' + p.fondo + ";color:" + p.texto + '"><b>Tu dato <span style="color:' + p.acento + '">destacado</span></b><span class="mr-sub">La palabra <i style="background:' + p.acento + ";color:" + tinta(p.acento) + '">marcada</i></span><span class="mr-franja" style="background:' + p.fondo2 + ";border-top-color:" + p.acento2 + '"></span></div>';
}
function recsHtml() {
  return ARMONIAS.map(function (a) {
    var p = generarDesde(ui.arm.base, a[1], ui.arm.oscuro);
    return '<div class="paleta"><div class="fila"><strong>' + a[2] + "</strong>" + (pasaTodo(p) ? '<span class="pill p-ok">4 de 4</span>' : '<span class="pill p-warn">Revisar</span>') + '</div><span class="muted chico">' + a[3] + "</span>" + muestras(p) +
      '<div><button class="btn btn-chico" type="button" data-armelegir="' + a[0] + '">Elegir y ajustar</button></div></div>';
  }).join("");
}
function pruebasArmHtml() { var p = ui.arm.edit; return '<div class="pruebas">' + chipsPruebas(p) + "</div>" + (pasaTodo(p) ? '<span class="pill p-ok">Pasa las 4 pruebas: se lee bien en el teléfono</span>' : '<button class="btn btn-chico" type="button" data-armfix="1">Arreglar el contraste</button>'); }
function armadorHtml(m) {
  var a = ui.arm, logo = coloresLogo[m.logo] || [];
  if (a.edit) {
    return '<div class="armador" id="armador"><div class="tarjeta-head"><h3>Ajusta tu paleta</h3><button class="enlace" type="button" data-armvolver="1">Volver a las recomendaciones</button></div>' +
      '<div class="arm-editor"><div class="arm-colores">' + [["fondo", "Fondo"], ["fondo2", "Fondo 2 (franjas y tarjetas)"], ["texto", "Texto"], ["acento", "Acento (lo que destaca)"], ["acento2", "Acento 2"]].map(function (c) {
        return '<label class="arm-fila"><input type="color" data-armc="' + c[0] + '" value="' + a.edit[c[0]].toLowerCase() + '" aria-label="' + c[1] + '"><span>' + c[1] + '</span><span class="mono chico" id="arm-hex-' + c[0] + '">' + a.edit[c[0]] + "</span></label>";
      }).join("") + '<div id="arm-pruebas">' + pruebasArmHtml() + '</div></div><div id="arm-prev">' + miniReel(a.edit) + "</div></div>" +
      '<div class="accion-paso"><button class="btn btn-pri" type="button" data-armusar="1"' + (a.guardando ? " disabled" : "") + ">" + (a.guardando ? "Guardando…" : "Usar esta paleta") + '</button><button class="btn" type="button" data-armcerrar="1">Cancelar</button></div>' +
      '<p class="muted chico">Se guarda en el estilo de tu marca (estilo.css) y en la ficha. Los videos nuevos la usan; los ya hechos no cambian.</p></div>';
  }
  return '<div class="armador" id="armador"><h3>Arma tu paleta desde un color</h3>' +
    '<div class="arm-base"><label class="arm-fila grande"><input type="color" id="arm-base" value="' + a.base.toLowerCase() + '" aria-label="Tu color principal"><span><strong>Tu color principal</strong><br><span class="muted chico">El de tu logo o el que más te identifica</span></span></label>' +
    '<label class="campo" style="max-width:130px"><span class="ayuda">Código</span><input type="text" id="arm-hex" value="' + a.base + '" maxlength="7"></label>' +
    (logo.length ? '<div class="arm-logo"><span class="ayuda">De tu logo</span><div class="chips">' + logo.map(function (c) { return '<button type="button" class="chip-color" data-armbase="' + c + '" style="background:' + c + '" aria-label="Usar ' + c + '" title="' + c + '"></button>'; }).join("") + "</div></div>" : '<span class="muted chico">' + (m.logo ? "Leyendo los colores de tu logo…" : "Sube tu logo y te mostramos sus colores aquí.") + "</span>") +
    '<div class="arm-logo"><span class="ayuda">Fondo</span><div class="segmentos" role="group" aria-label="Fondo"><button type="button" data-armfondo="oscuro" aria-pressed="' + a.oscuro + '">Oscuro</button><button type="button" data-armfondo="claro" aria-pressed="' + !a.oscuro + '">Claro</button></div></div></div>' +
    '<p class="muted chico">Recomendaciones para tu color, todas con el contraste probado:</p><div class="paletas arm-recs" id="arm-recs">' + recsHtml() + "</div>" +
    (a.donde === "visual" ? '<div><button class="btn btn-chico" type="button" data-armcerrar="1">Cerrar</button></div>' : "") + "</div>";
}
function pintarArmador() { var el = $("#armador"), m = marcaVista(); if (el && m && ui.arm) el.outerHTML = armadorHtml(m); }
function tarjetaPropuesta(m, x, i) {
  var actual = m.paleta && ["fondo", "fondo2", "texto", "acento", "acento2"].every(function (k) { return m.paleta[k] === String(x[k]).toUpperCase(); });
  return '<div class="paleta"><div class="fila"><strong>' + esc(x.nombre) + "</strong>" + (x.pasaTodo ? '<span class="pill p-ok">4 de 4</span>' : '<span class="pill p-warn">Revisar</span>') + "</div>" +
    (x.para ? '<span class="muted chico">' + esc(x.para) + "</span>" : "") + muestras(x) + "<div>" +
    (actual ? '<span class="pill p-azul">La que usas</span>' : x.pasaTodo ? '<button class="btn btn-chico" type="button" data-elegirpaleta="' + i + '">Elegir esta</button>' : "") + "</div></div>";
}
function guardarPaleta(m, p, nombre) {
  if (!pasaTodo(p)) { toast("Primero arregla el contraste: hay textos que se leerían mal."); return; }
  if (ui.arm) { ui.arm.guardando = true; pintarArmador(); }
  api("/api/paleta", { marca: m.id, fondo: p.fondo, fondo2: p.fondo2, texto: p.texto, acento: p.acento, acento2: p.acento2 }).then(function (r) {
    if (r.error) { if (ui.arm) { ui.arm.guardando = false; pintarArmador(); } toast(r.error); return; }
    ui.arm = null; cerrarGuia(); toast("Paleta «" + (nombre || "tu paleta") + "» guardada en tu marca. El agente la usa en tus próximos videos."); textoE = ""; refrescar();
  }).catch(function () { if (ui.arm) { ui.arm.guardando = false; pintarArmador(); } toast("No se pudo guardar la paleta."); });
}
function clicPaleta(t, d) {
  var m = marcaVista(); if (!m) return false;
  if (d.armabrir) { abrirArmador(d.armabrir, m); render(); return true; }
  if (d.armcerrar) { ui.arm = null; render(); return true; }
  if (d.armbase) { ui.arm.base = d.armbase; pintarArmador(); return true; }
  if (d.armfondo) { ui.arm.oscuro = d.armfondo === "oscuro"; pintarArmador(); return true; }
  if (d.armelegir) { var a = ARMONIAS.filter(function (x) { return x[0] === d.armelegir; })[0]; ui.arm.edit = generarDesde(ui.arm.base, a[1], ui.arm.oscuro); ui.arm.nombre = a[2] + " desde " + ui.arm.base; pintarArmador(); return true; }
  if (d.armvolver) { ui.arm.edit = null; pintarArmador(); return true; }
  if (d.armfix) { ui.arm.edit = arreglarContraste(ui.arm.edit); pintarArmador(); toast("Ajusté los colores que no pasaban, manteniendo su tono."); return true; }
  if (d.armusar) { guardarPaleta(m, ui.arm.edit, ui.arm.nombre); return true; }
  if (d.elegirpaleta !== undefined) { var x = m.propuestas[Number(d.elegirpaleta)]; if (x) guardarPaleta(m, x, x.nombre); return true; }
  return false;
}
document.addEventListener("input", function (e) {
  var t = e.target; if (!ui.arm) return;
  if (t.id === "arm-base") { ui.arm.base = t.value.toUpperCase(); var h = $("#arm-hex"); if (h) h.value = ui.arm.base; var r = $("#arm-recs"); if (r) r.innerHTML = recsHtml(); }
  else if (t.id === "arm-hex" && /^#[0-9a-fA-F]{6}$/.test(t.value)) { ui.arm.base = t.value.toUpperCase(); var b = $("#arm-base"); if (b) b.value = t.value.toLowerCase(); var r2 = $("#arm-recs"); if (r2) r2.innerHTML = recsHtml(); }
  else if (t.dataset && t.dataset.armc && ui.arm.edit) { ui.arm.edit[t.dataset.armc] = t.value.toUpperCase(); $("#arm-hex-" + t.dataset.armc).textContent = ui.arm.edit[t.dataset.armc]; $("#arm-pruebas").innerHTML = pruebasArmHtml(); $("#arm-prev").innerHTML = miniReel(ui.arm.edit); }
});
