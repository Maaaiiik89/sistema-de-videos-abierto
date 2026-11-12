// ---------- Subidas: una cola para la bandeja, el logo de una marca o las fuentes de un pedido ----------
// destino: null (bandeja) | { marca, tipo: "logo" } | { marca, tipo: "fuente", carpeta }
function encolar(files, destino) {
  files.forEach(function (f) { ui.subidas.push({ nombre: f.name, tam: f.size, prog: 0, estado: "espera", file: f, destino: destino || null }); });
  pintarSubidas();
  if (!ui.subiendo) siguienteSubida();
}
function textoDestino(s) { return !s.destino ? "a la bandeja" : s.destino.tipo === "logo" ? "al logo de la marca" : "al pedido"; }
function pintarSubidas() {
  var c = $("#subidas"); if (!c) return;
  c.innerHTML = ui.subidas.slice(-8).map(function (s) {
    var est = s.estado === "lista" ? '<span class="pill p-ok">Listo (' + textoDestino(s) + ")</span>" : s.estado === "error" ? '<span class="pill p-warn" title="' + esc(s.error) + '">' + esc(s.error) + "</span>" : s.estado === "subiendo" ? '<span class="pill p-azul">' + Math.round(s.prog * 100) + "%</span>" : '<span class="pill p-gris">En cola</span>';
    return '<div class="subida"><span>' + esc(s.final || s.nombre) + ' <span class="muted chico">' + tam(s.tam) + '</span></span><div class="barra-prog"><i style="width:' + Math.round(s.prog * 100) + '%"></i></div>' + est + "</div>";
  }).join("");
}
function siguienteSubida() {
  var s = ui.subidas.filter(function (x) { return x.estado === "espera"; })[0];
  if (!s) { ui.subiendo = false; textoE = ""; refrescar(); return; }
  ui.subiendo = true; s.estado = "subiendo"; pintarSubidas();
  var q = "nombre=" + encodeURIComponent(s.nombre);
  if (s.destino) q += "&marca=" + encodeURIComponent(s.destino.marca) + "&tipo=" + encodeURIComponent(s.destino.tipo) + (s.destino.carpeta ? "&carpeta=" + encodeURIComponent(s.destino.carpeta) : "");
  var x = new XMLHttpRequest();
  x.open("POST", "/api/subir?" + q);
  x.setRequestHeader("X-Panel-Token", TOKEN);
  x.setRequestHeader("Content-Type", "application/octet-stream");
  x.upload.onprogress = function (e) { if (e.lengthComputable) { s.prog = e.loaded / e.total; pintarSubidas(); } };
  x.onload = function () {
    var r = {}; try { r = JSON.parse(x.responseText); } catch (e) { }
    if (x.status === 200 && r.ok) { s.estado = "lista"; s.final = r.nombre; s.prog = 1; } else { s.estado = "error"; s.error = r.error || "No se pudo subir."; }
    s.file = null; pintarSubidas(); siguienteSubida();
  };
  x.onerror = function () { s.estado = "error"; s.error = "Se cortó la conexión con el panel."; s.file = null; pintarSubidas(); siguienteSubida(); };
  x.send(s.file);
}
// Zona de arrastre: los archivos sueltos van a alPoner; las carpetas no se suben
function prepararZona(z, inp, alPoner) {
  if (!z) return;
  if (inp) inp.addEventListener("change", function () { if (inp.files.length) alPoner(Array.prototype.slice.call(inp.files)); inp.value = ""; });
  ["dragenter", "dragover"].forEach(function (ev) { z.addEventListener(ev, function (e) { e.preventDefault(); z.classList.add("encima"); }); });
  ["dragleave", "drop"].forEach(function (ev) { z.addEventListener(ev, function (e) { e.preventDefault(); z.classList.remove("encima"); }); });
  z.addEventListener("drop", function (e) {
    var dt = e.dataTransfer; if (!dt) return;
    var files = [], carpetas = 0;
    for (var i = 0; i < dt.files.length; i++) {
      var it = dt.items && dt.items[i], en = it && it.webkitGetAsEntry ? it.webkitGetAsEntry() : null;
      if (en && en.isDirectory) carpetas++; else files.push(dt.files[i]);
    }
    if (carpetas) toast("Las carpetas no se suben: abre la carpeta y arrastra los archivos de adentro.");
    if (files.length) alPoner(files);
  });
  pintarSubidas();
}

