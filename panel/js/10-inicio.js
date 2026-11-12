// ---------- Primeros pasos: cada paso se marca solo leyendo la carpeta y tiene su acción ----------
var nm = null; // borrador de "Crear mi marca aquí"

function listaPasos(m) {
  var inst = E.instalacion, faltan = inst ? (inst.piezas || []).filter(function (p) { return !p.quedo && p.imprescindible; }) : [];
  var enviado = !!m && m.pedidos.some(function (p) { return p.estado !== "borrador" && p.estado !== "entregado"; });
  var L = [
    { id: "instalar", t: "Instalar", hecho: !!inst && !faltan.length, faltan: faltan, det: "Se marca solo cuando el instalador termina con todo en OK." },
    { id: "abrir", t: "Abrir la carpeta en tu app", hecho: !!E.ultimaConversacion || E.marcas.some(function (x) { return /^completa/i.test(x.estadoFicha); }), det: "Se marca solo cuando el agente trabaja por primera vez en la carpeta." },
    { id: "marca", t: "Crear tu marca", hecho: E.marcas.length > 0, det: "Se marca solo cuando la marca existe en la carpeta." },
    { id: "ficha", t: "Completar tu marca con el agente", hecho: !!m && m.pasos.ficha, det: "Se marca solo cuando la ficha de la marca queda completa." },
    { id: "colores", t: "Elegir tus colores", hecho: !!m && m.pasos.colores, det: "Se marca solo cuando la marca tiene colores propios que pasan las 4 pruebas de contraste." },
    { id: "material", t: "Subir tu logo y tu material", hecho: !!m && m.pasos.material, det: "Se marca solo cuando la marca tiene logo o el agente ordenó algo de la bandeja." }
  ];
  if (moduloActivo("personaje")) L.push({ id: "personaje", t: "Personaje", opcional: true, hecho: !!m && m.pasos.personaje, det: "Se marca solo cuando apruebas el personaje o decides no usarlo." });
  L.push({ id: "musica", t: "Música", opcional: true, hecho: moduloActivo("musica") || !!E.musicaIncluida, det: "Se marca solo cuando activas el catálogo o decides usar las 5 incluidas." });
  if (moduloActivo("plan")) L.push({ id: "plan", t: "Armar el plan del mes", opcional: true, hecho: !!m && m.pasos.plan, det: "Se marca solo cuando hay un plan guardado." });
  L.push({ id: "video", t: "Tu primer video", hecho: !!m && m.pasos.video, enviado: enviado, det: "Se marca solo cuando hay un video entregado." });
  return L;
}
function pasoActual(L) { return L.filter(function (p) { return !p.hecho && !p.opcional && !p.enviado; })[0] || null; }

function campoNm(id, k, et, ayuda, tipo) { return '<label class="campo"><span class="et">' + et + '</span><input type="' + (tipo || "text") + '" id="' + id + '" data-nm="' + k + '" value="' + esc(nm[k] || "") + '" maxlength="200">' + (ayuda ? '<span class="ayuda">' + ayuda + "</span>" : "") + "</label>"; }
function formMarca() {
  return '<div class="form">' +
    '<div class="fila-form">' + campoNm("nm-nombre", "nombre", "Nombre de tu marca *", "") + campoNm("nm-rubro", "rubro", "¿Qué vendes o haces? *", "Por ejemplo: pastelería de cumpleaños en Viña del Mar") + "</div>" +
    '<div class="fila-form">' + campoNm("nm-publico", "publico", "¿A quién le hablas?", "Por ejemplo: mamás y papás que organizan cumpleaños") + campoNm("nm-redes", "redes", "Tu web o tus redes", "El agente saca de ahí colores, letras y logo") + "</div>" +
    '<fieldset class="campo"><legend>¿Cómo le hablas a tu público?</legend><div class="opciones">' +
    ["Tú", "Usted"].map(function (v) { return '<label class="opt"><input type="radio" name="nm-trato" value="' + v + '" data-nm="trato"' + (nm.trato === v ? " checked" : "") + "><strong>" + v + "</strong><span>" + (v === "Tú" ? "Cercano" : "Más formal") + "</span></label>"; }).join("") + "</div></fieldset>" +
    '<label class="campo"><span class="et">Tu logo (opcional)</span><input type="file" id="nm-logo" accept=".svg,.png,.jpg,.jpeg,.webp"><span class="ayuda">' + (nm.logo ? "Elegido: " + esc(nm.logo.name) : "Mejor SVG o PNG sin fondo. Si no lo tienes a mano, lo subes después.") + "</span></label>" +
    '<div class="accion-paso"><button class="btn btn-pri" type="button" data-guardarmarca="1"' + (nm.guardando ? " disabled" : "") + ">" + (nm.guardando ? "Creando…" : "Crear la marca") + '</button><button class="btn" type="button" data-cancelarmarca="1">Cancelar</button></div>' +
    '<p class="muted chico">La marca queda como la activa. Después, en ' + esc(appNombre()) + ", el agente completa tu ficha conversando contigo: tono, temas, slogan y lo demás.</p></div>";
}

