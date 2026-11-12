---
name: Ejemplo neutro
source: estilo de ejemplo del sistema (se reemplaza por el tuyo con la skill "empezar")
colors:
  ground: "#16181D"     # fondo oscuro principal
  ground-2: "#20232A"   # tarjetas sobre el fondo oscuro
  paper: "#F7F5F0"      # fondo claro y texto sobre el oscuro
  ink: "#1C1E23"        # texto sobre fondo claro
  muted: "#6B7079"      # textos secundarios
  accent: "#2F80ED"     # acento: palabra clave, botón, subrayado (uno solo)
  accent-text: "#1F63C4" # acento para TEXTO sobre fondo claro (mejor contraste)
typography:
  display:
    family: "Outfit"
    weight: 800
  sans:
    family: "Inter"
    weight: "400-700"
  mono:
    family: "JetBrains Mono"
    weight: 600
spacing:
  frame-landscape: "1920x1080, margen lateral 160px"
  frame-vertical: "1080x1920, margen lateral 72px, zona de texto 220-1330px"
  radius: "18px"
components:
  titulo: "Outfit 800, en mayúsculas cortas, color paper sobre ground; la palabra clave en accent"
  subtitulo: "Inter 700, 58px en vertical, contorno ground de 10px; palabra clave en accent"
rules:
  sin-guion-largo: true
---

# Ejemplo neutro

Un estilo sobrio y claro para que el sistema funcione desde el primer video, antes de cargar tu marca. Fondo oscuro, texto claro y un solo color de acento azul.

Las tres tipografías vienen incluidas en HyperFrames: no hace falta ningún archivo de fuente.

## Do

- Un solo acento por pantalla.
- Frases cortas, una idea por subtítulo.
- Mucho aire alrededor del texto.

## Don't

- Degradados de colores fuertes.
- Más de dos tipografías en la misma escena.
- Guiones largos en los textos.
