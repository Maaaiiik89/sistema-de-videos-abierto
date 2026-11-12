// ---------- Pedidos: pedir un video con un formulario (o ver los que se pidieron conversando) ----------
var EST_PED = {
  "borrador": ["Borrador", "p-gris", "Guardado sin enviar: el agente todavía no lo ve."],
  "enviado": ["Enviado", "p-azul", "El agente lo verá apenas le hables en tu app."],
  "con preguntas": ["El agente necesita algo", "p-warn", "Responde aquí o en el chat."],
  "respondido": ["Respondiste", "p-azul", "El agente revisa tus respuestas cuando le hables y te muestra el resumen para que lo confirmes."],
  "confirmado": ["Confirmado", "p-azul", "Confirmaste el resumen: el agente ya puede empezar."],
  "en producción": ["En producción", "p-azul", "El agente está trabajando en el video."],
  "entregado": ["Entregado", "p-ok", "Listo: está en entregas."]
};
var FLUJO = ["Enviado", "Revisado por el agente", "Confirmado por ti", "Guion", "Voz", "Muestra", "Borrador", "Entregado"];
var PASOS_F = ["Marca", "El video", "Dónde y cuánto", "Cómo se ve y suena", "Referencias", "Material", "Revisar y enviar"];
var REDES_F = [["Instagram Reels", "9:16"], ["TikTok", "9:16"], ["YouTube Shorts", "9:16"], ["YouTube", "16:9"], ["LinkedIn", "9:16 o 1:1"], ["Facebook", "9:16"]];
var ETIQ = { estilo: { marca: "El de la marca", referencias: "Como las referencias", agente: "Que proponga el agente" }, voz: { mia: "Mi voz", ia: "Voz con IA", ninguna: "Sin voz" }, musica: { marca: "La de la marca", elegir: "Elegirla con el agente", sin: "Sin música" } };

function nuevoPedido(pre) {
  var m = marcaVista();
  ui.form = Object.assign({ paso: 0, marca: m ? m.id : "nueva", nm: { nombre: "", rubro: "", publico: "", redes: "", trato: "Tú" }, titulo: "", tipo: "", foco: "", mensaje: "", accion: "", fecha: "", desdePlan: "",
    plataformas: [], duracion: "30", estilo: "marca", voz: "mia", musica: "marca", personaje: m && m.pasos.personaje && !/^no/i.test(m.resumen.tienePersonaje) ? "si" : "no", subtitulos: "si", refs: [{ u: "", g: "" }], archivos: [],
    limite: m ? (String(m.resumen.limite).match(/\d+/) || ["0"])[0] : "0", notas: "", carpeta: null }, pre || {});
  ui.enviado = null; irA("pedidos"); window.scrollTo(0, 0);
  setTimeout(function () { var c = $(ui.form && ui.form.paso === 1 ? "#f-mensaje" : "#f-titulo"); if (c && ui.form.primero) c.focus(); }, 120);
}
function formMarcaObj() { var f = ui.form; return f.marca === "nueva" ? null : E.marcas.filter(function (x) { return x.id === f.marca; })[0] || null; }
function pasoCompleto(i) {
  var f = ui.form;
  if (i === 0) return f.marca !== "nueva" || !!(f.nm.nombre && f.nm.rubro);
  if (i === 1) return !!(f.titulo && f.tipo && f.mensaje);
  if (i === 2) return f.plataformas.length > 0;
  return true;
}
function opcion(nombre, valor, titulo, ayuda, actual, tipo) {
  var marcado = tipo === "checkbox" ? actual.indexOf(valor) >= 0 : actual === valor;
  return '<label class="opt"><input type="' + (tipo || "radio") + '" name="' + nombre + '" value="' + esc(valor) + '" data-f="' + nombre + '"' + (marcado ? " checked" : "") + "><strong>" + esc(titulo) + "</strong>" + (ayuda ? "<span>" + esc(ayuda) + "</span>" : "") + "</label>";
}
function texto(id, campo, etiqueta, val, ayuda, tipo) {
  return '<label class="campo"><span class="et">' + etiqueta + '</span><input type="' + (tipo || "text") + '" id="' + id + '" data-f="' + campo + '" value="' + esc(val || "") + '" maxlength="300">' + (ayuda ? '<span class="ayuda">' + ayuda + "</span>" : "") + "</label>";
}
function carpetaForm() { var f = ui.form; return (f.fecha || hoyISO()) + "_" + (slug(f.titulo || "video") || "video"); }
function idMarcaForm() { var f = ui.form; return f.marca === "nueva" ? slug(f.nm.nombre || "marca nueva") || "marca-nueva" : f.marca; }
function formatos() {
  var f = []; ui.form.plataformas.forEach(function (p) { var r = REDES_F.filter(function (x) { return x[0] === p; })[0]; var fo = r && r[1].indexOf("16:9") === 0 ? "16:9" : "9:16"; if (f.indexOf(fo) < 0) f.push(fo); });
  return f;
}
function ideasDelPlan(m) {
  if (!m || !m.planes.length) return [];
  var p = planActual(m);
  return p.videos.map(function (v, i) { return { i: i, t: v["Título"] || "", fecha: /^\d{4}-\d{2}-\d{2}$/.test(v.Fecha || "") ? v.Fecha : "", redes: v.Redes || "", tipo: v.Tipo || "", etapa: etapaDe(v.Etapa) }; })
    .filter(function (x) { return x.t && x.etapa === 0; });
}

