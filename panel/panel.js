// Panel del sistema de videos. Lee el estado de la carpeta (/api/estado) cada pocos segundos y lo muestra.
// No le habla al agente: lo que cambia el agente aparece aquí solo; lo que subes queda en la bandeja.
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var TOKEN = $('meta[name="panel-token"]').content;
  var DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  var ETAPAS = ["Idea", "Guion", "Grabar", "Editar", "Revisar", "Listo", "Publicado"];
  var COLORES = ["#2E6BE6", "#D9622B", "#1E9E61", "#9B4DE0", "#C23B7A", "#0E8C99", "#8A6D1F", "#5B6170"];

  var E = null, textoE = "";
  var ui = { marca: null, tabVer: "marca", tema: "como", mes: null, abiertos: {}, pendiente: null, ocupado: null, subidas: [], subiendo: false, version: null };
  try { var g = JSON.parse(localStorage.getItem("panel-videos") || "{}"); if (g.tabVer) ui.tabVer = g.tabVer; if (g.tema) ui.tema = g.tema; if (g.marca) ui.marca = g.marca; } catch (e) { }
  function recordar() { try { localStorage.setItem("panel-videos", JSON.stringify({ tabVer: ui.tabVer, tema: ui.tema, marca: ui.marca })); } catch (e) { } }

  // ---------- Utilidades ----------
  function api(ruta, cuerpo) {
    var op = cuerpo ? { method: "POST", headers: { "Content-Type": "application/json", "X-Panel-Token": TOKEN }, body: JSON.stringify(cuerpo) } : { cache: "no-store" };
    return fetch(ruta, op).then(function (r) { return r.json(); });
  }
  var toastT;
  function toast(msg) {
    var t = $(".toast"); if (t) t.remove();
    t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg;
    document.body.appendChild(t); clearTimeout(toastT); toastT = setTimeout(function () { t.remove(); }, 3600);
  }
  function abrir(ruta, aviso) { api("/api/abrir", { ruta: ruta }).then(function (r) { toast(r.error || aviso || "Abriendo…"); }); }
  function archivo(ruta) { return "/archivo?r=" + encodeURIComponent(ruta); }
  function cerrarCapas() { $("#capas").innerHTML = ""; }
  function norm(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim(); }
  function tam(n) { return n >= 1073741824 ? (n / 1073741824).toFixed(1).replace(".", ",") + " GB" : n >= 1048576 ? (n / 1048576).toFixed(1).replace(".", ",") + " MB" : Math.max(1, Math.round(n / 1024)) + " KB"; }
  function lum(hex) { var n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }).reduce(function (a, v, i) { return a + v * [0.2126, 0.7152, 0.0722][i]; }, 0); }
  function tinta(hex) { return 1.05 / (lum(hex) + 0.05) >= 3 ? "#FFFFFF" : "#111111"; }
  // Texto de la ficha: `código`, **negrita**, [texto](https://...)
  function fmt(s) {
    return esc(s).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a class="enlace" href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  }
  function valor(s) { var v = String(s || "").trim(); return v && !/^\(ej\./i.test(v) ? fmt(v) : '<span class="valor-vacio">Sin completar</span>'; }
  function decile(t) { return '<div class="decile"><span class="eyebrow">Qué decirle al agente</span><q>' + esc(t) + "</q></div>"; }
  function vacio(titulo, texto, dec) { return '<div class="estado-vacio"><strong>' + esc(titulo) + '</strong><span class="muted">' + texto + "</span>" + (dec ? decile(dec) : "") + "</div>"; }

  // Markdown simple para las guías de los módulos
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

  // ---------- Paletas ----------
  function chipsPruebas(p) {
    var nombres = { "texto sobre fondo": "Texto", "acento sobre fondo": "Acento", "palabra marcada en subtítulos": "Subtítulo marcado", "acento 2 sobre fondo": "Acento 2" };
    return p.pruebas.map(function (x) { return '<span class="pill ' + (x.pasa ? "p-ok" : "p-warn") + '" title="Mínimo ' + String(x.minimo).replace(".", ",") + ':1">' + (nombres[x.prueba] || x.prueba) + " " + String(x.ratio).replace(".", ",") + ":1</span>"; }).join("");
  }
  function muestras(p) {
    return '<div class="muestras">' + [["fondo", p.fondo], ["fondo 2", p.fondo2], ["texto", p.texto], ["acento", p.acento], ["acento 2", p.acento2]].map(function (x) {
      return '<span style="background:' + x[1] + ";color:" + tinta(x[1]) + '" title="' + x[0] + '">' + x[1] + "</span>";
    }).join("") + "</div>";
  }
  function pillPasa(p) { return p.pasaTodo ? '<span class="pill p-ok">Pasa las 4 pruebas</span>' : '<span class="pill p-warn">Revisar contraste</span>'; }

  // ---------- Estado ----------
  function marcaVista() {
    if (!E || !E.marcas.length) return null;
    var m = E.marcas.filter(function (x) { return x.id === ui.marca; })[0];
    return m || E.marcas.filter(function (x) { return x.id === E.activa; })[0] || E.marcas[0];
  }
  function moduloActivo(id) { return E.modulos.some(function (m) { return m.id === id && m.activo; }); }

  function pasosApp() {
    var a = E.app;
    if (a === "ChatGPT") return ["Abre la app de ChatGPT e inicia sesión.", "Entra a Codex y toca «Add new project» (o Ctrl+O).", "Elige la carpeta del sistema y, si pregunta, márcala como de confianza."];
    if (a === "Antigravity") return ["Abre Antigravity e inicia sesión con tu cuenta de Google.", "Abre la carpeta del sistema como espacio de trabajo (workspace).", "Si pregunta si confías en la carpeta, di que sí."];
    if (a === "Claude") return ["Abre la app de Claude e inicia sesión (plan Pro o superior).", "Entra a la pestaña «Code».", "Elige la carpeta del sistema como proyecto.", "La primera vez te pide permiso para el editor de video: elige Permitir."];
    return ["Abre tu app (Claude, ChatGPT o Antigravity) e inicia sesión.", "Abre la carpeta del sistema como proyecto.", "Acepta el permiso del editor de video."];
  }

  function listaPasos(m) {
    var inst = E.instalacion, faltan = inst ? (inst.piezas || []).filter(function (p) { return !p.quedo && p.imprescindible; }) : [];
    var L = [
      { id: "instalar", t: "Instalar", hecho: !!inst && !faltan.length, det: "Se marca solo cuando el instalador termina con todo en OK.",
        que: ["Doble clic en Instalar.bat.", "Elige tu app (Claude, ChatGPT o Antigravity).", "Espera el resumen: todo en OK."],
        extra: faltan.length ? '<div class="ojo articulo"><strong>Falta:</strong> ' + esc(faltan.map(function (p) { return p.pieza; }).join(", ")) + ". Usa Mantenimiento → Reparar instalación.</div>" : "" },
      { id: "marca", t: "Abrir la carpeta en tu app y crear tu marca", hecho: E.marcas.length > 0, det: "Se marca solo cuando el agente crea tu marca en la carpeta.",
        que: pasosApp(), decir: "Hola, quiero empezar.", ruta: true },
      { id: "ficha", t: "Completar tu marca", hecho: !!m && m.pasos.ficha, det: "Se marca solo cuando la ficha de la marca queda completa.",
        que: ["El agente te hace unas preguntas (unos 10 minutos).", "Si tienes web, dásela: saca de ahí colores, fuentes y logo.", "Revisa el resultado en Verificar → Marca."], decir: "Mi web es … y mi logo lo dejé en Subir." },
      { id: "colores", t: "Elegir tus colores", hecho: !!m && m.pasos.colores, det: "Se marca solo cuando la marca tiene sus colores y pasan las 4 pruebas de contraste.",
        que: ["El agente te propone 3 paletas a partir de tu logo o tu web.", "Míralas en Verificar → Marca y elige una."], decir: "Proponme 3 paletas a partir de mi logo." },
      { id: "material", t: "Subir tu logo y tu material", hecho: !!m && m.pasos.material, det: "Se marca solo cuando la marca tiene logo o el agente ordenó algo de la bandeja.",
        que: ["Arrastra tu logo, fotos del negocio y videos en Subir.", "Dile al agente que ordene la bandeja."], decir: "Ordena lo que dejé en la bandeja." }
    ];
    if (moduloActivo("personaje")) L.push({ id: "personaje", t: "Aprobar tu personaje", opcional: true, hecho: !!m && m.pasos.personaje, det: "Se marca solo cuando el personaje queda aprobado, o si la ficha dice que la marca no tiene personaje.",
      que: ["Si quieres una mascota, pídesela al agente y sube tus referencias.", "Mira la prueba de 5 segundos en Verificar → Marca.", "Si te gusta, díselo al agente; si no, dile qué cambiar."], decir: "Quiero un personaje para mi marca." });
    if (moduloActivo("plan")) L.push({ id: "plan", t: "Armar el plan del mes", opcional: true, hecho: !!m && m.pasos.plan, det: "Se marca solo cuando hay un plan guardado.",
      que: ["El agente arma el mes con tu objetivo, tus temas y las fechas importantes.", "Revísalo en Verificar → Plan."], decir: "Arma el plan de este mes: 2 videos por semana." });
    L.push({ id: "video", t: "Hacer tu primer video", hecho: !!m && m.pasos.video, det: "Se marca solo cuando hay un video entregado.",
      que: ["Pide un video corto (30 s) para probar.", "Aprueba el guion, graba tu voz y aprueba la muestra.", "Revisa el borrador y pide los cambios con minuto y segundo."], decir: "Hagamos un video de 30 segundos presentando mi negocio." });
    return L;
  }

  // ---------- Barra superior ----------
  function pintarBarra() {
    var z = $("#zona-marca"), m = marcaVista();
    if (!E.marcas.length) z.innerHTML = '<span class="muted">Todavía no hay ninguna marca</span>';
    else if (E.marcas.length === 1) {
      var c = m.paleta ? m.paleta.acento : "#5E6377";
      z.innerHTML = '<div class="marca-unica">' + (m.logo ? '<img src="' + archivo(m.logo) + '" alt="" style="width:32px;height:32px;object-fit:contain;border-radius:8px">' :
        '<span class="logo-marca" style="width:32px;height:32px;border-radius:9px;font-size:.8rem;background:' + c + ";color:" + tinta(c) + '">' + esc(iniciales(m.nombre)) + "</span>") + esc(m.nombre) + "</div>";
    } else {
      z.innerHTML = '<label class="selector"><span class="eyebrow">Revisando</span><select id="sel-marca">' + E.marcas.map(function (x) {
        return '<option value="' + esc(x.id) + '"' + (x.id === m.id ? " selected" : "") + ">" + esc(x.nombre) + (x.activa ? " (activa)" : "") + "</option>";
      }).join("") + "</select></label>";
    }
    $("#chip-version").textContent = "v" + E.sistema.version;
    $("#ruta-sistema").textContent = E.sistema.raiz;
    var pasos = listaPasos(m), faltan = pasos.filter(function (p) { return !p.hecho && !p.opcional; }).length;
    $("#cuenta-pasos").textContent = faltan; $("#cuenta-pasos").hidden = !faltan;
    $("#cuenta-bandeja").textContent = E.bandeja.length; $("#cuenta-bandeja").hidden = !E.bandeja.length;
    var cn = $("#chip-nueva");
    if (ui.version && ui.version.nueva) { cn.textContent = "Versión " + ui.version.nueva + " disponible"; cn.hidden = false; } else cn.hidden = true;
  }
  function iniciales(n) { return String(n).split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join("").toUpperCase(); }

  var vistas = {};

  // ---------- Primeros pasos ----------
  vistas.inicio = function () {
    var m = marcaVista(), pasos = listaPasos(m), hechos = pasos.filter(function (p) { return p.hecho; }).length, actual = -1;
    pasos.forEach(function (p, i) { if (!p.hecho && !p.opcional && actual < 0) actual = i; });
    var html = '<div class="cabeza"><span class="eyebrow">Primeros pasos' + (E.marcas.length > 1 ? " · " + esc(m.nombre) : "") + '</span><h1>' + (actual < 0 ? "Todo listo para hacer videos" : "Empieza por aquí") + '</h1><p class="muted">Todo se configura conversando con el agente en tu app. Esta lista te dice el orden y se marca sola cuando el paso queda hecho en la carpeta.</p></div>';
    html += '<div class="progreso-top"><div class="barra-prog" role="img" aria-label="' + hechos + " de " + pasos.length + ' pasos"><i style="width:' + Math.round(hechos / pasos.length * 100) + '%"></i></div><strong>' + hechos + " de " + pasos.length + "</strong></div>";
    html += '<div style="display:flex;flex-direction:column;gap:10px">' + pasos.map(function (p, i) {
      var cls = p.hecho ? " hecho" : i === actual ? " actual" : "";
      var abierto = ui.abiertos[p.id] !== undefined ? ui.abiertos[p.id] : i === actual;
      var pill = p.hecho ? '<span class="pill p-ok">Hecho</span>' : i === actual ? '<span class="pill p-azul">Ahora</span>' : p.opcional ? '<span class="pill p-gris">Opcional</span>' : '<span class="pill p-gris">Pendiente</span>';
      return '<details class="paso' + cls + '" data-paso="' + p.id + '"' + (abierto ? " open" : "") + '><summary><span class="num">' + (p.hecho ? "✓" : i + 1) + "</span><strong>" + esc(p.t) + "</strong>" + pill +
        '</summary><div class="cuerpo"><ol>' + p.que.map(function (q) { return "<li>" + esc(q) + "</li>"; }).join("") + "</ol>" +
        (p.ruta ? '<div class="botones-fila"><span class="muted chico">La carpeta del sistema:</span><span class="mono" style="overflow-wrap:anywhere">' + esc(E.sistema.raiz) + '</span><button class="btn btn-chico" type="button" data-copiar-ruta="1">Copiar la ruta</button></div>' : "") +
        (p.extra || "") + (p.decir ? decile(p.decir) : "") + '<span class="detecta">' + esc(p.det) + "</span></div></details>";
    }).join("") + "</div>";
    html += '<section class="tarjeta"><h2>Después de empezar</h2><p class="muted">El día a día pasa en tu app. Vuelves al panel para:</p><div class="grid g3">' +
      '<a class="tarjeta" href="#verificar" style="text-decoration:none;color:inherit"><strong>Verificar</strong><span class="muted chico">Revisar rápido tu marca, el plan y los videos en curso.</span></a>' +
      '<a class="tarjeta" href="#subir" style="text-decoration:none;color:inherit"><strong>Subir</strong><span class="muted chico">Dejar audios, videos y fotos para el agente.</span></a>' +
      '<a class="tarjeta" href="#mantenimiento" style="text-decoration:none;color:inherit"><strong>Mantenimiento</strong><span class="muted chico">Actualizar y activar o apagar herramientas.</span></a></div></section>';
    return html;
  };

  // ---------- Manual ----------
  function temasManual() {
    var t = [
      { g: "Empezar", id: "como", t: "Cómo funciona" },
      { g: "Empezar", id: "abrir", t: "Abrir la carpeta en tu app" },
      { g: "Empezar", id: "pedir", t: "Cómo pedirle cosas al agente" },
      { g: "Videos", id: "animado", t: "Video animado" },
      { g: "Videos", id: "grabado", t: "Video grabado" },
      { g: "Videos", id: "mixto", t: "Video mixto" },
      { g: "Tu marca", id: "marca", t: "Cargar o cambiar tu marca" },
      { g: "Tu marca", id: "colores", t: "Colores y contraste" },
      { g: "Tu marca", id: "varias", t: "Varias marcas o clientes" },
      { g: "Organizar", id: "plan", t: "Planificar el contenido" },
      { g: "Organizar", id: "archivos", t: "Subir y ordenar archivos" },
      { g: "Cuidarte", id: "seguridad", t: "Seguridad, cuentas y gastos" },
      { g: "Cuidarte", id: "falla", t: "Si algo falla" }
    ];
    E.modulos.forEach(function (m) { if (m.guia) t.push({ g: "Herramientas", id: "mod:" + m.id, t: m.nombre + (m.activo ? "" : " (apagada)") }); });
    return t;
  }
  function textoManual(id) {
    var app = E.app || "tu app";
    var T = {
      como: '<p>Hay tres piezas y las tres usan la misma carpeta, la del sistema. Tus marcas, videos y archivos quedan en su carpeta <code>mis-videos</code>.</p>' +
        '<div class="como"><div class="pieza"><span class="eyebrow">Tu app</span><strong>' + esc(E.app || "Claude, ChatGPT o Antigravity") + '</strong><span class="muted chico">Ahí conversas con el agente. Todo se crea y se cambia ahí.</span></div>' +
        '<div class="pieza centro"><span class="eyebrow">La carpeta</span><strong>mis-videos</strong><span class="muted chico">El agente guarda ahí tu marca, el plan, los archivos y los videos.</span></div>' +
        '<div class="pieza"><span class="eyebrow">Este panel</span><strong>Guía y revisión</strong><span class="muted chico">Lee la carpeta para mostrarte todo ordenado. Aquí subes archivos, revisas y mantienes el sistema.</span></div></div>' +
        "<p>El panel <strong>no</strong> está conectado a tu app: no le manda mensajes al agente. Lo que subes queda en la carpeta y el agente lo encuentra cuando le hablas. Lo que el agente cambia aparece aquí solo, en unos segundos.</p>" +
        '<p class="muted chico">El panel funciona solo en tu computador, mientras su ventana negra esté abierta. Para apagarlo, cierra esa ventana.</p>',
      abrir: "<ol>" + pasosApp().map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + '<li>Escribe: «Hola, quiero empezar».</li></ol><div class="botones-fila"><span class="mono" style="overflow-wrap:anywhere">' + esc(E.sistema.raiz) + '</span><button class="btn btn-chico" type="button" data-copiar-ruta="1">Copiar la ruta</button></div>' +
        '<p class="muted chico">Estas instrucciones son para ' + esc(app) + ". Puedes cambiar la app en Mantenimiento → Ajustes. Cada vez que el sistema cambia (una herramienta nueva, una actualización), empieza una conversación nueva para que el agente lo vea.</p>",
      pedir: "<ul><li>Háblale como a una persona del equipo: qué quieres, para qué red y para cuándo.</li><li>Para cambios en un video, di el minuto y el segundo: «en el 0:12 el texto tapa la cara».</li><li>Si algo no te convence, dilo: el agente propone y tú decides.</li><li>No le pases contraseñas ni datos de tus clientes.</li></ul>" +
        decile("Quiero un video de 30 segundos para Instagram sobre cómo guardar el pan. Que termine invitando a escribir por WhatsApp."),
      animado: '<ol><li>Pide el video y elige una de las 3 ideas que te propone.</li><li>Aprueba el guion visual: qué se dice y qué se ve en cada frase.</li><li>Graba tu voz con <code>Grabador.bat</code> (modo solo audio) o con el celular, y súbela en Subir.</li><li>Aprueba la muestra de 5 a 8 segundos con el estilo final.</li><li>Mira el borrador (un MP4 que abres desde Verificar → Videos) y pide los cambios.</li><li>Recibe la entrega en vertical y, si va a YouTube, en horizontal.</li></ol>' +
        decile("Quiero un video animado de 30 segundos presentando mi negocio. Propón 3 ideas."),
      grabado: '<ol><li>Grábate con el celular o graba tu pantalla con <code>Grabador.bat</code>.</li><li>Súbelo en Subir (lo del grabador ya queda en tu marca).</li><li>El agente te cuenta qué propone cortar y espera tu sí.</li><li>Aprueba una muestra de 10 segundos con subtítulos, encuadre y acercamientos.</li><li>Mira el borrador y recibe una versión por red.</li></ol>' +
        decile("Subí un video que grabé con el celular. Déjalo listo para Instagram y LinkedIn."),
      mixto: "<ol><li>Pide el video y aprueba el guion, que marca qué partes son cámara y cuáles animación.</li><li>Grábate a cámara diciendo el guion.</li><li>Aprueba la muestra: un corte de cámara y una animación.</li><li>Mira el borrador y pide los cambios.</li></ol>" +
        decile("Quiero un video donde hablo a cámara y aparecen los datos animados."),
      marca: '<p>La marca la carga y la cambia el agente, conversando. Tú la revisas en <a class="enlace" href="#verificar">Verificar → Marca</a>.</p><ul><li>Si tienes web, dásela: saca colores, fuentes y logo.</li><li>Sube tu logo en Subir (mejor SVG o PNG sin fondo).</li><li>Los videos ya hechos no cambian; los nuevos sí.</li></ul>' +
        decile("Cambia el tono de mi marca: quiero sonar más cercano y usar tú en vez de usted."),
      colores: "<p>El agente propone paletas que pasan cuatro pruebas de contraste: texto sobre fondo (4,5:1), los dos acentos sobre fondo (3:1) y la palabra marcada de los subtítulos (3:1). En Verificar ves las pruebas de cada paleta con su número.</p><div class=\"ojo\">Si una prueba sale en amarillo, ese texto se va a leer mal en el teléfono. Pídele al agente que lo ajuste.</div>" +
        decile("Proponme 3 paletas más cálidas a partir de mi logo."),
      varias: "<p>Cada marca tiene su ficha, sus colores, su personaje, sus recursos, sus videos y su límite de créditos. Con una sola marca, el panel no muestra selector; con dos o más, aparece arriba.</p><ul><li>Para agregar una marca, díselo al agente: hace el mismo onboarding.</li><li>El agente trabaja con la marca <strong>activa</strong>. Para cambiarla, díselo al agente.</li><li>El selector de arriba solo cambia qué marca revisas aquí.</li></ul>" +
        decile("Quiero agregar otra marca: un cliente nuevo."),
      plan: '<p>El agente arma el plan del mes con tu objetivo, tus temas fijos (pilares), las fechas importantes y lo que mejor te ha funcionado. Tú lo revisas en <a class="enlace" href="#verificar">Verificar → Plan</a>.</p><ul><li>Cada video avanza por etapas: idea, guion, grabar, editar, revisar, listo y publicado.</li><li>Cuéntale al agente las vistas de lo que publicas: las anota y propone más de lo que rinde.</li></ul>' +
        decile("Arma el plan del mes que viene: 3 videos por semana, con las fechas importantes."),
      archivos: '<p>Todo entra por <a class="enlace" href="#subir">Subir</a>: audios, videos, fotos, logos, fuentes o un kit de marca. Quedan en la bandeja hasta que el agente los ordena en su carpeta, con fecha en el nombre. Nunca borra nada y anota cada movimiento.</p><p>Cuando necesita algo, lo busca en este orden: del video, de la temática, de la marca, los tuyos generales y, por último, los que trae el sistema.</p>' +
        decile("Ordena lo que dejé en la bandeja."),
      seguridad: '<ul><li>Tus videos y tu voz se procesan en tu computador.</li><li>La app de IA sí ve lo que el agente lee: no le pases datos de clientes ni contraseñas.</li><li>Nada que cueste dinero se hace sin tu sí, y cada marca tiene un límite de créditos por video (0 por defecto: nada pagado).</li><li>Usa cuentas tuyas, con verificación en dos pasos y un tope de gasto si cobran por uso.</li><li>Las herramientas que usan internet, cuestan créditos o son de terceros lo dicen antes de activarlas.</li></ul><div class="botones-fila"><button class="btn btn-chico" type="button" data-abrir="SEGURIDAD.md">Leer SEGURIDAD.md completo</button></div>',
      falla: "<ul><li><strong>El agente no ve el editor de video:</strong> reinicia la app; en ChatGPT, marca la carpeta como de confianza.</li><li><strong>Moviste la carpeta del sistema:</strong> Mantenimiento → Reparar instalación.</li><li><strong>Algo dice FALTA:</strong> Mantenimiento → Reparar instalación.</li><li><strong>El agente no ve una herramienta que activaste:</strong> empieza una conversación nueva.</li><li><strong>La vista previa no suena:</strong> pide el borrador en MP4 y ábrelo desde Verificar → Videos.</li><li><strong>El panel dice que se apagó:</strong> abre Panel.bat de nuevo.</li></ul>" +
        decile("Algo no funciona: te cuento qué pasó y en qué paso.")
    };
    if (id.indexOf("mod:") === 0) {
      var mod = E.modulos.filter(function (x) { return "mod:" + x.id === id; })[0];
      if (!mod) return "<p>No encuentro esa guía.</p>";
      return (mod.activo ? "" : '<div class="ojo">Esta herramienta está apagada: el agente no la conoce. Actívala en <a class="enlace" href="#mantenimiento">Mantenimiento</a>.</div>') + md(mod.guia);
    }
    return T[id] || T.como;
  }
  vistas.manual = function () {
    var temas = temasManual(), grupos = [];
    temas.forEach(function (m) { if (grupos.indexOf(m.g) < 0) grupos.push(m.g); });
    var item = temas.filter(function (m) { return m.id === ui.tema; })[0] || temas[0];
    var html = '<div class="cabeza"><span class="eyebrow">Manual</span><h1>Cómo se usa</h1><p class="muted">Instrucciones paso a paso' + (E.app ? ", escritas para " + esc(E.app) : "") + '. La app se cambia en Mantenimiento → Ajustes.</p></div>';
    html += '<div class="manual"><nav class="indice" aria-label="Temas del manual">' + grupos.map(function (g) {
      return '<span class="grupo">' + esc(g) + "</span>" + temas.filter(function (m) { return m.g === g; }).map(function (m) { return '<button type="button" data-tema="' + esc(m.id) + '" aria-current="' + (m.id === item.id) + '">' + esc(m.t) + "</button>"; }).join("");
    }).join("") + '</nav><article class="articulo tarjeta"><span class="eyebrow">' + esc(item.g) + "</span><h2>" + esc(item.t) + "</h2>" + textoManual(item.id) + "</article></div>";
    return html;
  };

  // ---------- Verificar ----------
  vistas.verificar = function () {
    var m = marcaVista();
    var html = '<div class="cabeza"><span class="eyebrow">Verificar</span><h1>Lo que hizo el agente</h1><p class="muted">Solo para revisar. Si algo no te convence, díselo al agente en tu app: el cambio aparece aquí solo.</p></div>';
    if (!m) return html + vacio("Todavía no hay ninguna marca", "El agente la crea contigo. Abre la carpeta del sistema en tu app y escríbele:", "Hola, quiero empezar.");
    html += '<div class="tabs" role="group" aria-label="Qué revisar">' + [["marca", "Marca"], ["plan", "Plan"], ["videos", "Videos"]].map(function (t) { return '<button type="button" data-tabver="' + t[0] + '" aria-pressed="' + (ui.tabVer === t[0]) + '">' + t[1] + "</button>"; }).join("") + "</div>";
    if (ui.tabVer === "plan") html += verPlan(m); else if (ui.tabVer === "videos") html += verVideos(m); else html += verMarca(m);
    return html;
  };

  function verMarca(m) {
    var r = m.resumen, p = m.paleta, html = '<div class="kit"><div class="columna">';
    html += '<section class="tarjeta"><div class="tarjeta-head"><h2>Colores</h2>' + (!p ? '<span class="pill p-gris">Sin paleta</span>' : p.deEjemplo ? '<span class="pill p-gris">Colores de ejemplo</span>' : pillPasa(p)) + "</div>" +
      (p ? muestras(p) + '<div class="pruebas">' + chipsPruebas(p) + "</div>" : "") +
      (!p || p.deEjemplo ? '<p class="muted chico">La marca usa todavía los colores del estilo de ejemplo.</p>' + (m.propuestas.length ? "" : decile("Proponme 3 paletas a partir de mi logo.")) : "");
    if (m.propuestas.length) {
      html += '<h3 style="margin-top:6px">Paletas que propuso el agente' + (m.propuestas[0].fecha ? " (" + esc(m.propuestas[0].fecha) + ")" : "") + '</h3><div class="paletas">' + m.propuestas.map(function (x) {
        var actual = p && ["fondo", "fondo2", "texto", "acento", "acento2"].every(function (k) { return p[k] === String(x[k]).toUpperCase(); });
        return '<div class="paleta"><div class="fila"><strong>' + esc(x.nombre) + (actual ? " (la actual)" : "") + "</strong>" + (x.pasaTodo ? '<span class="pill p-ok">4 de 4</span>' : '<span class="pill p-warn">Revisar</span>') + "</div>" +
          (x.para ? '<span class="muted chico">' + esc(x.para) + "</span>" : "") + muestras(x) + '<span class="pruebas">' + chipsPruebas(x) + "</span></div>";
      }).join("") + "</div>" + decile("Me quedo con la paleta " + m.propuestas[0].nombre + ".");
    }
    html += "</section>";

    var fila = function (k, v, raw) { return '<div class="fila-dato"><span class="muted">' + esc(k) + "</span><span>" + (raw ? v : valor(v)) + "</span></div>"; };
    var pj = m.personaje.estado ? '<span class="pill ' + (/^aprobado/i.test(m.personaje.estado) ? "p-ok" : "p-warn") + '">' + esc(m.personaje.estado) + "</span>" : "";
    html += '<section class="tarjeta"><div class="tarjeta-head"><h2>Cómo se ve y cómo habla</h2>' + (/^completa/i.test(m.estadoFicha) ? '<span class="pill p-ok">Ficha completa</span>' : '<span class="pill p-warn">Ficha ' + esc(m.estadoFicha || "sin completar") + "</span>") + "</div>" +
      (m.logo ? '<img class="logo-ver" src="' + archivo(m.logo) + '" alt="Logo de ' + esc(m.nombre) + '">' : "") + "<div>" +
      fila("A qué se dedica", r.rubro) + fila("A quién le habla", r.publico) +
      fila("Tipografías", p && p.titulos ? esc(p.titulos) + (p.cuerpo && p.cuerpo !== p.titulos ? " y " + esc(p.cuerpo) : "") : "", true) +
      fila("Tono", r.tono) + fila("Tú o usted", r.trato) + fila("Redes y formatos", r.redes) + fila("Música", r.musica) +
      fila("Personaje", (r.tienePersonaje ? fmt(r.tienePersonaje) + (r.personaje ? ": " + fmt(r.personaje) : "") : '<span class="valor-vacio">Sin completar</span>') + " " + pj, true) +
      fila("Temáticas", m.tematicas.length ? esc(m.tematicas.map(function (t) { return t.nombre; }).join(", ")) : '<span class="valor-vacio">Ninguna</span>', true) +
      fila("Límite de créditos por video", '<span class="mono">' + esc(r.limite) + "</span>" + (/^0\b/.test(r.limite) ? ' <span class="muted chico">(nada pagado)</span>' : ""), true) +
      "</div>" + (r.palabras.length ? '<div style="display:flex;flex-direction:column;gap:6px"><span class="eyebrow">Palabras de la marca (para la transcripción)</span><div class="chips">' + r.palabras.map(function (x) { return '<span class="chip">' + esc(x) + "</span>"; }).join("") + "</div></div>" : "") +
      '<div class="botones-fila"><button class="btn btn-chico" type="button" data-abrir="' + esc(m.rutaFicha) + '">Abrir la ficha</button><button class="btn btn-chico" type="button" data-abrir="' + esc(m.rutaCarpeta) + '">Abrir la carpeta de la marca</button></div></section>';

    if (m.personaje.prueba) html += '<section class="tarjeta"><div class="tarjeta-head"><h2>Prueba del personaje</h2>' + pj + '</div><video class="prueba" controls preload="metadata" src="' + archivo(m.personaje.prueba) + '"></video>' +
      (/^aprobado/i.test(m.personaje.estado) ? "" : decile("Me gusta el personaje, apruébalo.")) + "</section>";

    html += '<section class="tarjeta ficha-completa"><details><summary>La ficha completa</summary>' + m.secciones.map(function (s) {
      return "<h3>" + esc(s.titulo) + "</h3><div>" + s.filas.map(function (f) { return fila(f[0], f[1]); }).join("") + "</div>";
    }).join("") + "</details></section>";
    html += '</div><aside class="vista-previa"><span class="eyebrow">Así se ve en un reel</span><div class="pantalla" id="pantalla"></div><span class="leyenda-zona">Dato arriba, logo o personaje al medio, subtítulos y franja abajo (sin texto: ahí lo tapan las apps).</span></aside></div>';
    return html;
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
  function pillEtapa(e) { var cls = e === 6 ? "p-ok" : e >= 4 ? "p-azul" : e === 0 ? "p-gris" : "p-warn"; return '<span class="pill ' + cls + '">' + ETAPAS[e] + "</span>"; }
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
    html += '<section class="tarjeta"><span class="eyebrow">Objetivo de ' + MESES[mes - 1] + '</span><h2>' + (plan.objetivo ? fmt(plan.objetivo) : '<span class="valor-vacio">Sin objetivo</span>') + "</h2>" + (m.resumen.cta ? '<p class="muted chico">Llamado a la acción: ' + fmt(m.resumen.cta) + "</p>" : "") + "</section>";
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
          plan.funciono.map(function (r) { return "<tr>" + cols.map(function (c) { return '<td' + (/vistas/i.test(c) ? ' class="num"' : "") + ">" + fmt(r[c]) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>" : "") +
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
      (vid ? '<div style="display:flex;flex-direction:column;gap:8px"><span class="eyebrow">Sus archivos</span><span class="mono muted" style="overflow-wrap:anywhere">' + esc(vid.ruta) + "</span>" + accionesVideo(vid) + "</div>" : '<p class="muted chico">Todavía no tiene carpeta: el agente la crea cuando empieza el video.</p>') +
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
    if (!m.videos.length) return vacio("Todavía no hay videos", "Cuando el agente empieza un video, aparece aquí con su etapa, el guion, el borrador y las entregas.", "Hagamos un video de 30 segundos presentando mi negocio.");
    var orden = ["idea", "guion", "voz", "muestra", "en animación", "en revisión", "entregado"];
    var pill = function (s) { var n = norm(s), cls = /^entregado/.test(n) ? "p-ok" : /revision|animacion/.test(n) ? "p-azul" : !n || /^idea/.test(n) ? "p-gris" : "p-warn"; return '<span class="pill ' + cls + '">' + esc(s || "sin estado") + "</span>"; };
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

  // ---------- Subir ----------
  vistas.subir = function () {
    var m = E.marcas.filter(function (x) { return x.id === E.activa; })[0];
    var html = '<div class="cabeza"><span class="eyebrow">Subir</span><h1>Deja aquí lo que necesita el agente</h1><p class="muted">Audios, videos, fotos, logos, fuentes o un kit de marca. Quedan en la bandeja; la próxima vez que le hables, el agente los ordena en su carpeta, les pone fecha y anota qué movió. Nunca borra nada.</p></div>';
    html += '<label class="soltar" id="soltar" for="archivos-in"><strong>Arrastra archivos aquí o haz clic para elegirlos</strong><span class="muted chico">Se copian a la bandeja (<span class="mono">mis-videos/bandeja</span>). Tus originales no se tocan.</span><input type="file" id="archivos-in" multiple></label>';
    html += '<div class="subidas" id="subidas"></div>';
    var conMarca = !!m;
    html += '<section class="tarjeta"><div class="tarjeta-head"><h2>En la bandeja (' + E.bandeja.length + ")</h2>" + (E.bandeja.length ? '<span class="pill p-warn">Esperando al agente</span>' : '<span class="pill p-ok">Todo ordenado</span>') + "</div>" +
      (E.bandeja.length ? (conMarca ? '<p class="muted chico">Dónde los dejaría el agente en la marca activa, <strong>' + esc(m.nombre) + "</strong>. Si van a otra marca o a un video, díselo.</p>" : '<p class="muted chico">Todavía no hay una marca activa: el agente te preguntará a cuál van.</p>') +
        "<div>" + E.bandeja.map(function (f) {
          var p = f.propuesta, tipo = f.acompana ? "datos" : p ? p.tipo : "—", destino = f.acompana ? "Viaja con su video" : p ? (p.destino ? "Irá a: " + p.destino.replace(/^mis-videos\//, "") : p.motivo) : conMarca ? "" : "Espera a que crees tu marca";
          return '<div class="archivo"><span class="tipo-a">' + esc(tipo) + "</span><span><span>" + esc(f.nombre) + ' <span class="muted chico">' + tam(f.tam) + '</span></span><br><span class="ruta">' + esc(destino) + '</span></span><span class="pill p-gris">En espera</span></div>';
        }).join("") + "</div>" + decile("Ordena lo que dejé en la bandeja.") : '<p class="muted">La bandeja está vacía.</p>') +
      '<div class="botones-fila"><button class="btn btn-chico" type="button" data-abrir="mis-videos/bandeja">Abrir la bandeja</button></div></section>';
    html += '<section class="tarjeta"><div class="tarjeta-head"><h2>Lo que ordenó el agente</h2><span class="muted chico">' + E.registroTotal + " en total</span></div>" +
      (E.registro.length ? "<div>" + E.registro.map(function (o) {
        return '<div class="archivo"><span class="tipo-a" style="background:var(--ok-soft);color:var(--ok)">' + esc(o.fecha.slice(5) || "Listo") + "</span><span><span>" + esc(o.archivo) + '</span><br><span class="ruta">' + esc(o.destino) + "</span></span><span></span></div>";
      }).join("") + '</div><div class="botones-fila"><button class="btn btn-chico" type="button" data-abrir="mis-videos/registro-de-archivos.md">Abrir el registro completo</button></div>' : '<p class="muted">Todavía no ha ordenado nada.</p>') + "</section>";
    var g = E.generales, id = m ? m.id : "<tu-marca>";
    html += '<section class="tarjeta"><h2>Dónde busca el agente</h2><p class="muted chico">Cuando necesita una foto, una música o un icono, usa el primero que encuentra en este orden: del video, de la temática, de la marca, los tuyos generales y, por último, los que trae el sistema.</p><div class="niveles">' +
      '<div class="nivel"><h3>Del video</h3><span class="muted chico">Solo ese video</span><ul><li>Guion</li><li>Voz y clips grabados</li><li>Fotos para ese video</li></ul><span class="mono muted">videos/…/fuentes/</span></div>' +
      '<div class="nivel"><h3>De la marca</h3><span class="muted chico">' + esc(m ? m.nombre : "Tu marca") + ' (y sus temáticas)</span><ul><li>Logo, fuentes y personaje</li><li>Fotos del negocio y productos</li><li>Música de la marca</li></ul><span class="mono muted">marcas/' + esc(id) + '/recursos/</span></div>' +
      '<div class="nivel"><h3>Generales</h3><span class="muted chico">Para todas las marcas</span><ul><li>' + g.musica + " música" + (g.musica === 1 ? "" : "s") + "</li><li>" + g.sonidos + " sonido" + (g.sonidos === 1 ? "" : "s") + "</li><li>" + g.iconos + " icono" + (g.iconos === 1 ? "" : "s") + '</li></ul><span class="mono muted">mis-videos/recursos/ y recursos/</span></div></div></section>';
    html += '<section class="tarjeta"><h2>Cómo queda ordenada la carpeta</h2><pre class="arbol">mis-videos/\n├── bandeja/                  ← lo que subes aquí\n├── recursos/                 ← tus generales: música, sonidos, iconos\n├── registro-de-archivos.md   ← qué movió el agente y a dónde\n└── marcas/\n    └── ' + esc(id) + '/\n        ├── ficha.md\n        ├── estilo/           ← colores, logo y fuentes\n        ├── personaje/  referencias/  documentos/\n        ├── recursos/         ← imágenes, música e iconos de la marca\n        ├── tematicas/  plan/\n        ├── grabaciones/      ← originales, nunca se modifican\n        └── videos/\n            └── AAAA-MM-DD_nombre/\n                ├── guion.md\n                ├── fuentes/  ← voz, fotos y clips de este video\n                ├── proyecto/\n                └── entregas/ ← borrador y un MP4 por red</pre></section>';
    return html;
  };
  function pintarSubidas() {
    var c = $("#subidas"); if (!c) return;
    c.innerHTML = ui.subidas.slice(-8).map(function (s) {
      var est = s.estado === "lista" ? '<span class="pill p-ok">En la bandeja</span>' : s.estado === "error" ? '<span class="pill p-warn" title="' + esc(s.error) + '">' + esc(s.error) + "</span>" : s.estado === "subiendo" ? '<span class="pill p-azul">' + Math.round(s.prog * 100) + "%</span>" : '<span class="pill p-gris">En cola</span>';
      return '<div class="subida"><span>' + esc(s.final || s.nombre) + ' <span class="muted chico">' + tam(s.tam) + '</span></span><div class="barra-prog"><i style="width:' + Math.round(s.prog * 100) + '%"></i></div>' + est + "</div>";
    }).join("");
  }
  function encolar(files) {
    files.forEach(function (f) { ui.subidas.push({ nombre: f.name, tam: f.size, prog: 0, estado: "espera", file: f }); });
    pintarSubidas();
    if (!ui.subiendo) siguienteSubida();
  }
  function siguienteSubida() {
    var s = ui.subidas.filter(function (x) { return x.estado === "espera"; })[0];
    if (!s) { ui.subiendo = false; refrescar(); return; }
    ui.subiendo = true; s.estado = "subiendo"; pintarSubidas();
    var x = new XMLHttpRequest();
    x.open("POST", "/api/subir?nombre=" + encodeURIComponent(s.nombre));
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
  function prepararSoltar() {
    var z = $("#soltar"), inp = $("#archivos-in"); if (!z) return;
    inp.addEventListener("change", function () { if (inp.files.length) encolar(Array.prototype.slice.call(inp.files)); inp.value = ""; });
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
      if (files.length) encolar(files);
    });
    pintarSubidas();
  }

  // ---------- Mantenimiento ----------
  vistas.mantenimiento = function () {
    var html = '<div class="cabeza"><span class="eyebrow">Mantenimiento</span><h1>Actualizar y ajustar</h1><p class="muted">Lo único que se cambia desde aquí: la versión del sistema, qué herramientas están activas y la app que usas. Tus marcas, videos y grabaciones nunca se tocan.</p></div>';
    var v = ui.version;
    html += '<div class="grid g2" style="align-items:start"><section class="tarjeta"><div class="tarjeta-head"><h2>Versión</h2><span class="mono">v' + esc(E.sistema.version) + "</span></div>";
    if (!E.sistema.repositorio) html += '<p class="muted chico">Esta copia no tiene un repositorio configurado para buscar versiones nuevas (<code>sistema.json</code>).</p>';
    else if (!v) html += '<p class="muted chico">Buscando si hay una versión nueva…</p>';
    else if (v.error) html += '<p class="muted chico">' + esc(v.error) + '</p><div><button class="btn btn-chico" type="button" id="btn-buscar">Buscar de nuevo</button></div>';
    else if (v.nueva) html += "<p><strong>Versión " + esc(v.nueva) + ' disponible</strong></p><pre class="notas">' + esc(v.notas || "Sin notas.") + '</pre><div><button class="btn btn-pri" type="button" id="btn-actualizar">Actualizar</button></div>';
    else html += '<span class="pill p-ok" style="align-self:flex-start">Estás al día</span>';
    html += "</section>";
    var inst = E.instalacion;
    if (inst) {
      var faltan = (inst.piezas || []).filter(function (p) { return !p.quedo && p.imprescindible; });
      html += '<section class="tarjeta"><div class="tarjeta-head"><h2>Instalación</h2>' + (faltan.length ? '<span class="pill p-warn">Faltan ' + faltan.length + "</span>" : '<span class="pill p-ok">Todo listo</span>') + '</div><ul class="lista">' +
        (inst.piezas || []).map(function (p) { return '<li><span>' + esc(p.pieza) + (p.quedo ? "" : '<br><span class="muted chico">' + esc(p.siFalla) + "</span>") + "</span>" + (p.quedo ? '<span class="pill p-ok">Listo</span>' : p.imprescindible ? '<span class="pill p-warn">Falta</span>' : '<span class="pill p-gris">Opcional</span>') + "</li>"; }).join("") +
        '</ul><p class="muted chico">Revisada el ' + esc(String(inst.fecha || "").replace("T", " ").slice(0, 16)) + '.</p><div><button class="btn btn-chico" type="button" id="btn-reparar">Reparar instalación</button></div></section></div>';
    } else html += '<section class="tarjeta"><div class="tarjeta-head"><h2>Instalación</h2><span class="pill p-gris">Sin revisar</span></div><p class="muted chico">No encuentro el resumen de la instalación. Revísala con el botón: abre una ventana que instala lo que falte.</p><div><button class="btn btn-chico" type="button" id="btn-reparar">Reparar instalación</button></div></section></div>';

    html += '<h2 style="margin-top:4px">Herramientas</h2><p class="muted chico" style="margin-top:-12px">El agente solo conoce las que están activas. Antes de activar una ves qué instala, si usa internet y si cuesta créditos. Después de cambiar algo, empieza una conversación nueva en tu app.</p>';
    var porId = {}; E.modulos.forEach(function (m) { porId[m.id] = m; });
    html += '<div class="grid g3">' + E.modulos.map(function (m) {
      var badges = (m.siempre ? '<span class="pill p-azul">Parte de la base</span>' : "") + (m.usaInternet ? '<span class="pill p-azul">Usa internet</span>' : '<span class="pill p-gris">Solo en tu equipo</span>') + (m.cuestaCreditos ? '<span class="pill p-warn">Cuesta créditos</span>' : "") + (m.deTerceros ? '<span class="pill p-rec">De terceros</span>' : "");
      var req = (m.requiere || []).map(function (r) { return porId[r] ? porId[r].nombre : r; });
      var conf = ui.pendiente === m.id ? '<div class="confirmar" role="group" aria-label="Confirmar activación"><strong>Al activarla:</strong><ul>' + (m.instala || []).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") +
        (req.length ? "<li>Se activa" + (req.length > 1 ? "n" : "") + " también: " + esc(req.join(", ")) + "</li>" : "") + "<li>" + (m.usaInternet ? "Usa internet" : "No usa internet") + "</li><li>" + (m.cuestaCreditos ? "Puede costar créditos (siempre con tu sí y dentro del límite de la marca)" : "No cuesta créditos") + "</li>" + (m.deTerceros ? "<li>Es de terceros: revisa su licencia en TERCEROS.md</li>" : "") +
        '</ul><div class="botones"><button class="btn btn-pri btn-chico" type="button" data-activar="' + esc(m.id) + '">Activar</button><button class="btn btn-chico" type="button" data-cancelar="1">Cancelar</button></div></div>' : "";
      return '<section class="tarjeta modulo' + (ui.ocupado === m.id ? " ocupado" : "") + '"><div class="arriba"><h3>' + esc(m.nombre) + '</h3><label class="switch"><input type="checkbox" data-mod="' + esc(m.id) + '"' + (m.activo ? " checked" : "") + (m.siempre ? " disabled" : "") + ' aria-label="' + (m.activo ? "Apagar " : "Activar ") + esc(m.nombre) + '"><span></span></label></div><p class="muted" style="font-size:.9rem">' + esc(m.descripcion) + "</p>" +
        (req.length ? '<span class="muted chico">Necesita: ' + esc(req.join(", ")) + "</span>" : "") + '<div class="chips">' + badges + "</div>" + conf +
        (m.guia ? '<button class="enlace chico" type="button" data-guia="' + esc(m.id) + '" style="align-self:flex-start">Ver su guía paso a paso</button>' : "") + "</section>";
    }).join("") + "</div>";
    html += '<section class="tarjeta"><h2>Ajustes</h2>' +
      '<div class="opcion"><div><strong>Tu app de agente</strong><p class="muted chico">Cambia las instrucciones del manual. La carpeta funciona con las tres.</p></div><div class="segmentos" role="group" aria-label="App de agente">' +
      ["Claude", "ChatGPT", "Antigravity"].map(function (a) { return '<button type="button" data-app="' + a + '" aria-pressed="' + (E.app === a) + '">' + a + "</button>"; }).join("") + "</div></div>" +
      '<div class="opcion"><div><strong>Tus datos</strong><p class="muted chico">Marcas, videos, grabaciones y bandeja. Actualizar nunca los toca.</p><p class="mono muted">mis-videos</p></div><button class="btn btn-chico" type="button" data-abrir="mis-videos">Abrir</button></div>' +
      '<div class="opcion"><div><strong>Carpeta del sistema</strong><p class="mono muted" style="overflow-wrap:anywhere">' + esc(E.sistema.raiz) + '</p></div><button class="btn btn-chico" type="button" data-abrir=".">Abrir</button></div>' +
      '<div class="opcion"><div><strong>Seguridad y privacidad</strong><p class="muted chico">Qué sale de tu computador, cuentas, gastos y versiones.</p></div><button class="btn btn-chico" type="button" data-abrir="SEGURIDAD.md">Leer</button></div></section>';
    return html;
  };
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

  // ---------- Router y refresco ----------
  var nombres = ["inicio", "manual", "verificar", "subir", "mantenimiento"];
  function actual() {
    var h = location.hash.replace("#", "").split("/");
    if (h[0] === "verificar" && ["marca", "plan", "videos"].indexOf(h[1]) >= 0) ui.tabVer = h[1];
    return nombres.indexOf(h[0]) >= 0 ? h[0] : "inicio";
  }
  function render() {
    if (!E) return;
    var v = actual();
    document.querySelectorAll(".nav a").forEach(function (a) { if (a.dataset.vista === v) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    var foco = document.activeElement && document.activeElement.id;
    $("#vista").innerHTML = vistas[v]();
    if (v === "verificar" && ui.tabVer === "marca") pintarPantalla();
    if (v === "subir") prepararSoltar();
    pintarBarra();
    if (foco && document.getElementById(foco)) document.getElementById(foco).focus();
  }
  function refrescar() {
    return api("/api/estado").then(function (d) {
      $("#aviso").hidden = true;
      var t = JSON.stringify(d);
      if (t === textoE) return;
      textoE = t; E = d;
      if (ui.marca && !E.marcas.some(function (m) { return m.id === ui.marca; })) ui.marca = null;
      render();
    }).catch(function () {
      var a = $("#aviso"); a.textContent = "El panel se apagó (se cerró su ventana negra). Ábrelo de nuevo con Panel.bat."; a.hidden = false;
    });
  }
  window.addEventListener("hashchange", function () { cerrarCapas(); ui.pendiente = null; render(); window.scrollTo(0, 0); });
  setInterval(function () { if (!document.hidden && !ui.pendiente && !$("#capas").innerHTML) refrescar(); }, 4000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) refrescar(); });
  window.addEventListener("beforeunload", function (e) { if (ui.subiendo) { e.preventDefault(); e.returnValue = ""; } });

  // ---------- Eventos ----------
  document.addEventListener("toggle", function (e) { var d = e.target; if (d.dataset && d.dataset.paso) ui.abiertos[d.dataset.paso] = d.open; }, true);
  document.addEventListener("click", function (e) {
    var t = e.target.closest("button, [data-cerrar]");
    if (!t) return;
    var d = t.dataset;
    if (d.cerrar) { cerrarCapas(); return; }
    if (d.copiarRuta) {
      var hecho = function () { toast("Ruta copiada. Pégala con Ctrl+V donde tu app te pida la carpeta."); };
      if (navigator.clipboard) navigator.clipboard.writeText(E.sistema.raiz).then(hecho, function () { toast(E.sistema.raiz); }); else toast(E.sistema.raiz);
      return;
    }
    if (d.abrir) { abrir(d.abrir); return; }
    if (d.tema) { ui.tema = d.tema; recordar(); render(); return; }
    if (d.guia) { ui.tema = "mod:" + d.guia; recordar(); location.hash = "#manual"; return; }
    if (d.tabver) { ui.tabVer = d.tabver; recordar(); render(); return; }
    if (d.plan) { abrirFila(Number(d.plan)); return; }
    if (d.cancelar) { ui.pendiente = null; render(); return; }
    if (d.activar) { cambiarModulo(d.activar, "activar"); return; }
    if (d.app) { api("/api/ajustes", { app: d.app }).then(function (r) { if (r.error) toast(r.error); else { toast("El manual ahora está escrito para " + d.app + "."); refrescar(); } }); return; }
    if (d.ventana) {
      api("/api/ventana", { que: d.ventana }).then(function (r) { cerrarCapas(); toast(r.error || "Se abrió una ventana: sigue ahí. Este panel se actualiza solo."); });
      return;
    }
    if (t.id === "btn-actualizar") { confirmarVentana("actualizar"); return; }
    if (t.id === "btn-reparar") { confirmarVentana("reparar"); return; }
    if (t.id === "btn-buscar") { buscarVersion(); render(); return; }
  });
  function cambiarModulo(id, accion) {
    ui.pendiente = null; ui.ocupado = id; render();
    api("/api/modulo", { id: id, accion: accion }).then(function (r) {
      ui.ocupado = null;
      if (r.error) toast(r.error); else toast((r.mensaje || "Listo.").split("\n")[0] + " Empieza una conversación nueva en tu app para que el agente lo vea.");
      textoE = ""; refrescar();
    }).catch(function () { ui.ocupado = null; toast("No se pudo cambiar."); render(); });
  }
  document.addEventListener("change", function (e) {
    var t = e.target;
    if (t.id === "sel-marca") { ui.marca = t.value; ui.mes = null; recordar(); render(); return; }
    if (t.id === "sel-mes") { ui.mes = t.value; render(); return; }
    if (t.dataset.mod) {
      var id = t.dataset.mod;
      if (t.checked) { t.checked = false; ui.pendiente = id; render(); var b = $('[data-activar="' + id + '"]'); if (b) b.focus(); }
      else cambiarModulo(id, "apagar");
    }
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { cerrarCapas(); if (ui.pendiente) { ui.pendiente = null; render(); } } });

  refrescar().then(function () { if (E && E.sistema.repositorio) buscarVersion(); });
})();
