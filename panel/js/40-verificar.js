// ---------- Verificar: lo que hizo el agente (marca, plan, videos) ----------
vistas.verificar = function () {
  var m = marcaVista();
  var html = '<div class="cabeza"><span class="eyebrow">Verificar</span><h1>Lo que hizo el agente</h1><p class="muted">Para revisar. Si algo no te convence, díselo al agente en tu app: el cambio aparece aquí solo.</p></div>';
  if (!m) return html + vacio("Todavía no hay ninguna marca", "Créala en Primeros pasos, o abre la carpeta del sistema en tu app y escríbele al agente:", "Hola, quiero empezar.");
  html += '<div class="tabs" role="group" aria-label="Qué revisar">' + [["marca", "Marca"], ["plan", "Plan"], ["videos", "Videos"]].map(function (t) { return '<button type="button" data-tabver="' + t[0] + '" aria-pressed="' + (ui.tabVer === t[0]) + '">' + t[1] + "</button>"; }).join("") + "</div>";
  if (ui.tabVer === "plan") html += verPlan(m); else if (ui.tabVer === "videos") html += verVideos(m); else html += verMarca(m);
  return html;
};

// Marca, en cuatro pestañas
function esencialesDe(m) {
  var r = m.resumen;
  return [["A qué se dedica", r.rubro], ["A quién le habla", r.publico], ["Tú o usted", r.trato], ["Tono", r.tono], ["Logo", m.logo ? "Listo" : ""], ["Colores", m.paleta && !m.paleta.deEjemplo && m.pasos.colores ? "Elegidos, pasan las 4 pruebas" : ""]].map(function (x) { return [x[0], vacioV(x[1]) ? "" : x[1]]; });
}
var CONTEXTO = [["slogan", "Slogan o frase", "Cierres, portadas y títulos"], ["distinto", "Qué la hace distinta", "Ganchos y videos de venta"], ["productos", "Productos o servicios", "Videos de producto"], ["cta", "Llamado a la acción", "El cierre de cada video"],
  ["web", "Web y redes", "Datos del cierre y captura de estilo"], ["ubicacion", "Dónde está o a qué zona atiende", "Videos locales"], ["horario", "Horario", "Anuncios"], ["usa", "Palabras que usa", "Guiones con su forma de hablar"],
  ["evita", "Palabras que evita", "Guiones"], ["noToca", "Temas que no toca", "Que no los proponga"], ["admira", "Cuentas que admira", "Referencias de estilo"], ["fechas", "Fechas importantes", "El plan del mes"]];