function pasoForm() {
  var f = ui.form, m = formMarcaObj(), h = "";
  if (f.paso === 0) {
    h += '<fieldset class="campo"><legend>¿Para qué marca es?</legend><div class="opciones">' + E.marcas.map(function (x) { return opcion("marca", x.id, x.nombre, x.resumen.rubro, f.marca); }).join("") + opcion("marca", "nueva", "Una marca nueva", "La creamos con este pedido", f.marca) + "</div></fieldset>";
    if (f.marca === "nueva") {
      h += '<div class="fila-form">' + texto("f-nm-nombre", "nm.nombre", "Nombre de la marca *", f.nm.nombre) + texto("f-nm-rubro", "nm.rubro", "¿Qué vendes o haces? *", f.nm.rubro, "Por ejemplo: pastelería de cumpleaños en Viña del Mar") + "</div>";
      h += '<div class="fila-form">' + texto("f-nm-publico", "nm.publico", "¿A quién le hablas?", f.nm.publico) + texto("f-nm-redes", "nm.redes", "Tu web o tus redes", f.nm.redes, "El agente saca de ahí colores, letras y logo") + "</div>";
      h += '<p class="muted chico">El logo lo subes en el paso Material. El tono, los temas y el personaje los completa el agente conversando contigo.</p>';
    }
  } else if (f.paso === 1) {
    var ideas = ideasDelPlan(m);
    if (ideas.length) h += '<label class="campo"><span class="et">¿Viene del plan del mes?</span><select id="f-plan" data-f="desdePlan"><option value="">No, es un video nuevo</option>' + ideas.map(function (x) { return '<option value="' + x.i + '"' + (String(x.i) === f.desdePlan ? " selected" : "") + ">" + esc(x.t) + (x.fecha ? " (" + x.fecha + ")" : "") + "</option>"; }).join("") + '</select><span class="ayuda">Si eliges una idea del plan, se llenan el nombre, la fecha y las redes.</span></label>';
    h += texto("f-titulo", "titulo", "Nombre del video *", f.titulo, "Corto, para reconocerlo: «Pan de Pascua»");
    h += '<fieldset class="campo"><legend>Tipo de video *</legend><div class="opciones">' + opcion("tipo", "Animado", "Animado", "Tu voz y la animación con tu marca", f.tipo) + opcion("tipo", "Grabado", "Grabado", "Lo grabas tú: celular o pantalla", f.tipo) + opcion("tipo", "Mixto", "Mixto", "Tú a cámara con animaciones", f.tipo) + "</div></fieldset>";
    h += '<fieldset class="campo"><legend>¿Para qué es?</legend><div class="opciones">' + [["Vender", "Un producto, una oferta"], ["Enseñar", "Un consejo, un cómo se hace"], ["Anunciar", "Algo nuevo, un horario, un evento"], ["Detrás de escena", "Cómo trabajas"], ["Testimonio", "Un cliente cuenta su experiencia"], ["Otro", "Lo cuentas en el mensaje"]].map(function (o) { return opcion("foco", o[0], o[0], o[1], f.foco); }).join("") + "</div></fieldset>";
    h += '<label class="campo"><span class="et">El mensaje en una frase *</span><textarea id="f-mensaje" data-f="mensaje" maxlength="600">' + esc(f.mensaje) + '</textarea><span class="ayuda">Lo único que tiene que recordar quien lo ve.</span></label>';
    h += '<div class="fila-form">' + texto("f-accion", "accion", "¿Qué debe hacer quien lo ve?", f.accion, "Por ejemplo: pedir por WhatsApp") + texto("f-fecha", "fecha", "Fecha de publicación", f.fecha, "", "date") + "</div>";
  } else if (f.paso === 2) {
    h += '<fieldset class="campo"><legend>¿Dónde se publica? *</legend><div class="opciones">' + REDES_F.map(function (r) { return opcion("plataformas", r[0], r[0], r[1], f.plataformas, "checkbox"); }).join("") + "</div></fieldset>";
    var fo = formatos();
    if (fo.length) h += '<p class="chico"><strong>Se entrega en:</strong> ' + fo.map(function (x) { return x === "16:9" ? "16:9 (horizontal)" : "9:16 (vertical)"; }).join(" y ") + (fo.length > 1 ? ", desde el mismo proyecto." : ".") + "</p>";
    h += '<fieldset class="campo"><legend>Duración</legend><div class="opciones">' + [["15", "15 s", "Un dato o una oferta"], ["30", "30 s", "Lo más usado"], ["45", "45 s", ""], ["60", "60 s", "Un consejo con pasos"], ["90", "90 s", ""], ["largo", "Más largo", "Para YouTube"]].map(function (o) { return opcion("duracion", o[0], o[1], o[2], f.duracion); }).join("") + "</div></fieldset>";
    var vert = f.plataformas.some(function (p) { return /Reels|TikTok|Shorts/.test(p); });
    if (vert && (f.duracion === "90" || f.duracion === "largo")) h += '<div class="decile aviso-suave"><span class="eyebrow">Ojo</span>En Reels, TikTok y Shorts, los videos de más de un minuto suelen perder gente. El agente te lo va a comentar al revisar el pedido.</div>';
  } else if (f.paso === 3) {
    h += '<fieldset class="campo"><legend>Estilo</legend><div class="opciones">' + opcion("estilo", "marca", "El de mi marca", "Tus colores y letras", f.estilo) + opcion("estilo", "referencias", "Como mis referencias", "Las pones en el paso siguiente", f.estilo) + opcion("estilo", "agente", "Que proponga el agente", "Dentro de tu marca", f.estilo) + "</div></fieldset>";
    h += '<fieldset class="campo"><legend>Voz</legend><div class="opciones">' + opcion("voz", "mia", "Mi voz", "La grabas después del guion", f.voz) + opcion("voz", "ia", "Voz con IA", "Cuesta créditos", f.voz) + opcion("voz", "ninguna", "Sin voz", "Solo texto y música", f.voz) + "</div></fieldset>";
    if (f.voz === "ia") h += '<p class="chico" style="color:var(--warn)">La voz con IA cuesta créditos y necesita la herramienta Voz con IA. El agente te dice el precio y espera tu sí; en el último paso puedes poner el límite de este video.</p>';
    h += '<fieldset class="campo"><legend>Música</legend><div class="opciones">' + opcion("musica", "marca", "La de mi marca", m && m.resumen.musica && !vacioV(m.resumen.musica) ? m.resumen.musica.replace(/`/g, "") : "", f.musica) + opcion("musica", "elegir", "Elegirla con el agente", "Te propone 3", f.musica) + opcion("musica", "sin", "Sin música", "", f.musica) + "</div></fieldset>";
    h += '<div class="fila-form"><fieldset class="campo"><legend>Personaje</legend><div class="opciones">' + opcion("personaje", "si", "Sí", m && m.resumen.personaje ? m.resumen.personaje : "Si la marca tiene", f.personaje) + opcion("personaje", "no", "No", "", f.personaje) + '</div></fieldset><fieldset class="campo"><legend>Subtítulos</legend><div class="opciones">' + opcion("subtitulos", "si", "Sí", "Con el color de tu marca", f.subtitulos) + opcion("subtitulos", "no", "No", "", f.subtitulos) + "</div></fieldset></div>";
  } else if (f.paso === 4) {
    var mod = E.modulos.filter(function (x) { return x.id === "referencias"; })[0];
    h += '<p class="muted">Videos de otras cuentas que te gustan. El agente toma su forma (ritmo, cómo empieza, cómo entran los textos), nunca su contenido. Es opcional.</p>';
    if (mod && !mod.activo) h += '<div class="decile aviso-suave"><span class="eyebrow">Referencias de video está apagada</span>Puedes pegar los links igual: el agente te ofrecerá activarla para bajarlos. O sube el video en el paso Material. <a class="enlace" href="#mantenimiento">Activarla en Mantenimiento</a></div>';
    h += f.refs.map(function (r, i) {
      var dificil = /instagram\.com|youtube\.com|youtu\.be/i.test(r.u), malo = r.u && !/^https:\/\/\S+$/i.test(r.u);
      return '<div class="ref-fila"><label class="campo"><span class="et">Link ' + (i + 1) + '</span><input type="url" id="f-ref-u-' + i + '" data-refu="' + i + '" value="' + esc(r.u) + '" placeholder="https://www.tiktok.com/@cuenta/video/…" maxlength="300"></label><label class="campo"><span class="et">¿Qué te gusta de este?</span><input type="text" id="f-ref-g-' + i + '" data-refg="' + i + '" value="' + esc(r.g) + '" placeholder="El ritmo, cómo empieza, los textos…" maxlength="300"></label><button class="btn btn-chico" type="button" data-refquitar="' + i + '" aria-label="Quitar el link ' + (i + 1) + '">Quitar</button></div>' +
        (malo ? '<p class="chico" style="color:var(--warn);margin-top:-10px">El link debe empezar con https://</p>' : dificil ? '<p class="muted chico" style="margin-top:-10px">Instagram y YouTube a veces no dejan bajarlo sin iniciar sesión. Si pasa, guárdalo desde la app o grábalo de la pantalla y súbelo en Material.</p>' : "");
    }).join("");
    if (f.refs.length < 10) h += '<div><button class="btn btn-chico" type="button" data-refagregar="1">Agregar otro link</button></div>';
  } else if (f.paso === 5) {
    h += '<label class="soltar" id="soltar-form" for="f-archivos"><strong>Arrastra aquí tus archivos o haz clic para elegirlos</strong><span class="muted chico">Grabaciones, fotos, audios, documentos. Hasta 16 GB por archivo: los videos pesados van por aquí, no por el chat.</span><input type="file" id="f-archivos" multiple></label>';
    h += '<div class="accion-paso"><label class="btn btn-chico" for="f-logo">Agregar el logo de la marca</label><input type="file" id="f-logo" accept=".svg,.png,.jpg,.jpeg,.webp" hidden><span class="muted chico">Va al estilo de la marca, no al video.</span></div>';
    h += '<p class="muted chico">Lo que adjuntas en el chat se queda en la conversación y no llega a la carpeta: lo que se va a usar en el video súbelo aquí. Se sube al enviar el pedido.</p>';
    if (f.archivos.length) h += '<section class="tarjeta"><h3>Se van a subir (' + f.archivos.length + ")</h3><div>" + f.archivos.map(function (a, i) {
      return '<div class="archivo"><span class="tipo-a">' + (a.logo ? "Logo" : esc((a.file.name.split(".").pop() || "").toUpperCase().slice(0, 4))) + "</span><span><span>" + esc(a.file.name) + ' <span class="muted chico">' + tam(a.file.size) + '</span></span><br><span class="ruta">Irá a: ' + esc("marcas/" + idMarcaForm() + "/" + (a.logo ? "estilo/assets/logo/" : "videos/" + carpetaForm() + "/fuentes/")) + '</span></span><button class="btn btn-chico" type="button" data-archquitar="' + i + '">Quitar</button></div>';
    }).join("") + "</div></section>";
    h += '<label class="campo"><span class="et">Algo más que el agente deba saber</span><textarea id="f-notas" data-f="notas" maxlength="2000">' + esc(f.notas) + '</textarea><span class="ayuda">Por ejemplo: «en la grabación, lo bueno empieza en el minuto 2».</span></label>';
  } else {
    var faltan = [];
    if (f.marca === "nueva" && !(f.nm.nombre && f.nm.rubro)) faltan.push(["La marca nueva (nombre y a qué se dedica)", 0]);
    if (!f.titulo) faltan.push(["Nombre del video", 1]);
    if (!f.tipo) faltan.push(["Tipo de video", 1]);
    if (!f.mensaje) faltan.push(["El mensaje", 1]);
    if (!f.plataformas.length) faltan.push(["Dónde se publica", 2]);
    var filas = [["Marca", f.marca === "nueva" ? (f.nm.nombre || "Marca nueva") + " (nueva)" : (m ? m.nombre : ""), 0], ["Video", f.titulo || "—", 1], ["Tipo", f.tipo || "—", 1], ["Para qué", f.foco || "—", 1], ["Mensaje", f.mensaje || "—", 1], ["Llamado a la acción", f.accion || "—", 1], ["Publicar", f.fecha || "Sin fecha", 1],
      ["Redes", f.plataformas.join(", ") || "—", 2], ["Duración", f.duracion === "largo" ? "Más largo" : f.duracion + " s", 2], ["Voz", ETIQ.voz[f.voz], 3],
      ["Referencias", f.refs.filter(function (r) { return r.u; }).length + " link(s)", 4], ["Archivos", f.archivos.length + " archivo(s)", 5]];
    h += '<section class="tarjeta"><h3>Resumen</h3><div>' + filas.map(function (r) { return '<div class="fila-dato"><span class="muted">' + r[0] + "</span><span>" + esc(r[1]) + ' <button class="enlace chico" type="button" data-fpaso="' + r[2] + '">Cambiar</button></span></div>'; }).join("") + "</div></section>";
    if (faltan.length) h += '<div class="decile aviso-suave"><span class="eyebrow">Falta para enviarlo</span>' + faltan.map(function (x) { return "<span>" + x[0] + ' · <button class="enlace" type="button" data-fpaso="' + x[1] + '">completar</button></span>'; }).join("") + '<span class="muted chico">Lo puedes guardar como borrador y seguir después.</span></div>';
    h += '<div class="fila-form"><label class="campo"><span class="et">Límite de créditos para este video</span><input type="number" min="0" step="1" id="f-limite" data-f="limite" value="' + esc(f.limite) + '"><span class="ayuda">0 = nada que cueste dinero. El agente siempre te pregunta antes de gastar.</span></label></div>';
    if (f.voz === "ia" && Number(f.limite) === 0) h += '<p class="chico" style="color:var(--warn)">Elegiste voz con IA con el límite en 0: el agente te va a pedir que lo subas antes de generar la voz.</p>';
    h += '<section class="tarjeta"><h3>Lo que crea el panel al enviarlo</h3><pre class="arbol">mis-videos/marcas/' + esc(idMarcaForm()) + "/" + (f.marca === "nueva" ? "\n├── ficha.md          ← con lo que llenaste" : "") + "\n└── videos/" + esc(carpetaForm()) + "/\n    ├── PEDIDO.md       ← lo que pediste, para ti y para el agente\n    └── fuentes/        ← tus " + f.archivos.filter(function (a) { return !a.logo; }).length + ' archivos</pre><p class="muted chico">El panel nunca abre ni baja los links: los guarda como texto en el pedido.</p></section>';
  }
  return h;
}

vistas.pedidos = function () {
  var m = marcaVista(), html, f = ui.form;
  if (f) {
    html = '<div class="cabeza"><span class="eyebrow">' + (f.carpeta ? "Borrador" : "Nuevo pedido") + "</span><h1>" + esc(PASOS_F[f.paso]) + '</h1><p class="muted">Paso ' + (f.paso + 1) + " de " + PASOS_F.length + ". Lo que no sepas, déjalo en blanco: el agente te lo pregunta.</p></div>";
    if (f.primero) html += '<div class="decile"><span class="eyebrow">Tu primer video</span>Dejamos lo básico listo: animado, 30 segundos, para Instagram. Escribe el mensaje y revisa el resto. Es una prueba: nada se publica.</div>';
    html += '<nav class="stepper" aria-label="Pasos del pedido">' + PASOS_F.map(function (p, i) { var ok = pasoCompleto(i), cls = i < f.paso ? (ok ? ' class="listo"' : ' class="falta"') : ""; return '<button type="button" data-fpaso="' + i + '"' + (i === f.paso ? ' aria-current="step"' : "") + cls + '><span class="n">' + (i < f.paso ? (ok ? "✓" : "!") : i + 1) + "</span>" + p + (i < f.paso && !ok ? '<span class="sr-only"> (falta completar)</span>' : "") + "</button>"; }).join("") + "</nav>";
    html += '<section class="tarjeta form">' + pasoForm() + '<div class="nav-form"><div><button class="btn" type="button" data-fcancelar="1">Cancelar</button><button class="btn" type="button" data-fguardar="1"' + (f.guardando ? " disabled" : "") + '>Guardar borrador</button></div><div>' +
      (f.paso > 0 ? '<button class="btn" type="button" data-fpaso="' + (f.paso - 1) + '">Atrás</button>' : "") +
      (f.paso < PASOS_F.length - 1 ? '<button class="btn btn-pri" type="button" data-fpaso="' + (f.paso + 1) + '">Siguiente</button>' : '<button class="btn btn-pri" type="button" data-fenviar="1"' + (f.guardando ? " disabled" : "") + ">" + (f.guardando ? "Enviando…" : "Enviar al agente") + "</button>") + "</div></div></section>";
    return html;
  }
  html = '<div class="cabeza"><span class="eyebrow">Pedidos' + (E.marcas.length > 1 && m ? " · " + esc(m.nombre) : "") + '</span><h1>Pedir un video</h1><p class="muted">Pídelo conversando con el agente o con este formulario: los dos terminan en el mismo pedido, y el agente siempre lo revisa antes de empezar.</p></div>';
  if (ui.enviado) html += '<div class="listo-envio" role="status"><strong>Pedido enviado: «' + esc(ui.enviado) + '»</strong><span>Ahora abre ' + esc(appNombre()) + ' y escribe cualquier cosa, por ejemplo «hola». El agente ve el pedido, lo revisa y te pregunta lo que falte. Sus preguntas también aparecen aquí.</span><div class="subidas" id="subidas"></div><div><button class="btn btn-chico" type="button" data-cerrarenvio="1">Entendido</button></div></div>';
  html += '<div class="puertas"><div class="puerta"><span class="eyebrow">Conversando</span><strong>En ' + esc(appNombre()) + '</strong><span class="muted chico">Le cuentas qué video quieres; el agente escribe el pedido mientras conversan y aparece aquí.</span>' + decile("Quiero un video de 30 s para Instagram sobre mi producto estrella.") + "</div>" +
    '<div class="puerta"><span class="eyebrow">Con el formulario</span><strong>Aquí, en 7 pasos</strong><ul><li>Para videos pesados (hasta 16 GB)</li><li>Para el logo, las fotos o grabaciones que van en el video</li><li>Para llenar todo de una vez y gastar menos en el chat</li></ul><div><button class="btn btn-pri" type="button" data-nuevopedido="1">Nuevo pedido</button></div></div></div>';
  if (!m) return html + vacio("Todavía no hay ninguna marca", "Puedes crearla en el mismo pedido (elige «Una marca nueva») o en Primeros pasos.");
  html += '<section class="tarjeta" data-guia="pedidos-lista"><div class="tarjeta-head"><h2>Tus pedidos</h2><span class="muted chico">' + m.pedidos.length + " pedido" + (m.pedidos.length === 1 ? "" : "s") + "</span></div>" +
    (m.pedidos.length ? '<ul class="lista">' + m.pedidos.map(function (p) {
      var e = EST_PED[p.estado] || EST_PED.enviado, n = p.preguntas.filter(function (q) { return !q.respuesta; }).length;
      return '<li><span><button class="enlace" type="button" data-pedido="' + esc(p.carpeta) + '" style="text-align:left">' + esc(p.titulo || p.carpeta) + '</button><br><span class="muted chico">' + esc(p.creado) + ' · <span class="origen">Desde ' + (p.origen === "panel" ? "el panel" : "el chat") + "</span>" + (p.estado === "con preguntas" && n ? " · " + n + (n === 1 ? " pregunta" : " preguntas") : "") + '</span></span><span class="pill ' + e[1] + '">' + e[0] + "</span></li>";
    }).join("") + "</ul>" : '<p class="muted">Todavía no hay pedidos. Pide el primero con el formulario o conversando.</p>') + "</section>";
  return html;
};

function indiceFlujo(p) {
  if (p.estado === "entregado") return 7;
  var et = norm(p.etapaVideo);
  if (/revision/.test(et)) return 6; if (/animacion|muestra/.test(et)) return 5; if (/voz/.test(et)) return 4; if (/guion/.test(et)) return 3;
  return { "enviado": 0, "con preguntas": 1, "respondido": 1, "confirmado": 2, "en producción": 3 }[p.estado] || 0;
}
function abrirPedido(carpeta) {
  var m = marcaVista(), p = m && m.pedidos.filter(function (x) { return x.carpeta === carpeta; })[0]; if (!p) return;
  var e = EST_PED[p.estado] || EST_PED.enviado, k = indiceFlujo(p), sinResp = p.preguntas.some(function (q) { return !q.respuesta; });
  var h = '<div class="velo" data-cerrar="1"></div><aside class="hoja" role="dialog" aria-modal="true" aria-labelledby="t-ped"><div class="tarjeta-head"><h2 id="t-ped">' + esc(p.titulo) + '</h2><button class="btn btn-chico" type="button" data-cerrar="1">Cerrar</button></div>';
  h += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="pill ' + e[1] + '">' + e[0] + '</span><span class="origen">Desde ' + (p.origen === "panel" ? "el panel" : "el chat") + '</span><span class="muted chico">' + e[2] + "</span></div>";
  if (p.estado !== "borrador") h += '<div style="display:flex;flex-direction:column;gap:8px"><span class="eyebrow">Avance</span><ol class="etapas">' + FLUJO.map(function (x, i) { return '<li class="' + (i < k ? "hecha" : i === k ? "actual" : "") + '">' + x + "</li>"; }).join("") + "</ol></div>";
  if (p.preguntas.length) h += '<div style="display:flex;flex-direction:column;gap:8px"><span class="eyebrow">Preguntas del agente</span>' + p.preguntas.map(function (q, i) {
    return '<div class="pregunta"><strong class="chico">' + esc(q.pregunta) + "</strong>" + (q.respuesta ? '<span class="chico"><span class="muted">Tu respuesta:</span> ' + esc(q.respuesta) + "</span>" : '<label class="campo"><span class="ayuda">Responde aquí o en el chat</span><textarea id="resp-' + i + '" data-resp="' + i + '" maxlength="600"></textarea></label>') + "</div>";
  }).join("") + (sinResp ? '<div><button class="btn btn-pri btn-chico" type="button" data-guardarresp="' + esc(p.carpeta) + '">Guardar respuestas</button></div>' : "") + "</div>";
  h += '<div style="display:flex;flex-direction:column;gap:6px"><span class="eyebrow">Revisión del agente</span>' + (p.revision.length ? '<ul class="lista validacion">' + p.revision.map(function (v) { return '<li><span class="icono-v ' + (v.resultado === "ok" ? "v-ok" : "v-warn") + '" aria-hidden="true">' + (v.resultado === "ok" ? "✓" : "!") + '</span><span class="chico">' + esc(v.punto) + "</span></li>"; }).join("") + "</ul>"
    : '<p class="muted chico">' + (p.estado === "borrador" ? "Todavía no lo envías." : "Todavía no lo revisa: abre " + esc(appNombre()) + " y escribe cualquier cosa.") + "</p>") + "</div>";
  var datos = Object.keys(p.datos).filter(function (kk) { return p.datos[kk]; });
  if (datos.length) h += '<div><span class="eyebrow">Lo que pediste</span>' + datos.map(function (kk) { return '<div class="fila-dato"><span class="muted">' + esc(kk) + "</span><span>" + esc(p.datos[kk]) + "</span></div>"; }).join("") + "</div>";
  if (p.notas) h += '<div><span class="eyebrow">Notas</span><p class="chico">' + esc(p.notas) + "</p></div>";
  if (p.archivos.length) h += '<div><span class="eyebrow">Archivos</span><ul class="lista">' + p.archivos.map(function (a) { return '<li><span class="mono chico" style="overflow-wrap:anywhere">' + esc(a.archivo) + '</span><span class="muted chico">' + esc(a.donde) + "</span></li>"; }).join("") + "</ul></div>";
  if (p.refs.length) h += '<div><span class="eyebrow">Referencias</span><ul class="lista">' + p.refs.map(function (r) { return '<li><span><span class="mono chico" style="overflow-wrap:anywhere">' + esc(r.link) + '</span><br><span class="muted chico">Te gusta: ' + esc(r.gusta || "sin nota") + "</span></span></li>"; }).join("") + "</ul></div>";
  h += '<div class="botones-fila"><button class="btn btn-chico" type="button" data-abrir="' + esc(p.ruta + "/PEDIDO.md") + '">Abrir PEDIDO.md</button><button class="btn btn-chico" type="button" data-abrir="' + esc(p.ruta) + '">Abrir la carpeta</button>' +
    (p.estado === "borrador" ? '<button class="btn btn-pri btn-chico" type="button" data-seguirborrador="' + esc(p.carpeta) + '">Seguir llenándolo</button>' : "") + "</div>";
  $("#capas").innerHTML = h + "</aside>";
  $(".hoja [data-cerrar]").focus();
}

function datosForm() {
  var f = ui.form, fo = formatos();
  return { Tipo: f.tipo, "Para qué": f.foco, Mensaje: f.mensaje, "Llamado a la acción": f.accion, Publicar: f.fecha, Redes: f.plataformas.join(", "),
    "Duración": (f.duracion === "largo" ? "Más de 90 s" : f.duracion + " s") + (fo.length ? " · " + fo.join(" y ") : ""), Estilo: ETIQ.estilo[f.estilo], Voz: ETIQ.voz[f.voz], "Música": ETIQ.musica[f.musica],
    Personaje: f.personaje === "si" ? "Sí" : "No", "Subtítulos": f.subtitulos === "si" ? "Sí" : "No", "Límite de créditos": String(Number(f.limite) || 0), "Viene del plan": f.desdePlan !== "" && f.planTitulo ? f.planTitulo : "" };
}
function enviarPedido(enviar) {
  var f = ui.form;
  if (enviar && !(pasoCompleto(0) && pasoCompleto(1) && pasoCompleto(2))) { f.paso = 6; render(); toast("Faltan algunos datos: están marcados en el resumen."); return; }
  if (!f.titulo) { f.paso = 1; render(); toast("Ponle un nombre al video para guardarlo."); return; }
  f.guardando = true; render();
  var marcaP = f.marca === "nueva" ? api("/api/marca", { nombre: f.nm.nombre, rubro: f.nm.rubro, publico: f.nm.publico, redes: f.nm.redes, trato: f.nm.trato }).then(function (r) { if (r.error) throw new Error(r.error); return r.id; }) : Promise.resolve(f.marca);
  marcaP.then(function (marca) {
    return api("/api/pedido", { marca: marca, titulo: f.titulo, enviar: enviar, carpeta: f.carpeta, datos: datosForm(), refs: f.refs.filter(function (r) { return r.u; }).map(function (r) { return { link: r.u.trim(), gusta: r.g }; }), notas: f.notas })
      .then(function (r) { if (r.error) throw new Error(r.error); return { marca: marca, carpeta: r.carpeta }; });
  }).then(function (r) {
    var archivos = f.archivos, titulo = f.titulo;
    archivos.forEach(function (a) { encolar([a.file], a.logo ? { marca: r.marca, tipo: "logo" } : { marca: r.marca, tipo: "fuente", carpeta: r.carpeta }); });
    ui.form = null; ui.marca = r.marca; recordar();
    ui.enviado = enviar ? titulo : null;
    if (!enviar) toast("Borrador guardado. El agente no lo ve hasta que lo envíes.");
    textoE = ""; refrescar(); window.scrollTo(0, 0);
  }).catch(function (e) { f.guardando = false; render(); toast(e.message || "No se pudo guardar el pedido."); });
}
function seguirBorrador(carpeta) {
  var m = marcaVista(), p = m.pedidos.filter(function (x) { return x.carpeta === carpeta; })[0]; if (!p) return;
  var d = p.datos, inv = function (o, v) { for (var k in o) if (o[k] === v) return k; return ""; };
  cerrarCapas();
  nuevoPedido({ carpeta: carpeta, titulo: p.titulo, tipo: d.Tipo || "", foco: d["Para qué"] || "", mensaje: d.Mensaje || "", accion: d["Llamado a la acción"] || "", fecha: d.Publicar || "",
    plataformas: (d.Redes || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean), duracion: ((d["Duración"] || "").match(/^(\d+)/) || [0, "30"])[1],
    estilo: inv(ETIQ.estilo, d.Estilo) || "marca", voz: inv(ETIQ.voz, d.Voz) || "mia", musica: inv(ETIQ.musica, d["Música"]) || "marca",
    personaje: /^s/i.test(d.Personaje || "") ? "si" : "no", subtitulos: /^n/i.test(d["Subtítulos"] || "") ? "no" : "si", limite: d["Límite de créditos"] || "0",
    refs: p.refs.length ? p.refs.map(function (r) { return { u: r.link, g: r.gusta }; }) : [{ u: "", g: "" }], notas: p.notas || "", paso: 1 });
}
// Llena el formulario con una idea del plan del mes (nombre, fecha, tipo y redes)
function aplicarIdeaPlan(i) {
  ui.form.desdePlan = String(i);
  var idea = ideasDelPlan(formMarcaObj()).filter(function (x) { return String(x.i) === String(i); })[0];
  if (!idea) return;
  ui.form.titulo = idea.t; ui.form.planTitulo = idea.t; if (idea.fecha) ui.form.fecha = idea.fecha;
  if (/anim|graba|mixt/i.test(idea.tipo)) ui.form.tipo = /anim/i.test(idea.tipo) ? "Animado" : /graba/i.test(idea.tipo) ? "Grabado" : "Mixto";
  var red = { ig: "Instagram Reels", instagram: "Instagram Reels", reels: "Instagram Reels", tiktok: "TikTok", fb: "Facebook", facebook: "Facebook", youtube: "YouTube", shorts: "YouTube Shorts", "youtube shorts": "YouTube Shorts", linkedin: "LinkedIn" };
  ui.form.plataformas = idea.redes.split(/,|\by\b/).map(function (x) { return red[norm(x)]; }).filter(function (x, k, a) { return x && a.indexOf(x) === k; });
}
function guardarCampoForm(t) {
  var k = t.dataset.f, v = t.value;
  if (k.indexOf("nm.") === 0) ui.form.nm[k.slice(3)] = v; else ui.form[k] = v;
}
function clicPedidos(t, d) {
  if (d.nuevopedido) { nuevoPedido(); return true; }
  if (d.fpaso !== undefined && ui.form) { ui.form.paso = Number(d.fpaso); render(); window.scrollTo(0, 0); return true; }
  if (d.fcancelar) { ui.form = null; render(); return true; }
  if (d.refagregar) { ui.form.refs.push({ u: "", g: "" }); render(); var u = $("#f-ref-u-" + (ui.form.refs.length - 1)); if (u) u.focus(); return true; }
  if (d.refquitar !== undefined) { ui.form.refs.splice(Number(d.refquitar), 1); if (!ui.form.refs.length) ui.form.refs.push({ u: "", g: "" }); render(); return true; }
  if (d.archquitar !== undefined) { ui.form.archivos.splice(Number(d.archquitar), 1); render(); return true; }
  if (d.fguardar) { enviarPedido(false); return true; }
  if (d.fenviar) { enviarPedido(true); return true; }
  if (d.cerrarenvio) { ui.enviado = null; render(); return true; }
  if (d.pedido) { abrirPedido(d.pedido); return true; }
  if (d.seguirborrador) { seguirBorrador(d.seguirborrador); return true; }
  if (d.guardarresp) {
    var m = marcaVista(), resp = {}, algo = false;
    document.querySelectorAll("[data-resp]").forEach(function (ta) { if (ta.value.trim()) { resp[ta.dataset.resp] = ta.value.trim(); algo = true; } });
    if (!algo) { toast("Escribe al menos una respuesta."); return true; }
    api("/api/pedido/responder", { marca: m.id, carpeta: d.guardarresp, respuestas: resp }).then(function (r) {
      if (r.error) { toast(r.error); return; }
      toast(r.estado === "respondido" ? "Respuestas guardadas en el pedido. El agente las ve cuando le hables." : "Respuesta guardada. Quedan preguntas por responder.");
      textoE = ""; refrescar().then(function () { abrirPedido(d.guardarresp); });
    });
    return true;
  }
  return false;
}
function cambioPedido(t) {
  if (!ui.form || !t.dataset) return;
  if (t.id === "f-archivos" && t.files.length) { Array.prototype.forEach.call(t.files, function (fl) { ui.form.archivos.push({ file: fl, logo: false }); }); render(); return; }
  if (t.id === "f-logo" && t.files.length) { ui.form.archivos.push({ file: t.files[0], logo: true }); render(); return; }
  if (!t.dataset.f) return;
  if (t.type === "checkbox") { var arr = ui.form[t.dataset.f], i = arr.indexOf(t.value); if (t.checked && i < 0) arr.push(t.value); if (!t.checked && i >= 0) arr.splice(i, 1); render(); return; }
  if (t.type === "radio") { guardarCampoForm(t); render(); return; }
  if (t.id === "f-plan") { aplicarIdeaPlan(t.value); render(); return; }
  guardarCampoForm(t);
}
document.addEventListener("input", function (e) {
  var t = e.target; if (!ui.form || !t.dataset) return;
  if (t.dataset.f && (t.type === "text" || t.type === "url" || t.type === "number" || t.tagName === "TEXTAREA")) guardarCampoForm(t);
  if (t.dataset.refu !== undefined) ui.form.refs[Number(t.dataset.refu)].u = t.value;
  if (t.dataset.refg !== undefined) ui.form.refs[Number(t.dataset.refg)].g = t.value;
});
function prepararPedidos() {
  prepararZona($("#soltar-form"), $("#f-archivos-nada"), function (files) { files.forEach(function (fl) { ui.form.archivos.push({ file: fl, logo: false }); }); render(); });
  pintarSubidas();
}