function cuerpoPaso(p, m) {
  var h = "", ai = appInfo();
  if (p.id === "instalar") {
    h = "<p>" + (p.hecho ? "Quedó todo instalado. Si algo deja de funcionar, se repara con un clic." : "Doble clic en Instalar.bat, elige tu app y espera el resumen: todo en OK.") + "</p>" +
      (p.faltan.length ? '<div class="ojo"><strong>Falta:</strong> ' + esc(p.faltan.map(function (x) { return x.pieza; }).join(", ")) + ".</div>" : "") +
      '<div class="accion-paso"><button class="btn btn-chico" type="button" id="btn-reparar">Reparar instalación</button></div>';
  } else if (p.id === "abrir") {
    h = '<div class="accion-paso"><span class="eyebrow">Tu app</span>' + selectorApp() + "</div>" + pasosMan(ai.abrir.map(esc)) +
      '<div class="botones-fila"><span class="mono" style="overflow-wrap:anywhere">' + esc(E.sistema.raiz) + '</span><button class="btn btn-pri btn-chico" type="button" data-copiar-ruta="1">Copiar la ruta de la carpeta</button><button class="btn btn-chico" type="button" data-abrir=".">Abrir la carpeta</button></div>' +
      '<p class="chico">' + esc(ai.permiso) + " Cuando la abras, escribe esto en " + esc(appNombre()) + ":</p>" + decile("Hola, quiero empezar.");
  } else if (p.id === "marca") {
    if (nm) h = formMarca();
    else if (p.hecho) h = "<p>" + (E.marcas.length === 1 ? "Tu marca está creada: <strong>" + esc(E.marcas[0].nombre) + "</strong>." : "Tienes " + E.marcas.length + " marcas.") + '</p><div class="accion-paso"><button class="btn btn-chico" type="button" data-irmarca="ficha">Ver tu ficha</button><button class="btn btn-chico" type="button" data-crearmarca="1">Crear otra marca</button></div>';
    else h = '<p>Tu marca es lo que el agente usa en cada video: nombre, a qué te dedicas, a quién le hablas, tu logo y tus colores.</p><div class="puertas"><div class="puerta"><span class="eyebrow">Aquí, en 5 minutos</span><strong>Con un formulario corto</strong><span class="muted chico">Lo básico y tu logo. Después el agente completa el resto contigo.</span><div><button class="btn btn-pri btn-chico" type="button" data-crearmarca="1">Crear mi marca aquí</button></div></div>' +
      '<div class="puerta"><span class="eyebrow">Conversando</span><strong>En ' + esc(appNombre()) + '</strong><span class="muted chico">El agente te hace unas preguntas (unos 10 minutos).</span>' + decile("Hola, quiero crear mi marca.") + "</div></div>";
  } else if (p.id === "ficha") {
    if (!m) h = '<p class="muted">Primero crea tu marca.</p>';
    else {
      var falta = esencialesDe(m).filter(function (x) { return !x[1]; }).map(function (x) { return x[0]; });
      h = "<p>El agente completa tu ficha conversando: a qué te dedicas, a quién le hablas, cómo hablas, tus temas y, si quieres, el contexto (slogan, productos, horario). Te pregunta lo que falte.</p>" +
        (falta.length && !p.hecho ? '<p class="chico"><strong>Le falta:</strong> ' + esc(falta.join(", ")) + ".</p>" : "") +
        decile("Hola, completemos la ficha de mi marca.") + '<div class="accion-paso"><button class="btn btn-chico" type="button" data-irmarca="ficha">Ver tu ficha</button></div>';
    }
  } else if (p.id === "colores") {
    if (!m) h = '<p class="muted">Primero crea tu marca.</p>';
    else if (ui.arm && ui.arm.donde === "paso") h = armadorHtml(m) + (m.propuestas.length ? '<details class="mas"><summary>O elige una de las que propuso el agente</summary><div class="paletas">' + m.propuestas.map(function (x, i) { return tarjetaPropuesta(m, x, i); }).join("") + "</div></details>" : "") + decile("Arma mi paleta a partir de los colores de mi logo.");
    else if (p.hecho && m.paleta) h = "<p>Tus colores pasan las 4 pruebas de contraste.</p>" + muestras(m.paleta) + '<div class="accion-paso"><button class="btn btn-chico" type="button" data-armabrir="paso">Cambiar la paleta</button><button class="btn btn-chico" type="button" data-irmarca="visual">Verla en un reel de ejemplo</button></div>';
    else h = "<p>Elige tu color principal y te recomendamos colores que combinan, todos con el contraste probado. O elige una de las que propuso el agente.</p>" +
      '<div class="accion-paso"><button class="btn btn-pri btn-chico" type="button" data-armabrir="paso">Armar mi paleta desde un color</button></div>' +
      (m.propuestas.length ? '<p class="muted chico">Las que propuso el agente:</p><div class="paletas">' + m.propuestas.map(function (x, i) { return tarjetaPropuesta(m, x, i); }).join("") + "</div>" : decile("Proponme 3 paletas a partir de mi logo."));
  } else if (p.id === "material") {
    if (!m) h = '<p class="muted">Primero crea tu marca.</p>';
    else h = "<p>Tu logo va directo a tu marca. Las fotos de tu negocio y los videos que ya tengas quedan en la bandeja, y el agente los ordena cuando le hables.</p>" +
      '<div class="accion-paso"><label class="btn btn-pri btn-chico" for="paso-logo">' + (m.logo ? "Cambiar mi logo" : "Subir mi logo") + '</label><input type="file" id="paso-logo" accept=".svg,.png,.jpg,.jpeg,.webp" hidden>' + (m.logo ? '<img class="logo-mini" src="' + archivo(m.logo) + '" alt="Tu logo">' : "") + "</div>" +
      '<label class="soltar" id="soltar-paso" for="paso-archivos"><strong>Arrastra aquí tus fotos y videos, o haz clic para elegirlos</strong><span class="muted chico">' + (E.bandeja.length ? E.bandeja.length + " archivo(s) esperando en la bandeja" : "Hasta 16 GB por archivo") + '</span><input type="file" id="paso-archivos" multiple></label>' +
      '<div class="subidas" id="subidas"></div>' + decile("Ordena lo que dejé en la bandeja.");
  } else if (p.id === "personaje") {
    var listo = m && m.personaje.prueba && !/^aprobado/i.test(m.personaje.estado);
    h = "<p>Una mascota que aparece igual en todos tus videos. Es opcional: muchas marcas no la usan.</p>" +
      (p.hecho ? "" : '<div class="accion-paso"><button class="btn btn-chico" type="button" data-sinpersonaje="1">No quiero personaje</button>' + (listo ? '<button class="btn btn-pri btn-chico" type="button" data-abrir="' + esc(m.personaje.prueba) + '">Ver la prueba de 5 segundos</button>' : "") + "</div>") +
      decile(listo ? "Me gusta el personaje, apruébalo." : "Quiero un personaje para mi marca.");
  } else if (p.id === "musica") {
    h = "<p>Ya tienes 5 músicas libres. Con una cuenta gratis de HyperFrames tienes miles más.</p>" +
      (p.hecho ? "" : '<div class="accion-paso"><button class="btn btn-pri btn-chico" type="button" data-irmodulo="musica">Activar la música del catálogo</button><button class="btn btn-chico" type="button" data-musicaincluida="1">Por ahora uso las 5 incluidas</button></div>');
  } else if (p.id === "plan") {
    h = "<p>El agente arma el mes con tu objetivo, tus temas y las fechas importantes. Cada idea del plan se puede pedir como video.</p>" + decile("Arma el plan de este mes: 2 videos por semana.");
  } else if (p.id === "video") {
    h = p.hecho ? '<p>Ya tienes tu primer video entregado. Los siguientes los pides en <a class="enlace" href="#pedidos">Pedidos</a> o conversando.</p>'
      : p.enviado ? "<p><strong>Pedido enviado.</strong> Abre " + esc(appNombre()) + " y escribe «hola»: el agente lo revisa y te pregunta lo que falte. Después apruebas el guion, grabas tu voz y apruebas la muestra.</p>" + '<div class="accion-paso"><a class="btn btn-chico" href="#pedidos">Ver el pedido</a></div>'
        : '<p>Para probar, un video animado de 30 segundos presentando tu negocio. Dejamos lo básico listo; tú escribes el mensaje.</p><div class="accion-paso"><button class="btn btn-pri" type="button" data-primervideo="1"' + (m ? "" : " disabled") + '>Pedir mi primer video</button></div>' + decile("Hagamos un video de 30 segundos presentando mi negocio.");
  }
  return h + '<span class="detecta">' + esc(p.det) + "</span>";
}

