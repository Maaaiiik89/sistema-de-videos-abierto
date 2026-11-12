// Subtítulos dinámicos: la palabra que se está diciendo se resalta (recuadro naranja y un poco
// más grande); las que vienen se ven tenues hasta que llegan.
// Se carga como script clásico en index.html, antes de las escenas.
//
// Uso dentro de una escena, antes de registrar su timeline:
//   window.subtitulosDinamicos(tl, SUBS);     // SUBS = [[selector, desde, hasta], ...] en segundos de la escena
//
// Tiempos de cada palabra: si existe window.__VOZ[selector] (sale de Whisper: [[inicio, fin], ...] por palabra,
// en segundos de la escena), se usan esos. Si no, se reparten según el largo de cada palabra.
(function () {
  if (window.subtitulosDinamicos) return;

  var css = document.createElement("style");
  css.textContent =
    ".sb .w { display: inline-block; padding: 0 .07em; margin: 0 -.02em; border-radius: .16em; transform-origin: 50% 60%; }";
  document.head.appendChild(css);

  function partir(el) {
    var palabras = [];
    function envolver(texto, clave) {
      var frag = document.createDocumentFragment();
      texto.split(/(\s+)/).forEach(function (pedazo) {
        if (!pedazo) return;
        if (/^\s+$/.test(pedazo)) { frag.appendChild(document.createTextNode(" ")); return; }
        var s = document.createElement("span");
        s.className = "w" + (clave ? " kw" : "");
        s.textContent = pedazo;
        palabras.push(s);
        frag.appendChild(s);
      });
      return frag;
    }
    Array.prototype.slice.call(el.childNodes).forEach(function (n) {
      if (n.nodeType === 3) {
        el.replaceChild(envolver(n.textContent, false), n);
      } else if (n.nodeType === 1 && n.tagName === "B") {
        var f = envolver(n.textContent, true);
        n.textContent = "";
        n.appendChild(f);
      }
    });
    return palabras;
  }

  function tiemposEstimados(palabras, a, b) {
    var ini = a + 0.08, fin = b - 0.12;
    var pesos = palabras.map(function (p) { return 1 + p.textContent.replace(/[^\wáéíóúñü]/gi, "").length; });
    var total = pesos.reduce(function (x, y) { return x + y; }, 0);
    var t = ini, out = [];
    pesos.forEach(function (w) {
      var d = (fin - ini) * (w / total);
      out.push([t, t + d]);
      t += d;
    });
    return out;
  }

  // Colores: el acento y el texto salen del estilo de la marca (variables --accent y --paper de estilo.css)
  function colorCSS(nombre, porDefecto) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
    return /^#[0-9a-f]{6}$/i.test(v) ? v : porDefecto;
  }
  // Texto blanco sobre el acento si se lee bien (contraste WCAG de 3:1 o más); si no, casi negro.
  // Un amarillo o un lima piden texto oscuro; un azul o un rojo, texto blanco.
  // Se puede forzar con la variable --accent-ink en estilo.css.
  function tintaSobre(hex) {
    var n = parseInt(hex.slice(1), 16);
    var c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    var L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    return 1.05 / (L + 0.05) >= 3 ? "#FFFFFF" : "#111111"; // 3:1 basta para texto grande y en negrita
  }
  function rgba(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }
  window.subtitulosDinamicos = function (tl, subs) {
    var voz = window.__VOZ || {};
    var ACENTO = colorCSS("--accent", "#E8693A"), TEXTO = colorCSS("--paper", "#F4F0E6");
    var TINTA = colorCSS("--accent-ink", tintaSobre(ACENTO));
    subs.forEach(function (s) {
      var sel = s[0], a = s[1], b = s[2];
      var el = document.querySelector(sel);
      if (!el || el.dataset.dinamico) return;
      el.dataset.dinamico = "1";
      var palabras = partir(el);
      if (!palabras.length) return;
      var tiempos = voz[sel] && voz[sel].length === palabras.length ? voz[sel] : tiemposEstimados(palabras, a, b);
      palabras.forEach(function (p, i) {
        var ti = tiempos[i][0], tf = tiempos[i][1];
        var esClave = p.classList.contains("kw");
        tl.set(p, { opacity: 0.6, backgroundColor: rgba(ACENTO, 0), color: esClave ? ACENTO : TEXTO, scale: 1 }, a);
        tl.set(p, { opacity: 1, backgroundColor: rgba(ACENTO, 1), color: TINTA }, ti);
        tl.fromTo(p, { scale: 1 }, { scale: 1.12, duration: 0.08, ease: "power2.out" }, ti);
        tl.to(p, { scale: 1, duration: 0.12, ease: "power2.inOut" }, Math.max(ti + 0.08, tf - 0.12));
        tl.set(p, { backgroundColor: rgba(ACENTO, 0), color: esClave ? ACENTO : TEXTO }, tf);
      });
    });
  };
})();

