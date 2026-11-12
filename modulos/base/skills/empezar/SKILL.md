---
name: empezar
description: Onboarding del sistema de videos y alta de marcas. Crea la marca en mis-videos/marcas/<id>/ y carga su ficha (negocio, público, tono, colores, fuentes, logo, tipo de videos, redes, objetivo, pilares, música, cuentas y límite de créditos) y su estilo. Usar la primera vez que alguien abre esta carpeta, cuando no hay ninguna marca o la ficha dice "sin completar", cuando la persona quiere agregar otra marca o un cliente, o cuando quiere cambiar algo de su marca.
---

# Empezar: cargar una marca

Objetivo: que el agente tenga todo lo necesario para hacer videos con la marca sin preguntar lo mismo cada vez. La persona puede no saber nada técnico: preguntas simples, con ejemplos y una opción por defecto. **Nunca le pidas que escriba un comando**: los corres tú. Se configura conversando; el panel deja hacer algunas partes sin conversar (crear la marca con lo básico, elegir la paleta, subir el logo) y tú completas el resto.

## Dónde queda todo

- Cada marca es una carpeta: `mis-videos/marcas/<id>/` (ver `mis-videos/LEEME.md`).
- `node herramientas/marcas.mjs nueva "<nombre>"` la crea con su ficha (`ficha.md`), su estilo (`estilo/`, copia del ejemplo neutro) y sus carpetas, y la deja activa.
- `node herramientas/marcas.mjs lista` y `activar <id>` para ver y cambiar la marca con la que se trabaja. `info` muestra el estado.
- Lo que la persona sube (logo, fotos, fuentes) llega a `mis-videos/bandeja/`: ordénalo con la skill `organizar`.

## Si la marca ya se creó en el panel

La persona puede crear la marca en el panel (Primeros pasos o un pedido) con lo básico: nombre, a qué se dedica, a quién le habla, web y tú o usted. Queda activa, con la ficha "sin completar". En ese caso **no vuelvas a preguntar lo que ya está**: lee la ficha, salúdala por el nombre de la marca y sigue con lo que falta. Si ya subió el logo o eligió la paleta en el panel (fila "Colores" de la ficha), úsalos.

## Cómo conversar

- Saluda en una frase y explica: "Son unas preguntas de una sola vez (unos 10 a 15 minutos). Con esto todos tus videos salen con tu marca. Puedes responder 'no sé' y elijo algo razonable que después cambiamos".
- **Máximo 3 preguntas por mensaje.** Cada una con un ejemplo o con opciones.
- Si la persona da una web o una red social, saca de ahí todo lo posible antes de preguntar ("Sacar la marca de una web").
- La primera vez que uses el editor de video, la app pide aprobar el servidor `video-editor`. Avísale: "te va a aparecer un aviso para permitir el editor de video: elige Permitir. Para cualquier otro permiso que no entiendas, pregúntame antes de aceptar".
- No escribas nada definitivo hasta el resumen final y su sí.

## Antes de las preguntas: privacidad en 4 frases

Dilo así, una sola vez:

> "Antes de empezar, cuatro cosas de privacidad. Tus videos y tu voz se procesan en tu computador. Lo que yo leo (tu ficha, tus guiones, las transcripciones) pasa por la app que estás usando, así que no me pases datos de clientes ni contraseñas. Nada que cueste dinero se hace sin que me digas que sí. Y si quieres el detalle, está en `SEGURIDAD.md`."

## Las preguntas (en este orden)

### 1. El negocio
- ¿Cómo se llama tu negocio o tu marca? (con eso creas la carpeta: `marcas.mjs nueva`)
- ¿A qué te dedicas, en una frase? (ej.: "vendo café de especialidad en Valparaíso")
- ¿A quién le hablas? (ej.: "dueños de pymes", "mamás que trabajan", "estudiantes")
- ¿Tienes web o redes? Pásame el enlace (opcional).
- **Palabras propias de la marca:** nombre, productos, servicios, personas, siglas. "¿Hay nombres o palabras poco comunes que digas seguido? Así la transcripción no las escribe mal". Van en la fila "Palabras de la marca" de la ficha: el editor se las pasa a Whisper.

### 2. Cómo se ve
- Logo: "súbelo en el panel (Subir) o arrástralo aquí" (mejor SVG o PNG con fondo transparente). Va a `estilo/assets/logo/` de la marca.
- Colores: de la web, del logo o desde cero. **Usa la skill `colores`**: propón 3 paletas que pasen las pruebas de contraste y que la persona elija. También puede armarla ella en el panel (Primeros pasos → Elegir tus colores, o Verificar → Marca → Visual): elige un color y el panel recomienda combinaciones con el contraste probado.
- Tipografías: de la web, o elige una sensación: moderna (Outfit + Inter), elegante (Playfair Display + Lato), técnica (Space Mono + Inter), cercana (Nunito + Nunito), fuerte (Oswald + Roboto).
- Estilo de animación: 3 o 4 looks de `estilos/LOOKS.md`, en una frase cada uno, y que elija.

**La fuente tiene que quedar dentro de la marca.** Solo Outfit, Inter y JetBrains Mono vienen con HyperFrames. Cualquier otra la descargas tú (de la web de la marca con `capture`, o de `github.com/google/fonts`), los pesos que se usan, a `estilo/assets/fuentes/`, con su `@font-face` en `estilo/assets/estilo.css` (ruta relativa: `url("fuentes/space-grotesk-700.woff2")`). Verifica con un `snapshot` que sale con esa fuente.