vistas.inicio = function () {
  var m = marcaVista(), L = listaPasos(m), hechos = L.filter(function (p) { return p.hecho; }).length, act = pasoActual(L);
  var abierto = ui.pasoAbierto === undefined || ui.pasoAbierto === null ? (act && act.id) : ui.pasoAbierto;
  if (act && act.id === "colores" && abierto === "colores" && !ui.arm && m) abrirArmador("paso", m);
  var html = '<div class="cabeza"><span class="eyebrow">Primeros pasos' + (E.marcas.length > 1 && m ? " · " + esc(m.nombre) : "") + "</span><h1>" + (act ? "Empieza por aquí" : "Todo listo para hacer videos") + '</h1><p class="muted">Cada paso tiene un botón para hacerlo aquí, o te dice qué escribirle al agente. Se marca solo cuando queda hecho en la carpeta.</p></div>';
  html += '<div class="progreso-top"><div class="barra-prog" role="img" aria-label="' + hechos + " de " + L.length + ' pasos"><i style="width:' + Math.round(hechos / L.length * 100) + '%"></i></div><strong>' + hechos + " de " + L.length + '</strong><button class="btn btn-chico" type="button" data-touriniciar="1">Ver el recorrido del panel</button></div>';
  html += '<div style="display:flex;flex-direction:column;gap:10px">' + L.map(function (p, i) {
    var esAct = act && p.id === act.id, cls = p.hecho ? " hecho" : esAct ? " actual" : "";
    var pill = p.hecho ? '<span class="pill p-ok">Hecho</span>' : p.enviado ? '<span class="pill p-azul">En curso</span>' : esAct ? '<span class="pill p-azul">Ahora</span>' : p.opcional ? '<span class="pill p-gris">Opcional</span>' : '<span class="pill p-gris">Pendiente</span>';
    return '<details class="paso' + cls + '"' + (p.id === abierto ? " open" : "") + '><summary data-pasoabrir="' + p.id + '"><span class="num">' + (p.hecho ? "✓" : i + 1) + "</span><strong>" + esc(p.t) + "</strong>" + pill + '</summary><div class="cuerpo">' + cuerpoPaso(p, m) + "</div></details>";
  }).join("") + "</div>";
  html += '<section class="tarjeta"><h2>Después de empezar</h2><p class="muted">El día a día pasa en tu app. Vuelves al panel para:</p><div class="grid g2">' +
    '<a class="tarjeta" href="#pedidos" style="text-decoration:none;color:inherit"><strong>Pedidos</strong><span class="muted chico">Pedir un video con un formulario, con archivos pesados y referencias.</span></a>' +
    '<a class="tarjeta" href="#verificar" style="text-decoration:none;color:inherit"><strong>Verificar</strong><span class="muted chico">Revisar tu marca, el plan y los videos en curso.</span></a>' +
    '<a class="tarjeta" href="#subir" style="text-decoration:none;color:inherit"><strong>Subir</strong><span class="muted chico">Dejar fotos, música o un kit de marca para el agente.</span></a>' +
    '<a class="tarjeta" href="#mantenimiento" style="text-decoration:none;color:inherit"><strong>Mantenimiento</strong><span class="muted chico">Actualizar, encender herramientas y liberar espacio.</span></a></div></section>';
  return html;
};
function prepararPaso() {
  prepararZona($("#soltar-paso"), $("#paso-archivos"), function (files) { encolar(files, null); });
  var lg = $("#paso-logo"), m = marcaVista();
  if (lg && m) lg.addEventListener("change", function () { if (lg.files.length) encolar([lg.files[0]], { marca: m.id, tipo: "logo" }); lg.value = ""; });
}