// Monta los subtítulos de una escena desde voz.js (palabras reales de la voz, con sus tiempos).
// clave: "e1".."e6"; contenedor: el elemento raíz de la escena; tl: su timeline.
// Devuelve la lista [selector, desde, hasta] para ubicarSubtitulos() y subtitulosDinamicos().
(function () {
  if (window.montarSubtitulos) return;
  window.montarSubtitulos = function (clave, contenedor, tl) {
    var lista = (window.__SUBS_ESC || {})[clave] || [];
    var subs = [];
    lista.forEach(function (s) {
      var id = s[0], a = s[1], b = s[2];
      if (!document.getElementById(id)) {
        var div = document.createElement("div");
        div.className = "sb";
        div.id = id;
        div.innerHTML = s[3];
        div.style.opacity = "0";
        contenedor.appendChild(div);
      }
      tl.fromTo("#" + id, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.18, ease: "power3.out" }, a);
      tl.to("#" + id, { opacity: 0, duration: 0.12, ease: "power1.in" }, Math.max(a + 0.2, b - 0.12));
      subs.push(["#" + id, a, b]);
    });
    window.subtitulosDinamicos(tl, subs);
    return subs;
  };
  // Intensidad de la voz (0 a 1) en el segundo t de la voz completa
  window.intensidadVoz = function (t) {
    var amp = window.__AMP || [];
    var i = Math.floor(t * 30);
    return i >= 0 && i < amp.length ? amp[i] : 0;
  };
})();

// Arma lo común de una escena con voz: reloj, timeline, subtítulos y promesa de carga.
// id: data-composition-id; clave: "e1".."e6"; dur: segundos; raiz: elemento donde van los subtítulos.
(function () {
  if (window.armarEscena) return;
  // Formato del video: lo fija index.html (window.__FORMATO = "vertical" | "horizontal")
  window.formatoVideo = function () { return window.__FORMATO === "horizontal" ? "horizontal" : "vertical"; };
  var cssFmt = document.createElement("style");
  cssFmt.textContent =
    ".fmt-h .cv { width: 1920px !important; height: 1080px !important; }" +
    ".fmt-h .sb { left: 220px !important; right: 220px !important; font-size: 54px !important; }";
  document.head.appendChild(cssFmt);
  window.aplicarFormato = function (raiz) {
    if (window.formatoVideo() !== "horizontal") return;
    raiz.classList.add("fmt-h");
    Array.prototype.forEach.call(raiz.querySelectorAll("canvas.cv"), function (c) { c.width = 1920; c.height = 1080; });
  };
  window.armarEscena = function (id, clave, dur, raiz) {
    window.aplicarFormato(raiz);
    var host = { render: null, clock: { t: 0 }, clave: clave, horizontal: window.formatoVideo() === "horizontal" };
    window.__hf = window.__hf || {};
    window.__hf.buildReady = window.__hf.buildReady || {};
    window.__hf.buildReady[id] = new Promise(function (r) { host.ready = r; });
    var tl = gsap.timeline({ paused: true });
    tl.to(host.clock, { t: dur, duration: dur, ease: "none", onUpdate: function () { if (host.render) host.render(host.clock.t); } }, 0);
    host.tl = tl;
    host.subs = window.montarSubtitulos(clave, raiz, tl);
    host.base = (window.__ESCENAS || [])[parseInt(clave.slice(1), 10) - 1] || 0;
    return host;
  };
  // Segundo (dentro de la escena) en que se dice una palabra. n: cuál aparición (0 = la primera).
  window.tiempoPalabra = function (clave, palabra, n) {
    n = n || 0;
    var norm = function (s) { return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, ""); };
    var objetivo = norm(palabra), lista = (window.__SUBS_ESC || {})[clave] || [];
    // Primero la palabra exacta; si no aparece, la primera que empiece así
    for (var modo = 0; modo < 2; modo++) {
      var m = n;
      for (var i = 0; i < lista.length; i++) {
        var txt = lista[i][3].replace(/<br\s*\/?>/g, " ").replace(/<[^>]+>/g, "");
        var ws = txt.split(/\s+/).filter(Boolean), ts = (window.__VOZ || {})["#" + lista[i][0]] || [];
        for (var k = 0; k < ws.length; k++) {
          var w = norm(ws[k]);
          if (modo === 0 ? w === objetivo : w.indexOf(objetivo) === 0) { if (m-- === 0) return ts[k] ? ts[k][0] : lista[i][1]; }
        }
      }
    }
    if (window.console) console.warn("palabra no encontrada", clave, palabra);
    return 0;
  };
})();
