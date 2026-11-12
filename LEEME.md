# Sistema de videos con IA

Haz videos para tus redes con tu marca, tu logo y tu estilo, con la ayuda de un agente de inteligencia artificial. Sin saber editar y sin saber programar.

Sirve para tres cosas:

- **Videos animados**: tú apruebas el guion, grabas tu voz y el agente arma la animación con tus colores, tus tipografías y, si quieres, un personaje que se mantiene igual en todos tus videos.
- **Videos grabados**: te grabas con el celular o grabas tu pantalla, y el agente limpia el audio, corta los silencios, pone subtítulos dinámicos con tu marca y deja el video listo para Instagram, TikTok, LinkedIn, Facebook o YouTube.
- **Videos mixtos**: tú hablando a cámara, con animaciones, datos o tu personaje que aparecen en los momentos clave.

**No es 100% automático, y está hecho así a propósito.** El agente propone y hace el trabajo repetitivo; tú apruebas el guion, una muestra corta y el borrador final. Siempre hay una persona que revisa.

## Qué necesitas

- Un computador con **Windows 10 u 11**.
- Una app de agente de inteligencia artificial, con su cuenta. Sirve cualquiera de estas tres (el instalador te pregunta cuál y la instala):

  | App | Cuenta | Notas |
  | --- | --- | --- |
  | **Claude** | Claude Pro o superior | Con la que está probado el sistema |
  | **ChatGPT** (Codex) | ChatGPT con Codex incluido | Lee las mismas instrucciones y skills |
  | **Antigravity** (Google) | Cuenta de Google | Lee las mismas instrucciones y skills |

- Unos 10 GB libres.
- Opcional: una cuenta gratis de **HyperFrames** para tener miles de músicas de fondo. Sin cuenta igual hay 5 músicas incluidas.

## Cómo empezar

No tienes que escribir ningún comando. Todo es con doble clic o conversando.

