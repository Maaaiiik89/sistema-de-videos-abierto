"""Prepara los datos de la voz para las escenas de HyperFrames.

Uso:
  uv run --with numpy python herramientas/preparar-voz.py <transcripcion.json (whisper o del editor)> <voz_final.wav> <cortes_de_escena> <salida.js>

- cortes_de_escena: segundos donde empieza cada escena, separados por coma, ej. "0,29.5,48.2,92.7,130.7,150.3".
- Escribe <salida.js> (script clásico) con:
    window.__SUBS_ESC = { e1: [[id, desde, hasta, html], ...], e2: ... }   tiempos relativos a cada escena
    window.__VOZ = { "#id": [[inicio, fin], ...] }                         tiempo de cada palabra (relativo a la escena)
    window.__AMP = [...]                                                    intensidad de la voz a 30 cuadros por segundo (0 a 1)
    window.__ESCENAS = [inicio, ...]                                        inicio de cada escena en la voz
- Cada subtítulo es una parte de frase de hasta 7 palabras (corta en comas cuando puede).
  Usa las palabras tal como se dijeron (transcripción de Whisper).
"""
import json, sys, subprocess, shutil, re
import numpy as np

FFMPEG = shutil.which("ffmpeg") or "ffmpeg"
MAX = 7
# Tildes que Whisper a veces se come (texto exacto del subtítulo -> corregido)
CORREGIR = [("¿Y qué cambio ", "¿Y qué cambió ")]


def main():
    js, wav, cortes, salida = sys.argv[1:5]
    cortes = [float(x) for x in cortes.split(",")]
    d = json.load(open(js, encoding="utf-8"))
    # Acepta la transcripción de whisper ("segments"/"words") o la del editor ("segmentos"/"palabras")
    if "segmentos" in d and "segments" not in d:
        d = {"segments": [{"words": [{"word": " " + w["p"], "start": w["i"], "end": w["f"]} for w in s.get("palabras", [])]}
                          for s in d["segmentos"]]}
    palabras = []
    for s in d["segments"]:
        for w in s["words"]:
            t = w["word"].strip()
            if not t:
                continue
            if t.startswith(".") and palabras:  # "midominio" + ".com," -> una palabra
                palabras[-1]["t"] += t
                palabras[-1]["fin"] = w["end"]
                continue
            palabras.append({"t": t, "ini": w["start"], "fin": w["end"]})

    # Frases: cortan en . ? ! y en pausas largas
    frases, actual = [], []
    for i, p in enumerate(palabras):
        actual.append(p)
        pausa = palabras[i + 1]["ini"] - p["fin"] if i + 1 < len(palabras) else 9
        if re.search(r"[.?!]$", p["t"]) or pausa > 0.45:
            frases.append(actual)
            actual = []
    if actual:
        frases.append(actual)

    # Partes de frase de hasta MAX palabras, cortando en comas si se puede
    partes = []
    for f in frases:
        while len(f) > MAX:
            corte = None
            for k in range(MAX - 1, 2, -1):
                if f[k - 1]["t"].endswith(","):
                    corte = k
                    break
            if corte is None:
                corte = (len(f) + 1) // 2 if len(f) <= MAX * 2 else MAX
            partes.append(f[:corte])
            f = f[corte:]
        partes.append(f)

    subs, voz = {}, {}
    contador = {}
    for n, parte in enumerate(partes):
        ini = parte[0]["ini"]
        e = max(i for i, c in enumerate(cortes) if ini >= c - 0.05)
        clave = f"e{e + 1}"
        contador[clave] = contador.get(clave, 0) + 1
        sid = f"{clave}-s{contador[clave]}"
        base = cortes[e]
        sig = partes[n + 1][0]["ini"] if n + 1 < len(partes) else parte[-1]["fin"] + 1.2
        desde = max(0, ini - 0.06 - base)
        hasta = min(parte[-1]["fin"] + 0.35, sig - 0.04) - base
        if e + 1 < len(cortes):
            hasta = min(hasta, cortes[e + 1] - base - 0.03)  # no cruza al cambio de escena
        # palabra clave: la última palabra "con contenido" de la parte
        idx_clave = max((i for i, p in enumerate(parte) if len(re.sub(r"\W", "", p["t"])) > 3), default=len(parte) - 1)
        mitad = (len(parte) + 1) // 2 if len(parte) > 4 else len(parte)
        html = ""
        for i, p in enumerate(parte):
            if i == mitad and mitad < len(parte):
                html += "<br />"
            elif i:
                html += " "
            html += f"<b>{p['t']}</b>" if i == idx_clave else p["t"]
        for a, b in CORREGIR:
            html = html.replace(a, b)
        subs.setdefault(clave, []).append([sid, round(desde, 3), round(hasta, 3), html])
        voz["#" + sid] = [[round(p["ini"] - base, 3), round(p["fin"] - base, 3)] for p in parte]

    # Intensidad de la voz a 30 cps
    crudo = subprocess.run([FFMPEG, "-v", "error", "-i", wav, "-ac", "1", "-ar", "12000", "-f", "f32le", "-"], capture_output=True, check=True).stdout
    x = np.frombuffer(crudo, dtype=np.float32)
    v = 400
    n = len(x) // v
    rms = np.sqrt((x[: n * v].reshape(n, v) ** 2).mean(1))
    amp = np.clip(rms / (np.percentile(rms, 95) + 1e-9), 0, 1)
    with open(salida, "w", encoding="utf-8") as f:
        f.write("// Generado por herramientas/preparar-voz.py: no editar a mano.\n")
        f.write("window.__ESCENAS = " + json.dumps(cortes) + ";\n")
        f.write("window.__SUBS_ESC = " + json.dumps(subs, ensure_ascii=False) + ";\n")
        f.write("window.__VOZ = " + json.dumps(voz, ensure_ascii=False) + ";\n")
        f.write("window.__AMP = [" + ",".join(f"{a:.2f}".rstrip("0").rstrip(".") or "0" for a in amp) + "];\n")
    print("subtítulos por escena:", {k: len(v) for k, v in subs.items()}, "| cuadros de voz:", len(amp))


if __name__ == "__main__":
    main()
