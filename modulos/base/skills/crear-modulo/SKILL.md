---
name: crear-modulo
description: Crear un módulo (herramienta) nuevo para el sistema de videos con su ficha modulo.json, su skill para el agente y su paso a paso para personas, siguiendo la lista de calidad. Usar cuando alguien quiere agregar una herramienta nueva al sistema (carruseles, miniaturas, publicar en redes, etc.) o mejorar uno existente.
---

# Crear un módulo

Cada herramienta del sistema es un módulo en `modulos/<id>/`. La persona lo enciende o lo apaga (panel → Mantenimiento, o `node herramientas/modulos.mjs activar|apagar <id>`), y el agente solo conoce las skills de los módulos encendidos.

## Estructura

```
modulos/<id>/
├── modulo.json        ficha (obligatoria)
├── PASO-A-PASO.md     guía para personas (obligatoria)
├── skills/<nombre>/SKILL.md   instrucciones para el agente (una o más; opcional si el módulo no las necesita)
└── herramientas/      scripts propios del módulo (opcional)
```

`modulo.json`:

```json
{
  "id": "carruseles",
  "nombre": "Carruseles para el feed",
  "descripcion": "Una frase: qué hace, en palabras de la persona.",
  "version": "1.0.0",
  "siempre": false,
  "activoPorDefecto": false,
  "skills": ["hacer-carrusel"],
  "requiere": [],
  "usaInternet": false,
  "cuestaCreditos": false,
  "deTerceros": false,
  "instala": ["Qué instala o descarga, en una frase cada cosa"]
}
```

## Lista de calidad (no saltarla)

1. **Plantilla:** copia `plantillas/modulo-nuevo/` a `modulos/<id>/` y cambia el `id` (igual al nombre de la carpeta).
2. **Ficha honesta:** si usa internet, cuesta créditos o es de terceros, se marca. `instala` dice qué baja y de dónde.
3. **Versiones fijas:** cualquier programa o paquete que instale lleva versión exacta (ver `SEGURIDAD.md`, "Versiones fijas"). Nada de "la última".
4. **Skill:** `name` y `description` en el encabezado (la descripción dice cuándo usarla). Pasos en orden, con validación de la persona donde corresponda. Respeta las reglas de `AGENTS.md` (gastos, claves, contenido externo).
5. **Paso a paso:** para alguien que no sabe nada técnico. Qué hace, cómo se enciende, qué decirle al agente, qué esperar y qué hacer si falla.
6. **Datos de la persona:** todo lo que el módulo genere va en `mis-videos/` (de la marca o del video), nunca en las carpetas del sistema.
7. **Prueba completa:** `node herramientas/modulos.mjs activar <id>`, usarlo de punta a punta en una marca de prueba, apagarlo y comprobar que nada se rompe.
8. **Registro:** anótalo apenas esté terminado en la sección "En desarrollo" de `CHANGELOG.md` (qué hace, en palabras de la persona) y en `HOJA-DE-RUTA.md`.

## Módulos de terceros

Si el módulo descarga código de otra persona o empresa: `deTerceros: true`, versión o commit fijo, su licencia anotada en `TERCEROS.md`, y la persona lo ve antes de activarlo.
