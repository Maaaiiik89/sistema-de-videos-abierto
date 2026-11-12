// ---------- Recorrido guiado (se abre solo la primera vez) y guía puntual ("toca aquí") ----------
var TOUR = [
  { t: "Bienvenida al panel", x: function () { return "En 2 minutos te muestro para qué sirve cada parte. El trabajo lo hace el agente en " + appNombre() + ": aquí pides, revisas y mantienes el sistema. El recorrido no cambia nada de tu carpeta."; } },
  { sel: ".nav", t: "Las seis partes", x: "Primeros pasos, Pedidos, Manual, Verificar, Subir y Mantenimiento. Los números rojos te avisan que algo espera por ti." },
  { sel: "#zona-marca", t: "La marca que revisas", x: "Aquí ves la marca que estás revisando. Si llevas varias (por ejemplo, de clientes), aparece un selector para elegir cuál." },
  { vista: "inicio", sel: ".progreso-top", t: "Primeros pasos", x: "El orden para empezar. Cada paso tiene un botón para hacerlo aquí, o te dice qué escribirle al agente, y se marca solo cuando queda hecho." },
  { vista: "pedidos", prep: function () { ui.form = null; ui.enviado = null; }, sel: ".puertas", t: "Pedir un video", x: "Conversando con el agente o con el formulario. El formulario conviene para videos pesados y para llenar todo de una vez." },
  { vista: "pedidos", sel: "[data-guia=pedidos-lista]", t: "Tus pedidos", x: "Ves en qué va cada uno. Cuando el agente necesita algo, el pedido lo dice y puedes responder aquí mismo o en el chat." },
  { vista: "verificar", prep: function () { ui.tabVer = "marca"; ui.subMarca = "ficha"; }, sel: ".vista > .tabs", t: "Verificar", x: "Revisas lo que hizo el agente: tu marca, el plan del mes y los videos. Los cambios se los pides al agente." },
  { vista: "verificar", sel: ".tabs.sub", t: "Tu marca", x: "Ficha, visual, voz y referencias. Lo esencial lo necesita el agente; el contexto es opcional, pero mejora mucho los guiones." },
  { vista: "subir", sel: "#soltar", t: "Subir", x: "Para lo que no es de un video en particular: fotos del negocio, música o un kit de marca. El agente lo ordena en su carpeta y nunca borra nada." },
  { vista: "manual", sel: ".selector-app", t: "Manual", x: function () { return "Paso a paso, escrito para " + appNombre() + ". Si trabajas con otra app, cámbiala aquí y el manual se reescribe."; } },
  { vista: "mantenimiento", sel: "[data-guia=version]", t: "Versión y novedades", x: "Te avisa cuando hay una versión nueva y qué trae. Actualizar nunca toca tus marcas ni tus videos." },
  { vista: "mantenimiento", sel: "[data-guia=almacenamiento]", t: "Almacenamiento", x: "Qué ocupa espacio y qué puedes liberar. Nada se borra solo y todo va a la Papelera de reciclaje." },
  { vista: "mantenimiento", sel: "[data-guia=herramientas]", t: "Herramientas", x: "Enciende o apaga funciones. Antes de activar una ves qué instala, si usa internet y si cuesta créditos." },
  { vista: "inicio", t: "Listo para empezar", x: "Tu siguiente paso está en Primeros pasos. Puedes volver a ver este recorrido cuando quieras desde ahí o desde la barra lateral." }
];
var tourI = -1, GUIA = null; // tourI: -1 cerrado, -2 guía puntual, 0..n recorrido
function iniciarTour() {
  cerrarCapas(); GUIA = null;
  $("#tour").innerHTML = '<div class="tour-bloqueo"></div><div class="tour-foco" id="tour-foco"></div><div class="tour-globo" id="tour-globo" role="dialog" aria-modal="true" aria-labelledby="tour-t"></div>';
  irPasoTour(0);
}
function cerrarTour() { tourI = -1; if (vigia) { vigia.disconnect(); vigia = null; } $("#tour").innerHTML = ""; try { localStorage.setItem("panel-recorrido-visto", "1"); } catch (e) { } }
function irPasoTour(i) {
  tourI = i; var p = TOUR[i];
  if (p.prep) p.prep();
  if (p.vista) irA(p.vista); else render();
  pintarGlobo();
  setTimeout(function () { enfocar(p.sel); }, 90);
}
var vigia = null; // sigue los cambios de tamaño de lo destacado (barra de desplazamiento, imágenes que cargan)
function enfocar(sel) {
  var el = sel && document.querySelector(sel);
  if (vigia) { vigia.disconnect(); vigia = null; }
  if (el && window.ResizeObserver) { vigia = new ResizeObserver(function () { posicionarTour(); }); vigia.observe(el); vigia.observe(document.documentElement); }
  if (el && !el.closest(".lateral, .barra")) {
    var r = el.getBoundingClientRect(), movil = window.innerWidth <= 760;
    var destino = movil ? r.top + window.scrollY - 76 : r.top + window.scrollY - Math.max(90, (window.innerHeight - Math.min(r.height, window.innerHeight * 0.6)) / 2);
    window.scrollTo(0, Math.max(0, destino));
  }
  posicionarTour(); setTimeout(posicionarTour, 120); setTimeout(posicionarTour, 450);
}
function pintarGlobo() {
  var p = TOUR[tourI], g = $("#tour-globo"); if (!g) return;
  var x = typeof p.x === "function" ? p.x() : p.x, ultimo = tourI === TOUR.length - 1;
  g.innerHTML = '<span class="eyebrow">Recorrido · ' + (tourI + 1) + " de " + TOUR.length + '</span><h2 id="tour-t">' + esc(p.t) + "</h2><p>" + esc(x) + "</p>" +
    '<div class="tour-puntos" aria-hidden="true">' + TOUR.map(function (_, k) { return '<i class="' + (k === tourI ? "act" : k < tourI ? "ok" : "") + '"></i>'; }).join("") + "</div>" +
    '<div class="tour-botones">' + (ultimo ? "<span></span>" : '<button type="button" class="enlace" data-tour="saltar">Saltar recorrido</button>') + "<div>" +
    (tourI > 0 ? '<button type="button" class="btn btn-chico" data-tour="atras">Atrás</button>' : "") +
    '<button type="button" class="btn btn-pri btn-chico" data-tour="sig">' + (tourI === 0 ? "Empezar" : ultimo ? "Ir a Primeros pasos" : "Siguiente") + "</button></div></div>";
  var b = g.querySelector('[data-tour="sig"]'); if (b) b.focus({ preventScroll: true });
}
function posicionarTour() {
  if (tourI === -1) return;
  var p = tourI === -2 ? GUIA : TOUR[tourI], foco = $("#tour-foco"), g = $("#tour-globo"), el = p && p.sel ? document.querySelector(p.sel) : null, bl = $(".tour-bloqueo");
  if (!foco || !g) return;
  if (!el) { foco.style.display = "none"; g.className = "tour-globo centrado"; g.style.left = g.style.top = ""; if (bl) bl.classList.add("oscuro"); return; }
  if (bl) bl.classList.remove("oscuro");
  var r = el.getBoundingClientRect(), pad = 6;
  foco.style.display = "block"; foco.style.left = (r.left - pad) + "px"; foco.style.top = (r.top - pad) + "px"; foco.style.width = (r.width + pad * 2) + "px"; foco.style.height = (r.height + pad * 2) + "px";
  if (window.innerWidth <= 760) { g.className = "tour-globo abajo"; g.style.left = g.style.top = ""; return; }
  g.className = "tour-globo";
  var gw = g.offsetWidth, gh = g.offsetHeight, top = r.bottom + 14;
  if (top + gh > window.innerHeight - 12) top = r.top - gh - 14;
  if (top < 12) { top = Math.min(Math.max(12, r.top), window.innerHeight - gh - 12); var izq = r.right + 14; g.style.left = (izq + gw < window.innerWidth - 12 ? izq : Math.max(12, r.left - gw - 14)) + "px"; g.style.top = top + "px"; return; }
  g.style.left = Math.min(Math.max(12, r.left), window.innerWidth - gw - 12) + "px"; g.style.top = top + "px";
}
// Guía puntual: destaca un lugar de la pantalla sin bloquear (se puede tocar lo destacado)
function guiar(sel, t, x) {
  GUIA = { sel: sel }; tourI = -2;
  $("#tour").innerHTML = '<div class="tour-foco" id="tour-foco"></div><div class="tour-globo" id="tour-globo" role="dialog" aria-labelledby="tour-t"><span class="eyebrow">Primeros pasos</span><h2 id="tour-t">' + esc(t) + "</h2><p>" + esc(x) + '</p><div class="tour-botones"><span></span><div><button type="button" class="btn btn-pri btn-chico" data-guiaok="1">Entendido</button></div></div></div>';
  setTimeout(function () { enfocar(sel); }, 90);
}
function cerrarGuia() { if (tourI === -2) { tourI = -1; GUIA = null; if (vigia) { vigia.disconnect(); vigia = null; } $("#tour").innerHTML = ""; } }
window.addEventListener("resize", posicionarTour);
window.addEventListener("scroll", function () { if (tourI !== -1) posicionarTour(); }, true);
document.addEventListener("click", function (e) {
  var b = e.target.closest("[data-touriniciar], [data-tour], [data-guiaok]"); if (!b) return;
  if (b.dataset.guiaok) { cerrarGuia(); return; }
  if (b.dataset.touriniciar) { iniciarTour(); return; }
  var a = b.dataset.tour;
  if (a === "sig") { if (tourI === TOUR.length - 1) { cerrarTour(); irA("inicio"); window.scrollTo(0, 0); } else irPasoTour(tourI + 1); }
  else if (a === "atras") irPasoTour(Math.max(0, tourI - 1));
  else if (a === "saltar") { cerrarTour(); toast("Puedes ver el recorrido cuando quieras desde Primeros pasos."); }
});
document.addEventListener("keydown", function (e) {
  if (tourI === -1) return;
  if (tourI === -2) { if (e.key === "Escape") { e.stopImmediatePropagation(); cerrarGuia(); } return; }
  if (e.key === "Escape") { e.stopImmediatePropagation(); cerrarTour(); }
  else if (e.key === "ArrowRight" && tourI < TOUR.length - 1) irPasoTour(tourI + 1);
  else if (e.key === "ArrowLeft" && tourI > 0) irPasoTour(tourI - 1);
  else if (e.key === "Tab") { var f = Array.prototype.slice.call(document.querySelectorAll("#tour-globo button")); if (!f.length) return; var i = f.indexOf(document.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }
}, true);
