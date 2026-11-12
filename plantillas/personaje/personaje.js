// Personaje de ejemplo (neutro): un bloque con cara, brazos y piernas, dibujado en SVG.
// Es el molde para armar el personaje de cada marca UNA sola vez (skill "empezar", paso Personaje):
// se cambia el dibujo de cada parte y se mantienen los nombres de las acciones, así todas las
// escenas de todos los videos lo usan igual.
//
// Se carga como script clásico en index.html, después de subtitulos.js:
//   <script src="assets/personaje/personaje.js"></script>
//
// Uso dentro de una escena (tl = timeline de la escena, P = tiempoPalabra de la escena):
//   var pj = window.Personaje.montar(document.getElementById("escenario"), { x: 540, y: 700, escala: 1 });
//   pj.entrar(tl, 0.2);                       // aparece con un salto
//   pj.respirar(tl, 0, DUR);                  // nunca queda quieto
//   pj.parpadear(tl, [1.2, 3.8]);             // parpadeos
//   pj.hablar(tl, 0.3, 2.6, host.base);       // la boca se mueve con la voz (usa intensidadVoz)
//   pj.saludar(tl, P("hola"));
//   pj.apuntar(tl, P("aquí"), "derecha");
//   pj.expresion(tl, P("problema"), "sorpresa");
//   pj.caminar(tl, 3, 4.5, 300);              // camina 300 px a la derecha entre 3 y 4,5 s
//
// Reglas: todo es función del tiempo del timeline (nada de timers ni Math.random sin semilla).
(function () {
  if (window.Personaje) return;

  var NS = "http://www.w3.org/2000/svg";
  function el(tag, attrs, padre) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (padre) padre.appendChild(e);
    return e;
  }
  function css(nombre, porDefecto) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
    return v || porDefecto;
  }
  // Oscurece (f<0) o aclara (f>0) un color #rrggbb
  function tono(hex, f) {
    var n = parseInt(hex.replace("#", ""), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    c = c.map(function (v) { return Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f); });
    return "#" + c.map(function (v) { return ("0" + v.toString(16)).slice(-2); }).join("");
  }
  var cuenta = 0;

  window.Personaje = {
    // opciones: x, y (pies del personaje en px de la escena), escala, color, id
    montar: function (contenedor, o) {
      o = o || {};
      var id = o.id || "pj" + (++cuenta);
      var color = o.color || css("--accent", "#2F80ED");
      if (!/^#[0-9a-f]{6}$/i.test(color)) color = "#2F80ED";
      var tinta = o.tinta || "#111214";                 // contornos y pupilas (van sobre el cuerpo)
      var extremidad = o.extremidad || tono(color, -0.45); // brazos y piernas: el color del cuerpo más oscuro,
                                                           // se ve sobre fondo claro y oscuro
      var borde = o.borde || css("--paper", "#F7F5F0");  // un borde claro fino separa el personaje de un fondo oscuro
      var escala = o.escala || 1;

      // Raíz: un div posicionado por los pies, para mover el personaje entero con x/y
      var raiz = document.createElement("div");
      raiz.id = id;
      raiz.style.cssText = "position:absolute;left:" + ((o.x || 540) - 160) + "px;top:" + ((o.y || 700) - 400) +
        "px;width:320px;height:400px;transform-origin:50% 100%;";
      contenedor.appendChild(raiz);
      var svg = el("svg", { viewBox: "0 0 320 400", width: 320, height: 400, overflow: "visible" }, raiz);
      svg.style.transform = "scale(" + escala + ")";
      svg.style.transformOrigin = "50% 100%";

      // Partes (cada una en su grupo para animarla sola)
      var sombra = el("ellipse", { cx: 160, cy: 392, rx: 90, ry: 12, fill: "#000", opacity: 0.18 }, svg);
      var cuerpo = el("g", { id: id + "-cuerpo" }, svg);
      var piernaI = el("g", { id: id + "-piernaI" }, cuerpo);
      el("rect", { x: 112, y: 300, width: 22, height: 78, rx: 11, fill: extremidad, stroke: borde, "stroke-width": 3 }, piernaI);
      el("ellipse", { cx: 118, cy: 384, rx: 26, ry: 12, fill: extremidad, stroke: borde, "stroke-width": 3 }, piernaI);
      var piernaD = el("g", { id: id + "-piernaD" }, cuerpo);
      el("rect", { x: 186, y: 300, width: 22, height: 78, rx: 11, fill: extremidad, stroke: borde, "stroke-width": 3 }, piernaD);
      el("ellipse", { cx: 202, cy: 384, rx: 26, ry: 12, fill: extremidad, stroke: borde, "stroke-width": 3 }, piernaD);
      var torso = el("g", { id: id + "-torso" }, cuerpo);
      el("rect", { x: 66, y: 106, width: 188, height: 208, rx: 42, fill: borde, opacity: 0.9 }, torso);
      el("rect", { x: 70, y: 110, width: 180, height: 200, rx: 38, fill: color, stroke: tinta, "stroke-width": 8 }, torso);
      el("rect", { x: 92, y: 132, width: 136, height: 30, rx: 15, fill: "#FFFFFF", opacity: 0.25 }, torso);
      var cara = el("g", { id: id + "-cara" }, torso);
      var ojoI = el("g", { id: id + "-ojoI" }, cara);
      el("ellipse", { cx: 128, cy: 200, rx: 22, ry: 26, fill: "#FFFFFF", stroke: tinta, "stroke-width": 6 }, ojoI);
      el("circle", { cx: 132, cy: 204, r: 10, fill: tinta }, ojoI);
      var ojoD = el("g", { id: id + "-ojoD" }, cara);
      el("ellipse", { cx: 192, cy: 200, rx: 22, ry: 26, fill: "#FFFFFF", stroke: tinta, "stroke-width": 6 }, ojoD);
      el("circle", { cx: 196, cy: 204, r: 10, fill: tinta }, ojoD);
      var cejas = el("g", { id: id + "-cejas" }, cara);
      el("rect", { x: 106, y: 162, width: 40, height: 8, rx: 4, fill: tinta }, cejas);
      el("rect", { x: 174, y: 162, width: 40, height: 8, rx: 4, fill: tinta }, cejas);
      var boca = el("ellipse", { id: id + "-boca", cx: 160, cy: 256, rx: 22, ry: 5, fill: tinta }, cara);

      // Brazos por delante del cuerpo (se ven al saludar y apuntar)
      var brazoI = el("g", { id: id + "-brazoI" }, cuerpo);
      el("rect", { x: 22, y: 196, width: 70, height: 22, rx: 11, fill: extremidad, stroke: borde, "stroke-width": 3 }, brazoI);
      el("circle", { cx: 24, cy: 207, r: 17, fill: "#FFFFFF", stroke: extremidad, "stroke-width": 6 }, brazoI);
      var brazoD = el("g", { id: id + "-brazoD" }, cuerpo);
      el("rect", { x: 228, y: 196, width: 70, height: 22, rx: 11, fill: extremidad, stroke: borde, "stroke-width": 3 }, brazoD);
      el("circle", { cx: 296, cy: 207, r: 17, fill: "#FFFFFF", stroke: extremidad, "stroke-width": 6 }, brazoD);

      // Pivotes (en px del SVG)
      function pivote(nodo, x, y) { gsap.set(nodo, { svgOrigin: x + " " + y }); }
      pivote(brazoI, 92, 207); pivote(brazoD, 228, 207);
      pivote(piernaI, 123, 300); pivote(piernaD, 197, 300);
      pivote(ojoI, 128, 200); pivote(ojoD, 192, 200);
      pivote(cuerpo, 160, 390); pivote(torso, 160, 310); pivote(cejas, 160, 166);

      var pj = {
        id: id, raiz: raiz, partes: { cuerpo: cuerpo, torso: torso, cara: cara, boca: boca, cejas: cejas,
          brazoI: brazoI, brazoD: brazoD, piernaI: piernaI, piernaD: piernaD, ojoI: ojoI, ojoD: ojoD, sombra: sombra },

        entrar: function (tl, t) {
          tl.fromTo(raiz, { opacity: 0, y: 60, scale: 0.6 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: "back.out(1.8)" }, t);
          return pj;
        },
        salir: function (tl, t) {
          tl.to(raiz, { opacity: 0, y: 40, scale: 0.8, duration: 0.22, ease: "power2.in" }, t);
          return pj;
        },
        // Respirar: sube y baja suave entre t0 y t1 (determinista, sin repeat infinito)
        respirar: function (tl, t0, t1) {
          var n = Math.max(1, Math.round((t1 - t0) / 1.6));
          var paso = (t1 - t0) / n;
          for (var i = 0; i < n; i++) {
            tl.to(torso, { scaleY: 1.025, scaleX: 0.99, duration: paso / 2, ease: "sine.inOut" }, t0 + i * paso);
            tl.to(torso, { scaleY: 1, scaleX: 1, duration: paso / 2, ease: "sine.inOut" }, t0 + i * paso + paso / 2);
          }
          return pj;
        },
        parpadear: function (tl, tiempos) {
          (tiempos || []).forEach(function (t) {
            tl.to([ojoI, ojoD], { scaleY: 0.1, duration: 0.06, ease: "power1.in" }, t);
            tl.to([ojoI, ojoD], { scaleY: 1, duration: 0.08, ease: "power1.out" }, t + 0.08);
          });
          return pj;
        },
        // Hablar: la boca se abre según la intensidad de la voz. base = segundo de la voz en que empieza la escena.
        // Se arma con pasos de GSAP (15 por segundo) leídos de la voz al construir la escena:
        // así funciona igual al adelantar, retroceder o renderizar.
        hablar: function (tl, t0, t1, base) {
          var paso = 1 / 15;
          for (var t = t0; t < t1 - 0.001; t += paso) {
            var a = window.intensidadVoz ? window.intensidadVoz((base || 0) + t) : 0;
            if (!(window.__AMP && window.__AMP.length)) a = 0.3 + 0.4 * Math.abs(Math.sin(t * 9)); // sin datos de voz
            tl.to(boca, { attr: { ry: +(4 + 20 * Math.min(1, a)).toFixed(1) }, duration: paso, ease: "none" }, t);
          }
          tl.to(boca, { attr: { ry: 5 }, duration: 0.08, ease: "power1.out" }, t1);
          return pj;
        },
        saludar: function (tl, t) {
          // Brazo arriba y hacia afuera (más de -80 lo esconde detrás del cuerpo)
          tl.to(brazoD, { rotation: -65, duration: 0.22, ease: "power2.out" }, t);
          for (var i = 0; i < 2; i++) {
            tl.to(brazoD, { rotation: -40, duration: 0.14, ease: "sine.inOut" }, t + 0.22 + i * 0.28);
            tl.to(brazoD, { rotation: -70, duration: 0.14, ease: "sine.inOut" }, t + 0.36 + i * 0.28);
          }
          tl.to(brazoD, { rotation: 0, duration: 0.25, ease: "power2.inOut" }, t + 0.9);
          return pj;
        },
        // Apuntar a un lado y volver después de "dura" segundos
        apuntar: function (tl, t, lado, dura) {
          var brazo = lado === "izquierda" ? brazoI : brazoD, giro = lado === "izquierda" ? 20 : -20;
          tl.to(brazo, { rotation: giro, duration: 0.2, ease: "back.out(2)" }, t);
          tl.to(brazo, { rotation: 0, duration: 0.25, ease: "power2.inOut" }, t + (dura || 1.2));
          return pj;
        },
        // Expresiones: neutral, feliz, sorpresa, triste, enojo
        expresion: function (tl, t, nombre) {
          var e = {
            neutral:  { boca: { rx: 22, ry: 5 },  ceja: { y: 0, rotation: 0 },   ojo: 1 },
            feliz:    { boca: { rx: 30, ry: 12 }, ceja: { y: -6, rotation: 0 },  ojo: 0.85 },
            sorpresa: { boca: { rx: 14, ry: 16 }, ceja: { y: -16, rotation: 0 }, ojo: 1.15 },
            triste:   { boca: { rx: 18, ry: 4 },  ceja: { y: 4, rotation: 8 },   ojo: 0.9 },
            enojo:    { boca: { rx: 20, ry: 4 },  ceja: { y: 6, rotation: -10 }, ojo: 0.9 }
          }[nombre] || null;
          if (!e) return pj;
          tl.to(boca, { attr: e.boca, duration: 0.18, ease: "power2.out" }, t);
          tl.to(cejas, { y: e.ceja.y, rotation: e.ceja.rotation, duration: 0.18, ease: "power2.out" }, t);
          tl.to([ojoI, ojoD], { scale: e.ojo, duration: 0.18, ease: "power2.out" }, t);
          return pj;
        },
        // Caminar dx px entre t0 y t1, con pasos y rebote
        caminar: function (tl, t0, t1, dx) {
          var pasos = Math.max(2, Math.round((t1 - t0) / 0.32));
          var d = (t1 - t0) / pasos;
          tl.to(raiz, { x: "+=" + dx, duration: t1 - t0, ease: "none" }, t0);
          for (var i = 0; i < pasos; i++) {
            var s = i % 2 ? 1 : -1, ti = t0 + i * d;
            tl.to(piernaI, { rotation: 18 * s, duration: d, ease: "sine.inOut" }, ti);
            tl.to(piernaD, { rotation: -18 * s, duration: d, ease: "sine.inOut" }, ti);
            tl.to(cuerpo, { y: -10, duration: d / 2, ease: "sine.out" }, ti);
            tl.to(cuerpo, { y: 0, duration: d / 2, ease: "sine.in" }, ti + d / 2);
          }
          tl.to([piernaI, piernaD], { rotation: 0, duration: 0.15 }, t1);
          return pj;
        },
        // Saltito de alegría o de énfasis
        saltar: function (tl, t) {
          tl.to(cuerpo, { y: -50, scaleY: 1.05, duration: 0.18, ease: "power2.out" }, t);
          tl.to(cuerpo, { y: 0, scaleY: 1, duration: 0.2, ease: "bounce.out" }, t + 0.18);
          return pj;
        }
      };
      return pj;
    }
  };
})();