vistas.subir = function () {
  var m = E.marcas.filter(function (x) { return x.id === E.activa; })[0];
  var html = '<div class="cabeza"><span class="eyebrow">Subir</span><h1>Deja aquí lo que necesita el agente</h1><p class="muted">Fotos del negocio, música, fuentes o un kit de marca. Quedan en la bandeja; la próxima vez que le hables, el agente los ordena en su carpeta, les pone fecha y anota qué movió. Lo que es de un video en particular súbelo en su <a class="enlace" href="#pedidos">pedido</a>.</p></div>';
  html += '<label class="soltar" id="soltar" for="archivos-in"><strong>Arrastra archivos aquí o haz clic para elegirlos</strong><span class="muted chico">Se copian a la bandeja (<span class="mono">mis-videos/bandeja</span>). Tus originales no se tocan.</span><input type="file" id="archivos-in" multiple></label>';
  html += '<div class="subidas" id="subidas"></div>';
  html += '<section class="tarjeta"><div class="tarjeta-head"><h2>En la bandeja (' + E.bandeja.length + ")</h2>" + (E.bandeja.length ? '<span class="pill p-warn">Esperando al agente</span>' : '<span class="pill p-ok">Todo ordenado</span>') + "</div>" +
    (E.bandeja.length ? (m ? '<p class="muted chico">Dónde los dejaría el agente en la marca activa, <strong>' + esc(m.nombre) + "</strong>. Si van a otra marca o a un video, díselo.</p>" : '<p class="muted chico">Todavía no hay una marca activa: el agente te preguntará a cuál van.</p>') +
      "<div>" + E.bandeja.map(function (f) {
        var p = f.propuesta, tipo = f.acompana ? "datos" : p ? p.tipo : "—", destino = f.acompana ? "Viaja con su video" : p ? (p.destino ? "Irá a: " + p.destino.replace(/^mis-videos\//, "") : p.motivo) : m ? "" : "Espera a que crees tu marca";
        return '<div class="archivo"><span class="tipo-a">' + esc(tipo) + "</span><span><span>" + esc(f.nombre) + ' <span class="muted chico">' + tam(f.tam) + '</span></span><br><span class="ruta">' + esc(destino) + '</span></span><span class="pill p-gris">En espera</span></div>';
      }).join("") + "</div>" + decile("Ordena lo que dejé en la bandeja.") : '<p class="muted">La bandeja está vacía.</p>') +
    '<div class="botones-fila"><button class="btn btn-chico" type="button" data-abrir="mis-videos/bandeja">Abrir la bandeja</button></div></section>';
  html += '<section class="tarjeta"><div class="tarjeta-head"><h2>Lo que se ordenó</h2><span class="muted chico">' + E.registroTotal + " en total</span></div>" +
    (E.registro.length ? "<div>" + E.registro.map(function (o) {
      return '<div class="archivo"><span class="tipo-a" style="background:var(--ok-soft);color:var(--ok)">' + esc(o.fecha.slice(5) || "Listo") + "</span><span><span>" + esc(o.archivo) + '</span><br><span class="ruta">' + esc(o.destino) + "</span></span><span></span></div>";
    }).join("") + '</div><div class="botones-fila"><button class="btn btn-chico" type="button" data-abrir="mis-videos/registro-de-archivos.md">Abrir el registro completo</button></div>' : '<p class="muted">Todavía no hay nada ordenado.</p>') + "</section>";
  var g = E.generales, id = m ? m.id : "<tu-marca>";
  html += '<section class="tarjeta"><h2>Dónde busca el agente</h2><p class="muted chico">Cuando necesita una foto, una música o un icono, usa el primero que encuentra en este orden: del video, de la temática, de la marca, los tuyos generales y, por último, los que trae el sistema.</p><div class="niveles">' +
    '<div class="nivel"><h3>Del video</h3><span class="muted chico">Solo ese video</span><ul><li>Lo que subes en su pedido</li><li>Voz y clips grabados</li><li>Fotos para ese video</li></ul><span class="mono muted">videos/…/fuentes/</span></div>' +
    '<div class="nivel"><h3>De la marca</h3><span class="muted chico">' + esc(m ? m.nombre : "Tu marca") + ' (y sus temáticas)</span><ul><li>Logo, fuentes y personaje</li><li>Fotos del negocio y productos</li><li>Música de la marca</li></ul><span class="mono muted">marcas/' + esc(id) + '/recursos/</span></div>' +
    '<div class="nivel"><h3>Generales</h3><span class="muted chico">Para todas las marcas</span><ul><li>' + g.musica + " música" + (g.musica === 1 ? "" : "s") + "</li><li>" + g.sonidos + " sonido" + (g.sonidos === 1 ? "" : "s") + "</li><li>" + g.iconos + " icono" + (g.iconos === 1 ? "" : "s") + '</li></ul><span class="mono muted">mis-videos/recursos/ y recursos/</span></div></div></section>';
  html += '<section class="tarjeta"><h2>Cómo queda ordenada la carpeta</h2><pre class="arbol">mis-videos/\n├── bandeja/                  ← lo que subes aquí\n├── recursos/                 ← tus generales: música, sonidos, iconos\n├── registro-de-archivos.md   ← qué se movió y a dónde\n└── marcas/\n    └── ' + esc(id) + '/\n        ├── ficha.md\n        ├── estilo/           ← colores, logo, fuentes y elementos reutilizables\n        ├── personaje/  referencias/  documentos/\n        ├── recursos/         ← imágenes, música e iconos de la marca\n        ├── tematicas/  plan/\n        ├── grabaciones/      ← originales, nunca se modifican\n        └── videos/\n            └── AAAA-MM-DD_nombre/\n                ├── PEDIDO.md ← lo que pediste\n                ├── guion.md\n                ├── fuentes/  ← lo que subiste para este video\n                ├── proyecto/\n                └── entregas/ ← borrador y un MP4 por red</pre></section>';
  return html;
};
