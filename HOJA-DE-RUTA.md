# Hoja de ruta

Versión 0.4 (noviembre de 2026). Proyecto abierto: la idea es irlo mejorando con lo que aprendamos haciendo videos. Qué trae cada versión: `CHANGELOG.md`.

## Lo que ya hace

- **Panel local** (`Panel.bat`): primeros pasos que se marcan solos, manual con la guía de cada herramienta, verificar lo que hizo el agente (marca, plan en calendario, videos), subir a la bandeja y mantenimiento (actualizar, reparar, encender y apagar herramientas). Lee la misma carpeta; no está conectado al agente.
- Instalación de doble clic en Windows (`Instalar.bat`): pregunta con qué app vas a trabajar (Claude, ChatGPT/Codex o Antigravity), la instala y al final muestra un resumen pieza por pieza (OK / FALTA).
- Se usa desde la app de escritorio, sin escribir comandos. La carpeta queda lista para las tres apps: mismas instrucciones (`AGENTS.md`), mismas skills y el editor de video configurado para cada una.
- **Tu trabajo separado del sistema** en `mis-videos/`, y `Actualizar.bat` que reemplaza el sistema con huella SHA-256 comprobada y respaldo, sin tocar tu trabajo.
- **Varias marcas** (o clientes), cada una con su ficha, estilo, personaje, recursos, temáticas, grabaciones, videos, plan y límite de créditos.
- **Bandeja única** que el agente ordena, con registro de movimientos, y **recursos por niveles** (video, temática, marca, tuyos, sistema).
- **Herramientas como módulos** que se encienden y apagan, cada una con su guía para personas y sus skills.
- Onboarding de marca (skill `empezar`) y **paletas con contraste probado** (skill `colores`).
- Personaje armado una sola vez, con prueba de 5 segundos aprobada.
- Tres flujos de video: animado, grabado y mixto, con guion visual, muestra antes de animar y borrador MP4.
- **Planificación mensual** (skill `planificar`): objetivo, pilares, ritmo, fechas importantes, etapas de cada video y lo que funcionó.
- Voz: limpiar, elegir la mejor toma, tiempos por palabra; transcribe audio suelto con las palabras de la marca como pista.
- Subtítulos dinámicos con el color de la marca y contraste automático.
- Vertical y horizontal desde el mismo proyecto.
- Grabador de pantalla, cámara y solo audio, con marcas.
- 5 músicas libres, catálogo de HyperFrames con `Conectar-musica.bat`, 11 sonidos.
- Seguridad y privacidad documentadas (`SEGURIDAD.md`), versiones fijas, límite de créditos, reglas para el agente.
- **Pedidos de video**: conversando o con un formulario en el panel (con referencias y archivos de hasta 16 GB); el agente revisa siempre el pedido y no empieza sin tu confirmación.
- **Primeros pasos guiados** con una acción en cada paso, **paleta desde un color** con contraste probado, **ficha de marca** con contexto opcional, **manual por app**, **almacenamiento** con Papelera y **recorrido** del panel.
- **Referencias de video** (módulo): baja videos públicos sin usar tus cuentas, o analiza los que subas, y deja su ritmo, sus cortes y 12 cuadros en una imagen para que el agente los estudie.
- **Publicado en GitHub** con versiones automáticas (zip + huella SHA-256); `Actualizar.bat` y el panel las encuentran solos.

## Lo que falta

- **Capturas en la guía de inicio**, sacadas de la grabación del tutorial.
- **Motor de escenas 3D** como módulo reutilizable.
- **Plantilla 4:5** para el feed de LinkedIn y Facebook.
- **Subtítulos que esquivan caras en videos grabados.**
- **Probarlo de verdad en ChatGPT (Codex) y en Antigravity**, con un video completo en cada una.
- **Módulos nuevos:** carruseles para el feed, miniaturas de YouTube, programar publicaciones.
- **Mac.** Hoy el instalador y el grabador son solo para Windows.
- **Firmar los instaladores** para que Windows no muestre el aviso de archivo no firmado.

## Cómo proponer mejoras

Si lo usas y algo no funciona o se te ocurre una mejora, cuéntalo en el blog (miguelurra.lat) o en el repositorio (github.com/Maaaiiik89/sistema-de-videos-abierto). Para una herramienta nueva, la skill `crear-modulo` tiene la lista de calidad.
