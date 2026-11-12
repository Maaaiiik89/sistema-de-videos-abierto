// ---------- Manual: paso a paso, escrito para la app con la que se trabaja ----------
var MANUAL = [
  { g: "Empezar", id: "como", t: "Cómo funciona", lead: "Conversas con el agente en tu app. El agente trabaja en una carpeta de tu computador. Este panel lee esa carpeta para que revises todo ordenado.",
    cuerpo: function () {
      return '<div class="flujo"><div><b>1</b><strong>Pides</strong><span>Conversando en ' + esc(appNombre()) + ' o con un pedido aquí</span></div><div><b>2</b><strong>El agente trabaja</strong><span>Guarda todo en la carpeta mis-videos</span></div><div><b>3</b><strong>Revisas</strong><span>Aquí ves la marca, el plan y cada video</span></div><div><b>4</b><strong>Apruebas</strong><span>Guion, muestra y borrador, siempre tú</span></div></div>' +
        "<p>El panel <strong>no</strong> le manda mensajes al agente: los dos usan la misma carpeta. Lo que subes y los pedidos que envías quedan ahí, y el agente los encuentra apenas le hablas. Lo que el agente cambia aparece aquí en unos segundos.</p>" +
        '<p class="muted chico">El panel funciona solo en tu computador, mientras su ventana negra esté abierta. Para apagarlo, cierra esa ventana.</p>';
    },
    lado: function () { return cajaApp(pasosMan(appInfo().abrir.map(esc))) + decile("Hola, quiero empezar."); } },
  { g: "Empezar", id: "tuapp", t: "Tu app de agente", lead: "El sistema funciona con Claude, ChatGPT (Codex) o Antigravity. Las tres leen las mismas instrucciones; cambia cómo se abre la carpeta y cómo se dan los permisos.",
    cuerpo: function () {
      var a = appInfo();
      return "<h3>Abrir la carpeta</h3>" + pasosMan(a.abrir.map(esc)) + '<div class="botones-fila"><span class="mono" style="overflow-wrap:anywhere">' + esc(E.sistema.raiz) + '</span><button class="btn btn-chico" type="button" data-copiar-ruta="1">Copiar la ruta</button></div>' +
        "<h3>Permisos</h3><p>" + esc(a.permiso) + "</p><h3>Cuando enciendes una herramienta</h3><p>" + esc(a.nueva) + "</p>" +
        '<h3>Archivos</h3><p>Lo que adjuntas en el chat queda en la conversación, no en la carpeta: el agente no lo puede usar en un video. El logo, las fotos y las grabaciones súbelos en un <a class="enlace" href="#pedidos">pedido</a> o en <a class="enlace" href="#subir">Subir</a>.</p>';
    },
    lado: function () { return '<div class="caja-app"><span class="eyebrow" style="color:var(--accent)">¿Usas otra app?</span><span class="chico">Cámbiala arriba: el manual se reescribe para esa. La carpeta funciona con las tres; si cambias de app, abre Instalar.bat para configurarla.</span></div>'; } },
  { g: "Empezar", id: "pedir", t: "Cómo pedirle cosas al agente", lead: "Háblale como a una persona del equipo: qué quieres, para qué red y para cuándo.",
    cuerpo: function () { return pasosMan(["Di qué quieres y para qué: «un video de 30 s para Instagram que invite a escribir por WhatsApp».", "Para cambios en un video, di el minuto y el segundo: «en el 0:12 el texto tapa la cara».", "Si algo no te convence, dilo: el agente propone y tú decides.", "No le pases contraseñas ni datos de tus clientes."]); },
    lado: function () { return decile("Quiero un video de 30 segundos para Instagram sobre mi producto estrella. Que termine invitando a escribir por WhatsApp."); } },
  { g: "Videos", id: "pedir-video", t: "Pedir un video", lead: "Un video se pide conversando o con el formulario de Pedidos. Las dos formas terminan en el mismo pedido, y el agente siempre lo revisa antes de empezar.",
    cuerpo: function () {
      return '<div class="puertas"><div class="puerta"><span class="eyebrow">Conversando</span><strong>En ' + esc(appNombre()) + '</strong><span class="muted chico">Le cuentas qué video quieres y el agente escribe el pedido mientras conversan.</span></div><div class="puerta"><span class="eyebrow">Con el formulario</span><strong>En Pedidos</strong><span class="muted chico">Llenas todo de una vez y subes los archivos ahí mismo.</span></div></div>' +
        "<h3>El formulario conviene cuando</h3><ul><li>Tienes <strong>videos pesados</strong>: aquí suben hasta 16 GB; en el chat no.</li><li>El logo, las fotos o las grabaciones <strong>van en el video</strong>: lo adjunto en el chat no llega a la carpeta.</li><li>Quieres <strong>gastar menos</strong>: el agente lee de la carpeta solo lo que necesita.</li></ul>" +
        "<h3>Después de enviarlo</h3>" + pasosMan(["Abre " + esc(appNombre()) + " y escribe cualquier cosa, por ejemplo «hola».", "El agente revisa el pedido: que no falte nada, que tenga sentido y que los archivos sirvan.", "Te pregunta lo que falte (también lo ves en el pedido) y te muestra el resumen.", "Cuando confirmas, empieza: guion, voz, muestra, borrador."]);
    },
    lado: function () { return irPanel("Abrir Pedidos", "pedidos") + decile("Hola. (El agente ve tu pedido y parte por ahí.)"); } },
  { g: "Videos", id: "animado", t: "Video animado", lead: "Tú pones la voz; el agente arma la animación con tu marca, sobre tu voz.",
    cuerpo: function () { return pasosMan(["Pide el video y elige una de las 3 ideas que te propone.", "Aprueba el guion visual: qué se dice y qué se ve en cada frase.", "Graba tu voz con <code>Grabador.bat</code> (solo audio) o con el celular, y súbela en el pedido.", "Aprueba la muestra de 5 a 8 segundos con el estilo final.", "Mira el borrador (un MP4 que abres desde Verificar → Videos) y pide los cambios.", "Recibe la entrega en vertical y, si va a YouTube, en horizontal."]); },
    lado: function () { return decile("Quiero un video animado de 30 segundos presentando mi negocio. Propón 3 ideas."); } },
  { g: "Videos", id: "grabado", t: "Video grabado", lead: "Te grabas tú; el agente limpia el audio, corta los silencios, pone subtítulos y lo deja listo para cada red.",
    cuerpo: function () { return pasosMan(["Grábate con el celular o graba tu pantalla con <code>Grabador.bat</code>.", "Súbelo en el pedido del video (o en Subir).", "El agente te cuenta qué propone cortar y espera tu sí.", "Aprueba una muestra de 10 segundos con subtítulos y encuadre.", "Mira el borrador y recibe una versión por red."]); },
    lado: function () { return decile("Subí un video que grabé con el celular. Déjalo listo para Instagram y LinkedIn."); } },
  { g: "Videos", id: "mixto", t: "Video mixto", lead: "Tú a cámara, con animaciones, datos o tu personaje en los momentos clave.",
    cuerpo: function () { return pasosMan(["Pide el video y aprueba el guion, que marca qué partes son cámara y cuáles animación.", "Grábate a cámara diciendo el guion.", "Aprueba la muestra: un corte de cámara y una animación.", "Mira el borrador y pide los cambios."]); },
    lado: function () { return decile("Quiero un video donde hablo a cámara y aparecen los datos animados."); } },
  { g: "Videos", id: "referencias", t: "Videos de referencia", lead: "Si te gusta cómo está hecho un video de otra cuenta, el agente estudia su ritmo y su estructura. Nunca usa su contenido, su música ni su marca.",
    cuerpo: function () { return pasosMan(["Activa «Referencias de video» en Mantenimiento.", "Pega el link en el pedido o en el chat y cuenta qué te gusta de ese video.", "El agente lo baja sin usar tus cuentas y te dice qué va a tomar, en números.", "Lo apruebas, y lo usa en tu guion."]) + '<div class="ojo">Instagram y YouTube a veces no dejan bajar videos sin iniciar sesión. Para esos, guárdalo desde la app de la red o grábalo de la pantalla, y súbelo en el pedido.</div>'; },
    lado: function () { return irPanel("Ver tus referencias", "verificar") + decile("Quiero el ritmo de este video: <link>. Me gusta cómo entran los precios."); } },
  { g: "Tu marca", id: "marca", t: "Cargar o cambiar tu marca", lead: "Lo básico se crea en Primeros pasos o conversando; el resto lo completa el agente contigo. Tú la revisas en Verificar → Marca.",
    cuerpo: function () { return pasosMan(["Dile al agente tu web o tus redes: saca de ahí colores, letras y logo.", "Sube tu logo (mejor SVG o PNG sin fondo) en Primeros pasos o en un pedido.", "Responde lo esencial: a qué te dedicas, a quién le hablas y cómo hablas.", "Si quieres, suma contexto: slogan, productos, horario, lo que te hace distinto. No es obligatorio, pero mejora los guiones."]) + "<p>Los videos ya hechos no cambian; los nuevos sí.</p>"; },
    lado: function () { return irPanel("Ver tu marca", "verificar") + decile("Mi slogan es «…» y atendemos de lunes a sábado."); } },
  { g: "Tu marca", id: "colores", t: "Colores y contraste", lead: "Eliges tu color principal y el panel te recomienda colores que combinan. Todas las paletas pasan cuatro pruebas de contraste, para que todo se lea bien en el teléfono.",
    cuerpo: function () { return "<ul><li>Texto sobre el fondo: 4,5 a 1 como mínimo.</li><li>Los dos acentos sobre el fondo: 3 a 1.</li><li>La palabra marcada de los subtítulos: 3 a 1.</li></ul>" + pasosMan(["En Verificar → Marca → Visual, toca «Armar una paleta desde un color».", "Elige tu color (o uno de tu logo) y una de las 4 recomendaciones.", "Ajusta cada color si quieres: si algo no pasa, «Arreglar el contraste» lo corrige.", "«Usar esta paleta» la guarda en tu marca."]); },
    lado: function () { return decile("Proponme 3 paletas más cálidas a partir de mi logo."); } },
  { g: "Tu marca", id: "varias", t: "Varias marcas o clientes", lead: "Cada marca tiene su ficha, sus colores, su personaje, sus recursos, sus videos y su límite de créditos.",
    cuerpo: function () { return pasosMan(["Para agregar una marca: «Crear otra marca» en Primeros pasos, «Una marca nueva» en un pedido, o díselo al agente.", "El agente trabaja con la marca <strong>activa</strong>. Para cambiarla, díselo.", "El selector de arriba solo cambia qué marca revisas aquí."]); },
    lado: function () { return decile("Quiero agregar otra marca: un cliente nuevo."); } },
  { g: "Organizar", id: "plan", t: "Planificar el contenido", lead: "El agente arma el mes con tu objetivo, tus temas fijos, las fechas importantes y lo que mejor te ha funcionado.",
    cuerpo: function () { return pasosMan(["Pídele el plan del mes y revísalo en Verificar → Plan.", "Cada idea del plan se puede pedir como video desde el formulario de Pedidos.", "Cuéntale las vistas de lo que publicas: las anota y propone más de lo que rinde."]); },
    lado: function () { return irPanel("Ver el plan", "verificar") + decile("Arma el plan del mes que viene: 3 videos por semana, con las fechas importantes."); } },
  { g: "Organizar", id: "archivos", t: "Subir y ordenar archivos", lead: "Lo de un video va en su pedido. Lo demás (fotos del negocio, música, un kit de marca) entra por Subir.",
    cuerpo: function () { return pasosMan(["Arrastra los archivos en Subir: quedan en la bandeja.", "La próxima vez que le hables, el agente los ordena en su carpeta y les pone fecha.", "El agente nunca borra nada y anota cada movimiento."]) + "<p>Cuando necesita algo, lo busca en este orden: del video, de la temática, de la marca, los tuyos generales y, por último, los que trae el sistema.</p>"; },
    lado: function () { return irPanel("Abrir Subir", "subir") + decile("Ordena lo que dejé en la bandeja."); } },
  { g: "Organizar", id: "espacio", t: "Liberar espacio", lead: "Las grabaciones y los borradores ocupan mucho. En Mantenimiento → Almacenamiento ves qué pesa y liberas lo que ya no usas.",
    cuerpo: function () { return pasosMan(["Revisa las sugerencias: empiezan por lo más seguro (borradores de videos entregados).", "Marca lo que quieres liberar y mira cuánto espacio recuperas.", "Se manda a la Papelera de reciclaje de Windows: si te arrepientes, lo recuperas desde ahí."]) + '<div class="ojo">Nada se borra solo. El video final y el pedido se conservan. Para las grabaciones originales te pide confirmar dos veces.</div>'; },
    lado: function () { return irPanel("Ver el almacenamiento", "mantenimiento") + decile("¿Qué puedo liberar para tener más espacio?"); } },
  { g: "Cuidarte", id: "seguridad", t: "Seguridad, cuentas y gastos", lead: "Tus videos y tu voz se procesan en tu computador. La app de IA sí ve lo que el agente lee.",
    cuerpo: function () { return '<ul><li>No le pases datos de clientes ni contraseñas al agente.</li><li>Nada que cueste dinero se hace sin tu sí, y cada marca tiene un límite de créditos por video (0 por defecto: nada pagado).</li><li>Usa cuentas tuyas, con verificación en dos pasos y un tope de gasto si cobran por uso.</li><li>Antes de aceptar un permiso, léelo: sí a las herramientas de esta carpeta, no a cosas que no entiendas.</li><li>Las herramientas que usan internet, cuestan créditos o son de terceros lo dicen antes de activarlas.</li></ul><div class="botones-fila"><button class="btn btn-chico" type="button" data-abrir="SEGURIDAD.md">Leer SEGURIDAD.md completo</button></div>'; },
    lado: function () { return cajaApp('<span class="chico">' + esc(appInfo().permiso) + "</span>"); } },
  { g: "Cuidarte", id: "falla", t: "Si algo falla", lead: "Lo más común se arregla en un minuto.",
    cuerpo: function () { var a = appInfo(); return "<ul><li><strong>El agente no ve el editor de video:</strong> " + esc(a.falla) + "</li><li><strong>Moviste la carpeta o algo dice FALTA:</strong> Mantenimiento → Reparar instalación.</li><li><strong>El agente no ve una herramienta que encendiste:</strong> " + esc(a.nueva) + "</li><li><strong>La vista previa no suena:</strong> pide el borrador en MP4 y ábrelo desde Verificar → Videos.</li><li><strong>El panel dice que se apagó:</strong> abre Panel.bat de nuevo.</li></ul>"; },
    lado: function () { return decile("Algo no funciona: te cuento qué pasó y en qué paso."); } }
];
function temasManual() {
  var t = MANUAL.slice();
  E.modulos.forEach(function (m) { if (m.guia) t.push({ g: "Herramientas", id: "mod:" + m.id, t: m.nombre + (m.activo ? "" : " (apagada)"), mod: m }); });
  return t;
}
vistas.manual = function () {
  var temas = temasManual(), grupos = [], item = temas.filter(function (m) { return m.id === ui.tema; })[0] || temas[0];
  temas.forEach(function (m) { if (grupos.indexOf(m.g) < 0) grupos.push(m.g); });
  var html = '<div class="cabeza-fila"><div class="cabeza"><span class="eyebrow">Manual</span><h1>Cómo se usa</h1><p class="muted">Paso a paso, escrito para la app con la que trabajas.</p></div>' +
    '<div class="selector-app"><span class="eyebrow">Tu app</span>' + selectorApp() + "</div></div>";
  var art;
  if (item.mod) art = '<article class="tarjeta art"><div class="art-main"><span class="eyebrow">Herramientas</span><h2>' + esc(item.mod.nombre) + "</h2>" + (item.mod.activo ? "" : '<div class="ojo">Esta herramienta está apagada: el agente no la conoce. Actívala en <a class="enlace" href="#mantenimiento">Mantenimiento</a>.</div>') + md(item.mod.guia) + '</div><aside class="art-lado">' + irPanel("Herramientas en Mantenimiento", "mantenimiento") + "</aside></article>";
  else art = '<article class="tarjeta art"><div class="art-main"><span class="eyebrow">' + esc(item.g) + "</span><h2>" + esc(item.t) + '</h2><p class="lead">' + item.lead + "</p>" + item.cuerpo() + '</div><aside class="art-lado">' + item.lado() + "</aside></article>";
  html += '<div class="manual"><nav class="indice" aria-label="Temas del manual">' + grupos.map(function (g) {
    return '<span class="grupo">' + esc(g) + "</span>" + temas.filter(function (m) { return m.g === g; }).map(function (m) { return '<button type="button" data-tema="' + esc(m.id) + '" aria-current="' + (m.id === item.id) + '">' + esc(m.t) + "</button>"; }).join("");
  }).join("") + "</nav>" + art + "</div>";
  return html;
};
