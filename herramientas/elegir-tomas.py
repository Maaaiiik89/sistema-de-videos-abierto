"""Elige la mejor toma de cada frase de una grabación con repeticiones y arma una voz continua.

Uso:
  uv run python herramientas/elegir-tomas.py <transcripcion.json (whisper o del editor)> <audio_limpio.wav> <texto.txt> <salida_sin_extension> [37=242 ...]
  (37=242: para la frase 37, forzar la toma que empieza cerca del segundo 242 del audio original)

- texto.txt: el texto oficial. Las escenas empiezan con una línea "ESCENA ..." (opcional);
  el resto se parte en frases por . ? ! :
- Para cada frase busca en la transcripción (palabras con tiempo de Whisper) todas las ventanas
  que se le parecen y se queda con la más parecida; si hay empate, la más tardía (suele ser la buena).
- Arma <salida>.wav con las tomas elegidas en el orden del texto (pausa corta entre frases y
  más larga entre escenas) y <salida>.json con cada frase, su toma de origen y el tiempo de cada
  palabra en el audio nuevo (sirve para los subtítulos dinámicos).
- Imprime un informe: las frases con parecido bajo hay que escucharlas.
"""
import json, re, subprocess, sys, unicodedata, shutil, tempfile
from difflib import SequenceMatcher
from pathlib import Path

PAUSA_FRASE, PAUSA_ESCENA, ANTES, DESPUES = 0.28, 0.6, 0.07, 0.14
FFMPEG = shutil.which("ffmpeg") or "ffmpeg"


