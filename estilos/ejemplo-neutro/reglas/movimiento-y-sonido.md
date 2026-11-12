# Movimiento y sonido

## Movimiento

- Entradas: 0,3 a 0,4 s con `power3.out` o `back.out(1.6)` para cosas que "saltan" (tarjetas, iconos).
- Salidas: más rápidas que las entradas, 0,15 a 0,25 s.
- Nada quieto más de 2 a 3 segundos: si la voz sigue y la imagen no cambia, algo tiene que pasar (un icono, un acercamiento, un gesto).
- Cada acción cae en la palabra que la nombra (tiempos de la voz con `tiempoPalabra`).
- Cámara: empujes lentos durante una frase y cortes en los cambios de idea.

## Sonido

- Voz al centro, limpia y a -16 LUFS antes de mezclar (`limpiar_voz` del editor).
- Música de fondo baja (bed a unos -29 LUFS) que baja sola cuando hay voz. Entra suave y sale con el logo.
- Efectos suaves de `recursos/sonidos/`, solo en acciones visibles: aparece una tarjeta, un clic, un corte.
- Sin risers, golpes fuertes ni campanas.
- Mezcla final a -14 LUFS para redes.