1. **Descarga** esta carpeta solo desde miguelurra.lat o desde su repositorio ([github.com/Maaaiiik89/sistema-de-videos-abierto](https://github.com/Maaaiiik89/sistema-de-videos-abierto/releases/latest)) y descomprímela donde quieras (por ejemplo, en Documentos). Si quieres asegurarte de que es la original, compara su huella SHA-256 con la publicada junto al enlace (ver `SEGURIDAD.md`).
2. Doble clic en **`Instalar.bat`**. Windows va a avisar que el archivo no está firmado (es normal en proyectos abiertos y pequeños): si lo descargaste del sitio oficial, elige "Más información" y "Ejecutar de todas formas". Si quieres ver qué hace antes, ábrelo con el Bloc de notas: corre `herramientas/instalar.ps1`.
3. El instalador te pregunta **qué app vas a usar** (Claude, ChatGPT o Antigravity). Escribe el número y Enter. Después instala todo solo; tarda entre 10 y 30 minutos la primera vez. Al final muestra un resumen: todo en **OK** significa que está listo. Si algo dice **FALTA**, cierra la ventana y abre `Instalar.bat` otra vez.
4. Abre tu app, inicia sesión y **abre esta carpeta**:

   | App | Cómo abrir la carpeta |
   | --- | --- |
   | Claude | Pestaña **Code** → elige esta carpeta |
   | ChatGPT | **Codex** → **Add new project** (o Ctrl+O) → elige esta carpeta → márcala como de confianza si lo pregunta |
   | Antigravity | Abre esta carpeta como espacio de trabajo (workspace) → confía en la carpeta si lo pregunta |

   El instalador ya dejó copiada la ruta de la carpeta: si la app te la pide, pégala con Ctrl+V.
5. Escribe: **"Hola, quiero empezar"**. El agente te hace unas preguntas sobre tu marca (nombre, colores, logo, a quién le hablas, qué videos quieres, tu música y tu personaje). Es una sola vez.

La primera vez, la app te pide permiso para usar el **editor de video** de esta carpeta (`video-editor`) y para correr algunas herramientas. Elige **Permitir**: es lo que corta, limpia y transcribe tus videos en tu computador. Si aparece un permiso que no entiendes (borrar algo fuera de esta carpeta, instalar programas, cambiar la configuración de Windows), no lo aceptes: pregúntale al agente para qué es.

Si cambias la carpeta de lugar, abre `Instalar.bat` otra vez: actualiza la ruta para las tres apps en un minuto.

6. Doble clic en **`Panel.bat`**: se abre el panel en tu navegador. Te dice el orden de los primeros pasos y se marca solo a medida que avanzas con el agente.

Desde ahí, pídele lo que necesites con tus palabras:

- "Quiero un video animado de 30 segundos presentando mi negocio."
- "Tengo este video que grabé con el celular, déjalo listo para Instagram y LinkedIn."
- "Quiero un video donde hablo a cámara y aparecen los datos animados."

### El panel

`Panel.bat` abre una página en tu navegador que funciona solo en tu computador. No está conectado a tu app: el agente y el panel usan la misma carpeta, así que lo que hace el agente aparece en el panel en unos segundos. Tiene cinco partes:

| Parte | Para qué |
| --- | --- |
| **Primeros pasos** | El orden para empezar. Cada paso se marca solo cuando queda hecho en la carpeta |
| **Manual** | Cómo pedir cada tipo de video, tu marca, el plan, los archivos, la seguridad y la guía de cada herramienta |
| **Verificar** | Revisar lo que hizo el agente: tu marca (colores con sus pruebas de contraste, las paletas que propuso, la ficha), el plan del mes en calendario y los videos con su borrador y sus entregas |
| **Subir** | Arrastrar audios, videos, fotos o logos a la bandeja, ver dónde los dejará el agente y lo que ya ordenó |
| **Mantenimiento** | Buscar una versión nueva y actualizar, reparar la instalación, encender o apagar herramientas y elegir tu app |

Todo lo demás (tu marca, los colores, el plan, ordenar archivos) se hace conversando con el agente. El panel funciona mientras su ventana negra esté abierta: para apagarlo, ciérrala.

### Los otros archivos de doble clic

| Archivo | Para qué |
| --- | --- |
| `Panel.bat` | Abrir el panel en tu navegador |
| `Grabador.bat` | Grabar tu pantalla, tu cámara o solo tu voz |
| `Actualizar.bat` | Pasar a la última versión del sistema. Tus marcas, videos y grabaciones no se tocan |
| `Conectar-musica.bat` | Conectar tu cuenta gratis de HyperFrames para tener miles de músicas (una sola vez) |
| `Empezar.bat` | Solo si elegiste Claude y prefieres una ventana de consola en vez de la app |

### Una marca o varias

Empiezas con una. Si manejas más de un negocio o haces videos para clientes, dile al agente "quiero agregar otra marca": cada una tiene su ficha, sus colores, su personaje, sus recursos, sus videos, su plan y su límite de créditos. Antes de trabajar, el agente te confirma con cuál.

### Subir archivos

Arrástralos en el panel (Subir), déjalos en `mis-videos/bandeja/` o arrástralos a la conversación, y dile al agente "ordena la bandeja". Los guarda en la carpeta que corresponde, con fecha en el nombre, y anota qué movió. Nunca borra nada.

### Herramientas que se encienden y apagan

Cada herramienta (editor, animación, personaje, plan, música del catálogo, voz con IA, ilustración…) es un módulo. Algunas vienen apagadas porque usan internet, cuestan créditos o son de terceros. Enciéndelas en el panel (Mantenimiento), que te muestra qué implica cada una antes de activarla, o pídeselo al agente: "enciende la música del catálogo". Cada una tiene su guía paso a paso en el Manual del panel.

## Cómo trabaja (el orden que funciona)

1. **Idea**: para qué es el video, en qué red va y si es animado, grabado o mixto.
2. **Guion y guion visual**: el agente te propone 3 ideas, eliges una y te escribe el guion con lo que se ve en cada frase. Lo prueba en voz alta para que no se pase del tiempo. **Tú lo apruebas.**
3. **Voz o grabación**: grabas el guion. El agente limpia el audio y elige tus mejores tomas.
4. **Muestra**: antes de hacer todo el video, te muestra 5 a 10 segundos con el estilo final. **Tú la apruebas.**
5. **Animación o edición**: todo se arma sobre tu voz; cada cosa aparece justo cuando la dices.
6. **Borrador**: te entrega un MP4 que abres con doble clic. Le dices qué cambiar con minuto y segundo.
7. **Entrega**: el video listo para cada red, en vertical y en horizontal si va a YouTube.

Lo aprendimos haciendo. La primera vez se animó antes de tener el guion y hubo que rehacer casi todo. Otra vez se animó el video completo sin mostrar una muestra, faltaba impacto y se rehízo entero. Por eso: guion primero, después la voz, una muestra, y recién ahí todo el video.

## Qué hay en la carpeta

| Carpeta | Qué hay |
| --- | --- |
| **`mis-videos/`** | **Todo lo tuyo**: la bandeja, tus marcas (ficha, estilo, personaje, recursos, temáticas, grabaciones, videos y plan) y tus recursos. Actualizar nunca la toca. Para respaldar tu trabajo, copia esta carpeta |
| `modulos/` | Las herramientas, cada una con su guía (`PASO-A-PASO.md`) |
| `panel/` | El panel que abre `Panel.bat` |
| `estilos/` | El estilo de ejemplo y un catálogo de looks para variar |
| `recursos/` | 5 músicas y 11 sonidos con licencia libre, incluidos con el sistema |
| `herramientas/`, `plantillas/`, `mcp-video/`, `grabador/` | Lo que usa el agente. No necesitas abrirlas |

Detalle de `mis-videos/`: `mis-videos/LEEME.md`.

## Seguridad y privacidad

Lo importante en pocas líneas (el detalle completo está en **`SEGURIDAD.md`**):

- **Tus videos, tu voz y tus grabaciones se procesan en tu computador.**
- **La app de IA sí ve lo que el agente lee** (tu ficha, tus guiones, las transcripciones, cuadros de los videos). No le pases datos de clientes, contraseñas ni claves.
- **Nada que cueste dinero se hace sin tu sí**, y cada video tiene un límite de créditos que por defecto es 0.
- **Cuentas:** usa cuentas tuyas o de tu negocio, con verificación en dos pasos. Si tu cuenta cobra por uso, ponle un tope mensual y apaga la recarga automática. Si el computador es compartido, cierra sesión al terminar.
- **Antes de grabar tu pantalla**, cierra el correo, los chats y todo lo que no quieras que salga.
- **Personas en tus videos:** pídeles permiso antes de publicar.

## Costos

- El sistema es gratis y abierto (licencia MIT).
- La app de agente usa tu cuenta: Claude (plan Pro o superior), ChatGPT (con Codex) o Antigravity (cuenta de Google). Cada una tiene sus propios límites de uso.
- HyperFrames es gratis para hacer y renderizar videos en tu computador. Su catálogo de música es gratis con tu cuenta; las voces o músicas generadas por IA cuestan créditos, y el agente siempre te avisa el precio antes.

## Créditos

- [HyperFrames](https://hyperframes.studio) para construir y renderizar los videos.
- Agentes: [Claude](https://claude.com/download), [ChatGPT / Codex](https://chatgpt.com/codex) o [Antigravity](https://antigravity.google).
- [FFmpeg](https://ffmpeg.org) y [Whisper](https://github.com/openai/whisper) para editar y transcribir.
- Música: ver `recursos/musica/LEEME.md` (dominio público, CC0). Sonidos: ver `recursos/sonidos/CREDITOS.md`.
- Ideas de looks: [Bang Motion](https://github.com/bangtutorial/bang-motion) (MIT). Ilustración con código: [Claude Drawing](https://github.com/cloveric/claude-drawing-skill) (MIT).

Creado por Miguel Urra ([miguelurra.lat](https://miguelurra.lat)). El paso a paso de cómo se hizo está en el blog.