def norm(t):
    t = unicodedata.normalize("NFD", t.lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    t = t.replace(".lat", " lat")
    return re.findall(r"[a-z0-9]+", t)


def frases_del_texto(texto):
    escenas, actual = [], None
    for linea in texto.splitlines():
        l = linea.strip()
        if not l:
            continue
        if re.match(r"^ESCENA\b", l, re.I):
            actual = {"titulo": l, "frases": []}
            escenas.append(actual)
            continue
        if actual is None:
            actual = {"titulo": "", "frases": []}
            escenas.append(actual)
        # Solo . ? ! cierran frase; los dos puntos y los puntos suspensivos no (no partir una oración en dos tomas)
        l = l.replace("...", "…")
        partes = re.findall(r"[^.?!]+(?:[.?!]+|$)", re.sub(r"(\w)\.(\w)", lambda m: m.group(1) + "§" + m.group(2), l))
        partes = [p.replace("§", ".") for p in partes]
        for p in partes:
            p = p.strip()
            if p and norm(p):
                actual["frases"].append(p)
    # Une frases de 1 o 2 palabras con la siguiente (solas son ambiguas: "No.", "¿El resultado?")
    for e in escenas:
        unidas, guardada = [], ""
        for f in e["frases"]:
            if guardada:
                f = guardada + " " + f
                guardada = ""
            if len(norm(f)) <= 2:
                guardada = f
            else:
                unidas.append(f)
        if guardada:
            if unidas:
                unidas[-1] += " " + guardada
            else:
                unidas.append(guardada)
        e["frases"] = unidas
    return escenas


def main():
    js, wav, txt, salida = sys.argv[1:5]
    # --forzar 37=242 : para la frase 37, usar la toma que empieza cerca del segundo 242 del original
    forzar = {}
    for arg in sys.argv[5:]:
        if "=" in arg and arg.split("=")[0].isdigit():
            n, seg = arg.split("=")
            forzar[int(n)] = float(seg)
    d = json.load(open(js, encoding="utf-8"))
    # Acepta la transcripción de whisper ("segments"/"words") o la del editor ("segmentos"/"palabras")
    if "segmentos" in d and "segments" not in d:
        d = {"segments": [{"words": [{"word": " " + w["p"], "start": w["i"], "end": w["f"]} for w in s.get("palabras", [])]}
                          for s in d["segmentos"]]}
    palabras = [w for s in d["segments"] for w in s.get("words", [])]
    nw = [norm(w["word"]) for w in palabras]
    plano = []  # (indice de palabra, token)
    for i, toks in enumerate(nw):
        for t in toks:
            plano.append((i, t))
    tokens = [t for _, t in plano]
    escenas = frases_del_texto(open(txt, encoding="utf-8").read())

    elegidas = []
    for ie, e in enumerate(escenas):
        for f in e["frases"]:
            nfrase = len(elegidas) + 1
            obj = norm(f)
            L = len(obj)
            mejor = None
            for ini in range(len(tokens)):
                if tokens[ini] != obj[0] and SequenceMatcher(None, tokens[ini:ini + 3], obj[:3]).ratio() < 0.5:
                    continue
                for largo in range(max(1, L - 3), L + 4):
                    ven = tokens[ini:ini + largo]
                    if not ven:
                        continue
                    r = SequenceMatcher(None, ven, obj).ratio()
                    if ven[-1] == obj[-1]:
                        r += 0.03  # premia la toma que termina como la frase (no la deja colgando)
                    if nfrase in forzar and abs(palabras[plano[ini][0]]["start"] - forzar[nfrase]) > 3:
                        continue
                    if mejor is None or r > mejor[0] + 1e-9 or (abs(r - mejor[0]) < 0.005 and ini > mejor[1]):
                        mejor = (r, ini, largo)
            r, ini, largo = mejor
            w0, w1 = plano[ini][0], plano[min(ini + largo, len(plano)) - 1][0]
            elegidas.append({"escena": ie, "titulo": e["titulo"], "texto": f, "parecido": round(r, 3),
                             "dicho": "".join(palabras[k]["word"] for k in range(w0, w1 + 1)).strip(),
                             "palabras": [palabras[k] for k in range(w0, w1 + 1)], "w0": w0, "w1": w1})

    # Cortes con margen, sin invadir la palabra vecina
    for c in elegidas:
        ini = c["palabras"][0]["start"]
        fin = c["palabras"][-1]["end"]
        prev_fin = palabras[c["w0"] - 1]["end"] if c["w0"] > 0 else 0
        sig_ini = palabras[c["w1"] + 1]["start"] if c["w1"] + 1 < len(palabras) else fin + 1
        c["corte"] = [max(prev_fin + (ini - prev_fin) / 2, ini - ANTES), min(fin + (sig_ini - fin) / 2, fin + DESPUES)]

    tmp = Path(tempfile.mkdtemp())
    lista, t, salida_json = [], 0.0, []
    sil_f, sil_e = tmp / "pf.wav", tmp / "pe.wav"
    for ruta, dur in ((sil_f, PAUSA_FRASE), (sil_e, PAUSA_ESCENA)):
        subprocess.run([FFMPEG, "-v", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono", "-t", str(dur), "-c:a", "pcm_s16le", str(ruta)], check=True)
    for n, c in enumerate(elegidas):
        if n > 0:
            pausa = PAUSA_ESCENA if c["escena"] != elegidas[n - 1]["escena"] else PAUSA_FRASE
            lista.append(sil_e if pausa == PAUSA_ESCENA else sil_f)
            t += pausa
        a, b = c["corte"]
        seg = tmp / f"s{n:03d}.wav"
        subprocess.run([FFMPEG, "-v", "error", "-y", "-ss", f"{a:.3f}", "-to", f"{b:.3f}", "-i", wav,
                        "-af", "afade=t=in:d=0.015,areverse,afade=t=in:d=0.03,areverse", "-ac", "1", "-ar", "48000", "-c:a", "pcm_s16le", str(seg)], check=True)
        lista.append(seg)
        desfase = t - a
        salida_json.append({"n": n + 1, "escena": c["escena"] + 1, "titulo": c["titulo"], "texto": c["texto"],
                            "dicho": c["dicho"], "parecido": c["parecido"], "toma_original": [round(a, 2), round(b, 2)],
                            "inicio": round(t, 3), "fin": round(t + (b - a), 3),
                            "palabras": [[w["word"].strip(), round(w["start"] + desfase, 3), round(w["end"] + desfase, 3)] for w in c["palabras"]]})
        t += b - a
    concat = tmp / "lista.txt"
    concat.write_text("".join(f"file '{p.as_posix()}'\n" for p in lista), encoding="utf-8")
    subprocess.run([FFMPEG, "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(concat), "-c:a", "pcm_s16le", salida + ".wav"], check=True)
    json.dump({"duracion_s": round(t, 3), "frases": salida_json}, open(salida + ".json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    shutil.rmtree(tmp, ignore_errors=True)

    print(f"Duración final: {t:.1f} s, {len(salida_json)} frases")
    for f in salida_json:
        marca = "  " if f["parecido"] >= 0.85 else "!!"
        print(f"{marca} {f['n']:2d} [{f['toma_original'][0]:6.1f}s] {f['parecido']:.2f} | {f['dicho']}")


if __name__ == "__main__":
    main()