### 3. Qué videos quiere hacer
- ¿Qué tipo? Tutoriales, consejos rápidos, detrás de escena, productos, testimonios, noticias del rubro.
- ¿**Animados**, **grabados** (en cámara o pantalla) o **mixtos**? Cada uno tiene su orden (ver `AGENTS.md`).
- ¿Para qué redes? (formatos: `estilos/ejemplo-neutro/reglas/formatos.md`)
- ¿Cuánto deberían durar? (por defecto: 30 a 60 s para redes, 3 a 8 min para YouTube)
- ¿Qué quiere lograr? Que lo conozcan, confianza, vender, enseñar.
- ¿Qué quiere que haga la gente al final? (seguirle, escribir por WhatsApp, visitar la web...)
- Si el módulo Planificación está encendido: pilares (3 a 5 temas fijos con su porcentaje), ritmo (videos por semana) y fechas importantes del rubro. Si no sabe, propón tú y que apruebe.

### 4. Cómo habla
- ¿Tú o usted? ¿Cercano, profesional, divertido?
- Palabras o frases que usa mucho, y otras que nunca diría.
- ¿Va a grabar su voz? (recomendado). Si no: voz con IA (módulo Voz con IA, cuesta créditos) o solo texto y música.
- ¿Sale en cámara?

### Contexto (opcional, sin presionar)
No es obligatorio, pero mejora los guiones. Pregúntalo en un solo mensaje y anota lo que responda en la sección "Contexto (opcional)" de la ficha (si la ficha es antigua y no la tiene, agrégala):
- Slogan o frase de la marca; qué la hace distinta; productos o servicios principales.
- Dónde está o a qué zona atiende; horario.
- Temas que no toca; cuentas o marcas que admira; estilo de fotos e imágenes.

### 5. Música
- ¿Qué música va con la marca? Alegre, corporativa, tranquila, enérgica o emotiva. Hay 5 libres en `recursos/musica/`: anota en la ficha cuál es la de la marca.
- Para miles más, el módulo Música del catálogo (ver su skill `musica`). Si no quiere cuenta, no pasa nada.

### 6. Personaje (opcional)
- ¿Quiere un personaje o mascota que aparezca siempre? Si sí y el módulo Personaje está encendido, sigue la skill `armar-personaje` **después** del resumen.

### 7. Cuentas y gastos
- "¿Las cuentas que usas (esta app y HyperFrames, si la conectas) son tuyas o de tu negocio?" Si son de otra persona o de un cliente, recuérdale que necesita su permiso.
- **Límite de créditos por video:** "Las voces o músicas creadas con IA cuestan créditos. ¿Dejamos el límite en 0 (nada pagado, recomendado para empezar) o quieres permitir algunos?". Cada video nuevo lo copia y lo respeta solo.
- Si su cuenta de IA cobra por uso: que le ponga un tope mensual, apague la recarga automática y active la verificación en dos pasos.

## Sacar la marca de una web

```bash
npx.cmd hyperframes@0.9.30 capture <url> -o mis-videos/marcas/<id>/referencias/web --skip-vision --json
```

Saca colores, fuentes (woff2) y logos. Muéstrale lo que encontraste ("tu web usa azul #1F4E8C y la fuente Montserrat, ¿uso eso?") antes de usarlo.

## Resumen y validación

Muestra un resumen en una tabla corta (negocio, público, palabras de la marca, colores con sus pruebas, tipografías, looks, tipo de videos, redes, duración, objetivo, llamado a la acción, pilares y ritmo, tono, voz, música, personaje, cuentas y límite de créditos) y pregunta: "¿Está bien así o cambio algo?". Solo con un sí:

1. Completa `ficha.md` de la marca (cambia "Estado: sin completar" por "Estado: completa" y la fecha).
2. En `estilo/` de la marca:
   - `assets/estilo.css`: la paleta con `node herramientas/paleta.mjs aplicar --fondo … --fondo2 … --texto … --acento … --acento2 …`, las fuentes (`--font-display`, `--font-sans`) y sus `@font-face`.
   - `DESIGN.md`: nombre, colores, tipografías. Deja `rules: sin-guion-largo: true` salvo que la persona prefiera otra cosa.
   - `assets/logo/`: el logo (borra el de ejemplo).
   - `reglas/voz.md`: su tono, sus palabras y las que evita.
   - `ESTILO.md`: el nombre de la marca y sus reglas.
3. Confirma con un mensaje corto qué quedó y dónde, y que puede revisarlo en el panel (Verificar → Marca).

## Después

- Si quiere personaje: skill `armar-personaje`.
- Ofrece el primer video. Pregunta: **¿animado, grabado o mixto?** y sigue el orden de ese tipo (`AGENTS.md`). Sugiere algo corto (30 s): "¿Hacemos un video de presentación de tu negocio?".

## Otra marca o un cliente

"Quiero agregar otra marca" → `marcas.mjs nueva "<nombre>"` y el mismo onboarding. Antes de trabajar, confirma siempre con qué marca: "¿Seguimos con <marca activa>?". Para cambiar: `marcas.mjs activar <id>`.

## Cambiar la marca después

Edita solo lo que pidió en `ficha.md` y en `estilo/` de la marca, y avisa que los videos ya hechos no cambian; los nuevos sí. Si son colores, pásalos por la skill `colores`.

## Temáticas

Una temática (Navidad, un lanzamiento, una serie) hereda todo de la marca y cambia solo lo necesario: `node herramientas/marcas.mjs tematica "<nombre>"`. Completa su `tematica.md`, pon en su `estilo.css` solo los colores que cambian (verificados con `colores`) y sus recursos en su `recursos/`. Se usa con `nuevo-video.mjs … --tematica <id>`.