function crearMarcaAqui() {
  if (!(nm.nombre || "").trim() || !(nm.rubro || "").trim()) { toast("Falta el nombre y a qué se dedica."); return; }
  nm.guardando = true; render();
  api("/api/marca", { nombre: nm.nombre, rubro: nm.rubro, publico: nm.publico || "", redes: nm.redes || "", trato: nm.trato || "" }).then(function (r) {
    if (r.error) { nm.guardando = false; render(); toast(r.error); return; }
    var logo = nm.logo; nm = null; ui.marca = r.id; ui.pasoAbierto = null; recordar();
    if (logo) encolar([logo], { marca: r.id, tipo: "logo" });
    toast("Marca creada. Abre " + appNombre() + " y escribe «hola»: el agente completa la ficha contigo.");
    textoE = ""; refrescar();
  }).catch(function () { nm.guardando = false; render(); toast("No se pudo crear la marca."); });
}

function clicInicio(t, d) {
  if (d.crearmarca) { nm = { trato: "Tú" }; ui.pasoAbierto = "marca"; render(); var c = $("#nm-nombre"); if (c) c.focus(); return true; }
  if (d.cancelarmarca) { nm = null; render(); return true; }
  if (d.guardarmarca) { crearMarcaAqui(); return true; }
  if (d.irmarca) { ui.tabVer = "marca"; ui.subMarca = d.irmarca; recordar(); irA("verificar"); return true; }
  if (d.sinpersonaje) { var m = marcaVista(); api("/api/ficha", { marca: m.id, campo: "¿Tiene personaje?", valor: "no" }).then(function (r) { toast(r.error || "Anotado en tu ficha: sin personaje. Puedes cambiarlo cuando quieras."); textoE = ""; refrescar(); }); return true; }
  if (d.musicaincluida) { api("/api/ajustes", { musicaIncluida: true }).then(function (r) { toast(r.error || "Listo: usas las 5 músicas incluidas. Puedes activar el catálogo cuando quieras."); textoE = ""; refrescar(); }); return true; }
  if (d.irmodulo) {
    ui.pendiente = d.irmodulo; irA("mantenimiento");
    setTimeout(function () { guiar('[data-modcard="' + d.irmodulo + '"]', "Activar la música del catálogo", "Aquí ves qué implica. Toca «Activar». Después abre Conectar-musica.bat para entrar con tu cuenta gratis de HyperFrames."); }, 150);
    return true;
  }
  if (d.primervideo) { var mm = marcaVista(); if (mm) nuevoPedido({ primero: true, titulo: "Presentación de " + mm.nombre, tipo: "Animado", foco: "Anunciar", duracion: "30", plataformas: ["Instagram Reels"], paso: 1 }); return true; }
  if (d.irpaso) { ui.pasoAbierto = d.irpaso; irA("inicio"); window.scrollTo(0, 0); return true; }
  return false;
}
document.addEventListener("click", function (e) {
  var s = e.target.closest("summary[data-pasoabrir]"); if (!s) return;
  e.preventDefault();
  var m = marcaVista(), act = pasoActual(listaPasos(m)), abierto = ui.pasoAbierto === undefined || ui.pasoAbierto === null ? (act && act.id) : ui.pasoAbierto, id = s.dataset.pasoabrir;
  ui.pasoAbierto = abierto === id ? "__ninguno" : id; render();
});
document.addEventListener("input", function (e) { var t = e.target; if (nm && t.dataset && t.dataset.nm && t.type !== "radio") nm[t.dataset.nm] = t.value; });
document.addEventListener("change", function (e) {
  var t = e.target; if (!nm || !t.dataset) return;
  if (t.dataset.nm && t.type === "radio") nm[t.dataset.nm] = t.value;
  if (t.id === "nm-logo" && t.files.length) { nm.logo = t.files[0]; render(); }
});