function valorContexto(m, k) { return k === "cta" ? m.resumen.cta : m.contexto[k]; }
function dato(et, v, sirve, hint, raw) {
  return '<div class="dato"><div><span class="muted chico">' + esc(et) + "</span>" + (sirve ? '<span class="sirve">Sirve para: ' + esc(sirve) + "</span>" : "") + "</div><span>" + (raw ? v : valor(v, hint)) + "</span></div>";
}
function logoTile(m, ruta, tam) {
  if (ruta) return '<img class="logo-tile" src="' + archivo(ruta) + '" alt="" style="width:' + tam + "px;height:" + tam + 'px;object-fit:contain;background:#fff">';
  var c = m.paleta ? m.paleta.acento : "#5E6377";
  return '<span class="logo-tile" style="width:' + tam + "px;height:" + tam + "px;background:" + c + ";color:" + tinta(c) + '">' + esc(iniciales(m.nombre)) + "</span>";
}
function verMarca(m) {
  var html = '<div class="tabs sub" role="group" aria-label="Partes de la marca">' + [["ficha", "Ficha"], ["visual", "Visual"], ["voz", "Voz y música"], ["refs", "Referencias" + (m.referencias.length ? " (" + m.referencias.length + ")" : "")]].map(function (t) { return '<button type="button" data-submarca="' + t[0] + '" aria-pressed="' + (ui.subMarca === t[0]) + '">' + t[1] + "</button>"; }).join("") + "</div>";
  if (ui.subMarca === "visual") return html + verVisual(m);
  if (ui.subMarca === "voz") return html + verVoz(m);
  if (ui.subMarca === "refs") return html + verReferencias(m);
  return html + verFicha(m);
}
function verFicha(m) {
  var es = esencialesDe(m), okE = es.filter(function (x) { return x[1]; }).length, okC = CONTEXTO.filter(function (c) { return !vacioV(valorContexto(m, c[0])); }).length;
  var html = '<section class="tarjeta cabecera-marca">' + logoTile(m, m.logos.principal || m.logo, 64) + '<div style="min-width:0"><h2>' + esc(m.nombre) + "</h2>" + (!vacioV(m.contexto.slogan) ? '<p class="slogan">«' + esc(m.contexto.slogan) + "»</p>" : '<p class="valor-vacio">Sin slogan</p>') + '<p class="muted chico">' + esc(vacioV(m.resumen.rubro) ? "" : m.resumen.rubro) + "</p></div>" +
    '<div class="medidores"><span class="pill ' + (okE === es.length ? "p-ok" : "p-warn") + '">Esencial ' + okE + " de " + es.length + '</span><span class="pill p-azul">Contexto ' + okC + " de " + CONTEXTO.length + '</span><span class="pill ' + (/^completa/i.test(m.estadoFicha) ? "p-ok" : "p-gris") + '">Ficha ' + esc(m.estadoFicha || "sin completar") + "</span></div></section>";
  html += '<div class="grid g2" style="align-items:start"><section class="tarjeta"><div class="tarjeta-head"><h2>Lo esencial</h2><span class="muted chico">Sin esto el agente pregunta antes de cada video</span></div><div>' + es.map(function (e) { return dato(e[0], e[1], "", "el agente te lo pregunta"); }).join("") + "</div></section>";
  html += '<section class="tarjeta"><div class="tarjeta-head"><h2>Contexto</h2><span class="pill p-gris">Opcional</span></div><p class="muted chico">No es obligatorio, pero el agente lo usa al escribir guiones y armar los elementos de tus videos.</p><div>' + CONTEXTO.map(function (c) { return dato(c[1], valorContexto(m, c[0]), c[2]); }).join("") + "</div></section></div>";
  html += decile(vacioV(m.contexto.slogan) ? "Completemos el contexto de mi marca: mi slogan es «…»." : "Agrega a mi ficha que en diciembre abrimos también los domingos.");
  html += '<section class="tarjeta ficha-completa"><details><summary>La ficha completa, tal como la lee el agente</summary>' + m.secciones.map(function (s) {
    return "<h3>" + esc(s.titulo) + "</h3><div>" + s.filas.map(function (f) { return '<div class="fila-dato"><span class="muted">' + esc(f[0]) + "</span><span>" + valor(f[1]) + "</span></div>"; }).join("") + "</div>";
  }).join("") + "</details></section>";
  html += '<div class="botones-fila"><button class="btn btn-chico" type="button" data-abrir="' + esc(m.rutaFicha) + '">Abrir ficha.md</button><button class="btn btn-chico" type="button" data-abrir="' + esc(m.rutaCarpeta) + '">Abrir la carpeta de la marca</button></div>';
  return html;
}
function verVisual(m) {
  var p = m.paleta, lg = m.logos, html = '<div class="kit"><div class="columna">';
  html += '<section class="tarjeta"><div class="tarjeta-head"><h2>Logo</h2><span class="muted chico mono">estilo/assets/logo/</span></div><div class="logos">' +
    [["principal", "Principal", "Sobre fondos claros"], ["oscuro", "Sobre fondo oscuro", "Para tus fondos de marca"], ["icono", "Ícono", "Perfil y marca de agua"]].map(function (v) {
      var ruta = v[0] === "principal" ? lg.principal || m.logo : lg[v[0]];
      return '<div class="logo-var">' + (ruta ? '<img class="logo-tile" src="' + archivo(ruta) + '" alt="" style="width:56px;height:56px;object-fit:contain;background:' + (v[0] === "oscuro" && p ? p.fondo : "#fff") + '">' : '<span class="logo-tile vacio" style="width:56px;height:56px">?</span>') + "<strong>" + v[1] + '</strong><span class="muted chico">' + v[2] + "</span>" + (ruta ? '<span class="pill p-ok">Listo</span>' : '<span class="pill p-gris">Falta</span>') + "</div>";
    }).join("") + '</div><p class="muted chico">Para que el panel las reconozca, el nombre del archivo dice «oscuro» o «icono» (por ejemplo, logo-oscuro.svg).</p>' + (!lg.icono ? decile("Saca un ícono de mi logo para la marca de agua.") : "") + "</section>";
  html += '<section class="tarjeta"><div class="tarjeta-head"><h2>Colores</h2>' + (!p ? '<span class="pill p-gris">Sin paleta</span>' : p.deEjemplo ? '<span class="pill p-gris">Colores de ejemplo</span>' : pillPasa(p)) + "</div>" +
    (p ? muestras(p) + '<div class="pruebas">' + chipsPruebas(p) + "</div>" : "") + (p && p.deEjemplo ? '<p class="muted chico">La marca usa todavía los colores del estilo de ejemplo.</p>' : "");
  html += ui.arm && ui.arm.donde === "visual" ? armadorHtml(m) : '<div class="accion-paso"><button class="btn btn-chico" type="button" data-armabrir="visual">Armar una paleta desde un color</button></div>';
  if (m.propuestas.length) html += '<details class="mas" id="det-paletas"' + (ui.paletasAbiertas ? " open" : "") + "><summary>Ver las " + m.propuestas.length + " paletas que propuso el agente" + (m.propuestas[0].fecha ? " (" + esc(m.propuestas[0].fecha) + ")" : "") + '</summary><div class="paletas">' + m.propuestas.map(function (x, i) { return tarjetaPropuesta(m, x, i); }).join("") + "</div></details>";
  html += "</section>";
  html += '<section class="tarjeta"><h2>Letras e imágenes</h2><div>' + dato("Títulos", p && p.titulos ? '<span style="font-family:var(--font-display);font-weight:800">' + esc(p.titulos) + "</span>" : valor(""), "", "", true) + dato("Texto", p && p.cuerpo ? esc(p.cuerpo) : valor(""), "", "", true) +
    dato("Estilo de fotos e imágenes", m.contexto.imagen, "Elegir y tratar las fotos") + "</div></section>";
  html += '<section class="tarjeta"><div class="tarjeta-head"><h2>Elementos reutilizables</h2><span class="muted chico mono">estilo/bloques/</span></div><p class="muted chico">Piezas con tu marca que el agente arma una vez y usa en todos los videos: entrada con logo, títulos, franja, cierre, marca de agua.</p>' +
    (m.bloques.length ? '<ul class="lista">' + m.bloques.map(function (b) { return "<li><span>" + esc(b.nombre) + '</span><span class="pill p-ok">Listo</span></li>'; }).join("") + "</ul>" : '<p class="muted chico">Todavía no hay ninguno: el agente los arma cuando hace los primeros videos.</p>') +
    decile("Haz una entrada de 1 segundo con mi logo para todos los videos.") + "</section>";
  html += '</div><aside class="vista-previa"><span class="eyebrow">Así se ve en un reel</span><div class="pantalla" id="pantalla"></div><span class="leyenda-zona">Dato arriba, logo o personaje al medio, subtítulos y franja abajo (sin texto: ahí lo tapan las apps).</span></aside></div>';
  return html;
}
function verVoz(m) {
  var r = m.resumen, c = m.contexto;
  var pj = m.personaje.estado ? '<span class="pill ' + (/^aprobado/i.test(m.personaje.estado) ? "p-ok" : "p-warn") + '">' + esc(m.personaje.estado) + "</span>" : "";
  var html = '<div class="grid g2" style="align-items:start"><section class="tarjeta"><h2>Cómo habla</h2><div>' + dato("Tú o usted", r.trato) + dato("Tono", r.tono) + dato("Palabras que usa", c.usa) + dato("Palabras que evita", c.evita) + dato("Temas que no toca", c.noToca) + "</div>" +
    (r.palabras.length ? '<div style="display:flex;flex-direction:column;gap:6px"><span class="eyebrow">Palabras de la marca (para la transcripción)</span><div class="chips">' + r.palabras.map(function (x) { return '<span class="chip">' + esc(x) + "</span>"; }).join("") + "</div></div>" : "") + "</section>";
  html += '<section class="tarjeta"><h2>Voz, cámara y música</h2><div>' + dato("Voz", c.voz) + dato("Sale en cámara", c.camara) + dato("Música de la marca", r.musica) +
    dato("Límite de créditos por video", '<span class="mono">' + esc(r.limite) + "</span>" + (/^0\b/.test(r.limite) ? ' <span class="muted chico">(nada pagado)</span>' : ""), "", "", true) + "</div></section>";
  html += '<section class="tarjeta"><div class="tarjeta-head"><h2>Personaje</h2>' + pj + "</div><div>" + dato("¿Tiene personaje?", r.tienePersonaje) + dato("Cómo es", r.personaje) + "</div>" +
    (m.personaje.prueba ? '<video class="prueba" controls preload="metadata" src="' + archivo(m.personaje.prueba) + '"></video>' + (/^aprobado/i.test(m.personaje.estado) ? "" : decile("Me gusta el personaje, apruébalo.")) : "") + "</section>";
  html += '<section class="tarjeta"><h2>Temáticas</h2>' + (m.tematicas.length ? '<div class="chips">' + m.tematicas.map(function (t) { return '<span class="chip">' + esc(t.nombre) + "</span>"; }).join("") + "</div>" : '<p class="muted chico">Ninguna todavía.</p>') + '<p class="muted chico">Series o temporadas con sus propios recursos (por ejemplo, Navidad).</p></section></div>';
  return html;
}
function verReferencias(m) {
  var mod = E.modulos.filter(function (x) { return x.id === "referencias"; })[0];
  var html = '<section class="tarjeta"><div class="tarjeta-head"><h2>Referencias</h2><span class="muted chico mono">referencias/</span></div>';
  if (!m.referencias.length) return html + '<p class="muted">Todavía no hay referencias. Pega el link de un video que te guste en un pedido o en el chat.' + (mod && !mod.activo ? ' Para que el agente pueda bajarlos, activa <a class="enlace" href="#mantenimiento">Referencias de video</a>.' : "") + "</p></section>";
  html += '<p class="muted chico">El agente estudia una imagen con 12 cuadros de cada video y su análisis (duración, cortes, ritmo), no el video completo. Toma su forma, nunca su contenido.</p>';
  html += m.referencias.map(function (r) {
    var a = r.analisis;
    return '<div class="ref-card">' + (r.cuadros ? '<img class="ref-cuadros" src="' + archivo(r.cuadros) + '" alt="12 cuadros de la referencia">' : '<span class="logo-tile vacio" style="width:120px;height:160px">Sin cuadros</span>') +
      '<div style="display:flex;flex-direction:column;gap:8px;min-width:0"><div class="tarjeta-head"><strong>' + esc((r.red ? r.red + " · " : "") + (r.cuenta || r.titulo)) + "</strong>" + (a["Duración"] ? '<span class="pill p-ok">Analizada</span>' : '<span class="pill p-gris">Sin analizar</span>') + "</div>" +
      '<div class="chips">' + ["Duración", "Formato", "Cortes", "Primeros 3 segundos"].filter(function (k) { return a[k]; }).map(function (k) { return '<span class="chip">' + (k === "Primeros 3 segundos" ? "Primeros 3 s: " : k === "Cortes" ? "Cortes: " : "") + esc(a[k]) + "</span>"; }).join("") + "</div>" +
      '<p class="chico"><span class="muted">Te gusta:</span> ' + valor(r.gusta, "el agente te lo pregunta") + "</p>" +
      (r.toma.length ? '<div><span class="eyebrow">Lo que se toma</span><ul style="margin:4px 0 0;padding-left:18px;font-size:.88rem">' + r.toma.map(function (x) { return "<li>" + fmt(x) + "</li>"; }).join("") + "</ul></div>" : '<p class="muted chico">El agente todavía no anota qué toma de esta referencia.</p>') +
      (r.fuente && /^https:\/\//i.test(r.fuente) ? '<a class="enlace chico" href="' + esc(r.fuente) + '" target="_blank" rel="noopener noreferrer">Ver el original</a>' : "") + "</div></div>";
  }).join("");
  return html + decile("De la primera referencia, toma solo cómo entran los textos.") + "</section>";
}
function pintarPantalla() {
  var m = marcaVista(), el = $("#pantalla"); if (!el || !m) return;
  var c = m.paleta || { fondo: "#16181D", fondo2: "#20232A", texto: "#F7F5F0", acento: "#2F80ED", acento2: "#2F80ED" };
  el.style.background = c.fondo; el.style.color = c.texto;
  el.innerHTML = '<div class="titulo-p" style="font-family:var(--font-display)">Un dato que <span style="color:' + c.acento + '">importa</span></div>' +
    (m.logo ? '<img class="logo-p" src="' + archivo(m.logo) + '" alt="">' : '<span class="forma-p" style="background:' + c.acento + ";box-shadow:18px 18px 0 " + c.acento2 + '"></span>') +
    '<div class="sub">La palabra <b style="background:' + c.acento + ";color:" + tinta(c.acento) + '">marcada</b></div>' +
    '<div class="franja" style="background:' + c.fondo2 + ";--franja-c:" + c.acento2 + '"></div>';
}

// Plan
function etapaDe(t) { var n = norm(t); for (var i = ETAPAS.length - 1; i >= 0; i--) if (n.indexOf(norm(ETAPAS[i])) === 0) return i; return 0; }
function diaDe(f, anio, mes) {
  var m = /(\d{4})-(\d{1,2})-(\d{1,2})/.exec(f || "");
  if (m) return +m[1] === anio && +m[2] === mes ? +m[3] : null;
  m = /^\s*(\d{1,2})\b/.exec(f || ""); return m ? +m[1] : null;
}
function planActual(m) {
  var hoy = new Date(), clave = hoy.getFullYear() + "-" + ("0" + (hoy.getMonth() + 1)).slice(-2);
  var p = m.planes.filter(function (x) { return x.mes === ui.mes; })[0] || m.planes.filter(function (x) { return x.mes === clave; })[0];
  if (!p) { var futuros = m.planes.filter(function (x) { return x.mes > clave; }); p = futuros[0] || m.planes[m.planes.length - 1]; }
  return p;
}
function pilaresPlan(m, plan) {
  var lista = m.pilares.map(function (p) { return { nombre: p.nombre, meta: p.meta }; });
  plan.videos.forEach(function (v) { var n = (v.Pilar || "").trim(); if (n && !lista.some(function (p) { return norm(p.nombre) === norm(n); })) lista.push({ nombre: n, meta: null }); });
  lista.forEach(function (p, i) { p.color = COLORES[i % COLORES.length]; });
  return lista;
}
function colorPilar(pils, n) { var p = pils.filter(function (x) { return norm(x.nombre) === norm(n); })[0]; return p ? p.color : "var(--line)"; }
function verPlan(m) {
  if (!moduloActivo("plan") && !m.planes.length) return vacio("La planificación está apagada", "Actívala en Mantenimiento → Herramientas para que el agente arme el plan de cada mes.");
  if (!m.planes.length) return vacio("Todavía no hay plan", "El agente arma el plan del mes contigo: objetivo, temas, fechas importantes y un video por fila.", "Arma el plan de este mes: 2 videos por semana.");
  var plan = planActual(m), partes = plan.mes.split("-"), anio = +partes[0], mes = +partes[1];
  var pils = pilaresPlan(m, plan), filas = plan.videos.map(function (v, i) { return { i: i, v: v, d: diaDe(v.Fecha, anio, mes), e: etapaDe(v.Etapa) }; });
  var publicados = filas.filter(function (f) { return f.e === 6; }).length;
  var meta = parseInt((plan.ritmo["Meta del mes"] || "").replace(/\D+/g, " ").trim(), 10) || filas.length;
  var porSemana = (plan.ritmo["Videos por semana"] || "").trim();
  var hoy = new Date(), esEsteMes = hoy.getFullYear() === anio && hoy.getMonth() + 1 === mes, diasMes = new Date(anio, mes, 0).getDate();
  var html = "";
  if (m.planes.length > 1) html += '<label class="selector"><span class="eyebrow">Mes</span><select class="sel-mes" id="sel-mes">' + m.planes.map(function (x) { return '<option value="' + esc(x.mes) + '"' + (x.mes === plan.mes ? " selected" : "") + ">" + esc(x.titulo) + "</option>"; }).join("") + "</select></label>";
  html += '<div class="resumen-mes">';
  html += '<section class="tarjeta"><span class="eyebrow">Objetivo de ' + MESES[mes - 1] + "</span><h2>" + (plan.objetivo ? fmt(plan.objetivo) : '<span class="valor-vacio">Sin objetivo</span>') + "</h2>" + (!vacioV(m.resumen.cta) ? '<p class="muted chico">Llamado a la acción: ' + fmt(m.resumen.cta) + "</p>" : "") + "</section>";
  html += '<section class="tarjeta"><span class="eyebrow">Ritmo</span><h2>' + publicados + " de " + meta + ' publicados</h2><div class="barra-prog" role="img" aria-label="' + publicados + " de " + meta + '"><i style="width:' + Math.min(100, Math.round(publicados / Math.max(1, meta) * 100)) + '%;background:var(--accent)"></i></div><p class="muted chico">' +
    (porSemana ? esc(porSemana) + " por semana" : filas.length + " videos en el plan") + (esEsteMes ? " · quedan " + (diasMes - hoy.getDate()) + " días del mes" : "") + "</p></section>";
  html += '<section class="tarjeta"><span class="eyebrow">Mezcla de temas: planeado' + (pils.some(function (p) { return p.meta != null; }) ? " y meta" : "") + '</span><div class="mezcla">' + (pils.length ? pils.map(function (p) {
    var n = filas.filter(function (f) { return norm(f.v.Pilar) === norm(p.nombre); }).length, pct = filas.length ? Math.round(n / filas.length * 100) : 0;
    return '<div class="fila"><span>' + esc(p.nombre) + '</span><span class="pista"><i style="width:' + pct + "%;background:" + p.color + '"></i>' + (p.meta != null ? '<b style="left:' + Math.min(100, p.meta) + '%" title="Meta ' + p.meta + '%"></b>' : "") + '</span><span class="mono">' + pct + "%" + (p.meta != null ? " / " + p.meta + "%" : "") + "</span></div>";
  }).join("") : '<span class="muted">La ficha no tiene pilares todavía.</span>') + "</div></section></div>";
  var fechas = {};
  plan.fechas.forEach(function (f) { var d = diaDe(f.Fecha, anio, mes); if (d) fechas[d] = (fechas[d] ? fechas[d] + " · " : "") + (f["Qué"] || f.Que || ""); });
  var primero = (new Date(anio, mes - 1, 1).getDay() + 6) % 7, celdas = Math.ceil((primero + diasMes) / 7) * 7;
  html += '<section class="tarjeta"><div class="tarjeta-head"><h2>' + esc(plan.titulo) + '</h2><span class="muted chico">Toca un video para ver su etapa</span></div>' +
    (pils.length ? '<div class="chips">' + pils.map(function (p) { return '<span class="chip" style="border-left:4px solid ' + p.color + '">' + esc(p.nombre) + "</span>"; }).join("") + "</div>" : "") +
    '<div class="calendario">' + DIAS.map(function (d) { return '<div class="cab-dia">' + d + "</div>"; }).join("");
  for (var i = 0; i < celdas; i++) {
    var d = i - primero + 1;
    if (d < 1 || d > diasMes) { html += '<div class="dia-cal fuera" aria-hidden="true"></div>'; continue; }
    var esHoy = esEsteMes && d === hoy.getDate(), del = filas.filter(function (f) { return f.d === d; });
    html += '<div class="dia-cal' + (esHoy ? " hoy" : "") + (!del.length && !fechas[d] && !esHoy ? " vacio" : "") + '"><span class="n"><span>' + DIAS[i % 7] + " " + d + "</span>" + (esHoy ? '<span style="color:var(--accent);font-weight:700">hoy</span>' : "") + "</span>" +
      (fechas[d] ? '<span class="fecha-esp">' + esc(fechas[d]) + "</span>" : "") + del.map(function (f) { return entrada(f, pils); }).join("") + "</div>";
  }
  html += "</div>";
  var sinFecha = filas.filter(function (f) { return !f.d; });
  if (sinFecha.length) html += '<span class="eyebrow">Sin fecha</span><div class="sin-fecha">' + sinFecha.map(function (f) { return entrada(f, pils); }).join("") + "</div>";
  html += "</section>";
  if (plan.funciono.length || plan.lectura) {
    var cols = plan.funciono.length ? Object.keys(plan.funciono[0]) : [];
    html += '<section class="tarjeta"><div class="tarjeta-head"><h2>Lo que funcionó</h2><span class="muted chico">Lo que le contaste al agente</span></div>' +
      (cols.length ? '<div class="tabla-wrap"><table><thead><tr>' + cols.map(function (c) { return "<th>" + esc(c) + "</th>"; }).join("") + "</tr></thead><tbody>" +
        plan.funciono.map(function (r) { return "<tr>" + cols.map(function (c) { return "<td" + (/vistas/i.test(c) ? ' class="num"' : "") + ">" + fmt(r[c]) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>" : "") +
      (plan.lectura ? '<p class="chico"><strong>Lectura del agente:</strong> ' + fmt(plan.lectura) + "</p>" : "") + "</section>";
  }
  if (plan.ideas.length) html += '<section class="tarjeta"><h2>Banco de ideas</h2><ul class="lista">' + plan.ideas.map(function (r) { return "<li><span>" + fmt(r.Idea) + "</span>" + (r.Pilar ? '<span class="chip" style="border-left:4px solid ' + colorPilar(pils, r.Pilar) + '">' + esc(r.Pilar) + "</span>" : "") + "</li>"; }).join("") + "</ul></section>";
  html += decile("Mueve «" + (filas[0] ? filas[0].v["Título"] || "el primer video" : "el primer video") + "» al jueves.");
  return html;
}
function entrada(f, pils) {
  return '<button type="button" class="entrada' + (f.e === 6 ? " publicado" : "") + '" style="--c:' + colorPilar(pils, f.v.Pilar) + '" data-plan="' + f.i + '"><b>' + esc(f.v["Título"] || "(sin título)") + '</b><span class="est">' + ETAPAS[f.e] + (f.v.Formato ? ' · <span class="formato">' + esc(f.v.Formato) + "</span>" : "") + "</span></button>";
}
function videoDeCarpeta(m, c) {
  var n = String(c || "").replace(/`/g, "").replace(/\\/g, "/").replace(/\/$/, "").split("/").pop();
  return n ? m.videos.filter(function (v) { return v.carpeta === n; })[0] : null;
}
function abrirFila(i) {
  var m = marcaVista(), plan = planActual(m), v = plan.videos[i]; if (!v) return;
  var e = etapaDe(v.Etapa), vid = videoDeCarpeta(m, v.Carpeta);
  var fila = function (k, x) { return x ? '<div class="fila-dato"><span class="muted">' + k + "</span><span>" + fmt(x) + "</span></div>" : ""; };
  $("#capas").innerHTML = '<div class="velo" data-cerrar="1"></div><aside class="hoja" role="dialog" aria-modal="true" aria-labelledby="t-hoja"><div class="tarjeta-head"><h2 id="t-hoja">' + esc(v["Título"] || "Video") + '</h2><button class="btn btn-chico" type="button" data-cerrar="1">Cerrar</button></div>' +
    "<div>" + fila("Fecha", v.Fecha) + fila("Pilar", v.Pilar) + fila("Serie", v.Serie) + fila("Temática", v["Temática"]) + fila("Tipo", v.Tipo) + fila("Formato", v.Formato) + fila("Redes", v.Redes) + "</div>" +
    '<div style="display:flex;flex-direction:column;gap:8px"><span class="eyebrow">Etapa</span><ol class="etapas">' + ETAPAS.map(function (x, k) { return '<li class="' + (k < e ? "hecha" : k === e ? "actual" : "") + '">' + x + "</li>"; }).join("") + "</ol></div>" +
    (vid ? '<div style="display:flex;flex-direction:column;gap:8px"><span class="eyebrow">Sus archivos</span><span class="mono muted" style="overflow-wrap:anywhere">' + esc(vid.ruta) + "</span>" + accionesVideo(vid) + "</div>" : '<p class="muted chico">Todavía no tiene carpeta: se crea cuando lo pides (Pedidos) o cuando el agente empieza el video.</p>') +
    (!vid && e === 0 ? '<div><button class="btn btn-pri btn-chico" type="button" data-pedirplan="' + i + '">Pedir este video</button></div>' : "") +
    decile(e === 6 ? "Haz 3 cortos nuevos a partir de «" + (v["Título"] || "") + "»." : "Sigamos con el video «" + (v["Título"] || "") + "».") + "</aside>";
  var b = $(".hoja [data-cerrar]"); if (b) b.focus();
}
function accionesVideo(v) {
  var listo = /^entregado/.test(norm(v.estado));
  var borr = v.entregas.filter(function (x) { return /borrador.*\.mp4$/i.test(x.nombre); })[0], muestra = v.entregas.filter(function (x) { return /muestra.*\.mp4$/i.test(x.nombre); })[0];
  var finales = v.entregas.filter(function (x) { return /\.mp4$/i.test(x.nombre) && x !== borr && x !== muestra; });
  return '<div class="botones-fila">' +
    (borr && !listo ? '<button class="btn btn-pri btn-chico" type="button" data-abrir="' + esc(borr.ruta) + '">Ver borrador</button>' : "") +
    (muestra ? '<button class="btn btn-chico" type="button" data-abrir="' + esc(muestra.ruta) + '">Ver muestra</button>' : "") +
    (finales.length ? '<button class="btn ' + (listo ? "btn-pri " : "") + 'btn-chico" type="button" data-abrir="' + esc(v.ruta + "/entregas") + '">Entregas (' + finales.length + ")</button>" : "") +
    (v.guion ? '<button class="btn btn-chico" type="button" data-abrir="' + esc(v.guion) + '">Leer guion</button>' : "") +
    '<button class="btn btn-chico" type="button" data-abrir="' + esc(v.ruta) + '">Abrir carpeta</button></div>';
}
function verVideos(m) {
  if (!m.videos.length) return vacio("Todavía no hay videos", "Cuando pides un video o el agente empieza uno, aparece aquí con su etapa, el guion, el borrador y las entregas.", "Hagamos un video de 30 segundos presentando mi negocio.");
  var orden = ["pedido", "idea", "guion", "voz", "muestra", "en animación", "en revisión", "entregado"];
  var pill = function (s) { var n = norm(s), cls = /^entregado/.test(n) ? "p-ok" : /revision|animacion/.test(n) ? "p-azul" : !n || /^idea|^pedido/.test(n) ? "p-gris" : "p-warn"; return '<span class="pill ' + cls + '">' + esc(s || "sin estado") + "</span>"; };
  var enCurso = m.videos.filter(function (v) { return !/^entregado/.test(norm(v.estado)); }), listos = m.videos.filter(function (v) { return /^entregado/.test(norm(v.estado)); });
  var li = function (v) {
    return '<li style="flex-wrap:wrap"><span><strong>' + esc(v.titulo) + '</strong><br><span class="muted chico">' + esc(v.creado) + (v.formato ? " · " + esc(v.formato) : "") + (v.red ? " · " + esc(v.red) : "") + (v.tematica && v.tematica !== "ninguna" ? " · " + esc(v.tematica) : "") +
      '</span></span><span style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end">' + pill(v.estado) + accionesVideo(v) + "</span></li>";
  };
  return '<section class="tarjeta"><div class="tarjeta-head"><h2>En curso</h2><span class="muted chico">' + enCurso.length + " video" + (enCurso.length === 1 ? "" : "s") + "</span></div>" +
    (enCurso.length ? '<ul class="lista">' + enCurso.map(li).join("") + "</ul>" : '<p class="muted">Nada en curso.</p>') +
    '<p class="muted chico">Etapas: ' + orden.join(" → ") + ".</p>" + decile("En el borrador, en el 0:12 el texto tapa la cara. Súbelo un poco.") + "</section>" +
    (listos.length ? '<section class="tarjeta"><div class="tarjeta-head"><h2>Entregados</h2><span class="muted chico">' + listos.length + '</span></div><ul class="lista">' + listos.map(li).join("") + "</ul></section>" : "");
}
function clicVerificar(t, d) {
  if (d.tabver) { ui.tabVer = d.tabver; recordar(); render(); return true; }
  if (d.submarca) { ui.subMarca = d.submarca; recordar(); render(); return true; }
  if (d.plan) { abrirFila(Number(d.plan)); return true; }
  if (d.pedirplan !== undefined) {
    cerrarCapas(); nuevoPedido({ paso: 1 }); aplicarIdeaPlan(d.pedirplan); render();
    return true;
  }
  return false;
}
