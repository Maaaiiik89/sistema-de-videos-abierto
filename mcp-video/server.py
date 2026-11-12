"""Servidor MCP para editar las grabaciones de pantalla con ffmpeg y whisper.

Los originales nunca se tocan: cada operacion escribe un MP4 nuevo en
editados/ y, a su lado, un .json con el origen, la operacion y el
mapa de tiempos.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

from mcp.server.mcpserver import Image, MCPServer
from mcp.server.mcpserver.exceptions import ToolError

RAIZ = Path(__file__).resolve().parent.parent
DATOS = RAIZ / "mis-videos"          # todo lo de la persona (Actualizar no lo toca)
BANDEJA = DATOS / "bandeja"


def _marca() -> Path:
    """Carpeta de la marca activa (mis-videos/config.json). Si hay una sola marca, esa."""
    marcas = DATOS / "marcas"
    hay = sorted(d.name for d in marcas.iterdir() if (d / "ficha.md").exists()) if marcas.exists() else []
    activa = None
    try:
        activa = json.loads((DATOS / "config.json").read_text(encoding="utf-8")).get("marcaActiva")
    except Exception:
        pass
    if activa not in hay:
        activa = hay[0] if len(hay) == 1 else None
    if not activa:
        raise ToolError("No hay marca activa. Crea una con la skill empezar o elige una: node herramientas/marcas.mjs activar <id>"
                        if hay else "Todavía no hay ninguna marca: primero la skill empezar.")
    return marcas / activa


def _grab() -> Path:
    """Grabaciones originales de la marca activa (nunca se modifican)."""
    return _marca() / "grabaciones"


def _edit() -> Path:
    """Salidas del editor para la marca activa."""
    return _marca() / "editados"
FFMPEG = shutil.which("ffmpeg") or "ffmpeg"
FFPROBE = shutil.which("ffprobe") or "ffprobe"
NO_WINDOW = 0x08000000 if os.name == "nt" else 0
EXT_VIDEO = {".mp4", ".mkv", ".mov", ".webm", ".avi"}
EXT_AUDIO = {".wav", ".mp3", ".m4a", ".aac", ".ogg", ".flac", ".opus"}

INSTRUCCIONES = """\
Edita las grabaciones de la marca activa (mis-videos/marcas/<marca>/grabaciones/) con ffmpeg y whisper.

Flujo recomendado:
1. listar_grabaciones -> elige el video. info_video muestra sus marcas y metadatos.
2. Entiende el contenido: transcribir (texto con tiempos y palabras) y ver_frames (imagenes).
3. Edita: ensamblar (quedarse con tramos, reordenar, acelerar), quitar_silencios,
   zoom (acercar suave a una zona), recortar_area, unir.
   Si tiene voz: limpiar_voz (ruido, respiros, volumen parejo) antes de exportar.
4. Entrega: exportar_formato (9:16, 1:1, 4:5 o 16:9).

Reglas:
- Las 'marcas' del .json son indicaciones del autor ("cortar aqui", "esto sirve").
  Una marca sin nota es un punto de interes o un corte. Respetalas.
- Los originales nunca se sobrescriben. Cada salida va a editados/ de la marca activa con su .json
  (origen, operacion, mapa original->nuevo y marcas trasladadas). Encadena operaciones
  pasando el nombre del archivo editado.
- Tiempos en segundos (decimales). Coordenadas en pixeles DEL VIDEO: si vienen de
  rect_capturado (pantalla), resta el origen del rect.
- Recodificar cuesta tiempo: junta todos los cortes en un solo ensamblar en vez de muchos.
"""

server = MCPServer("video-editor", instructions=INSTRUCCIONES)


# --------------------------------------------------------------------------- utilidades

def _run(cmd: list[str], **kw) -> subprocess.CompletedProcess:
    p = subprocess.run(cmd, capture_output=True, creationflags=NO_WINDOW, **kw)
    if p.returncode != 0:
        err = p.stderr.decode("utf-8", "replace").strip().splitlines()
        raise ToolError("ffmpeg fallo:\n" + "\n".join(err[-15:]))
    return p


def _probe(path: Path) -> dict:
    p = _run([FFPROBE, "-v", "error", "-show_entries",
              "format=duration:stream=codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels",
              "-of", "json", str(path)])
    d = json.loads(p.stdout)
    v = next((s for s in d.get("streams", []) if s["codec_type"] == "video"), None)
    a = next((s for s in d.get("streams", []) if s["codec_type"] == "audio"), None)
    if not v:
        raise ToolError(f"{path.name} no tiene video")
    num, den = (v.get("r_frame_rate") or "30/1").split("/")
    fps = round(float(num) / float(den or 1), 3) if float(num) else 30.0
    return {
        "duracion_s": round(float(d.get("format", {}).get("duration", 0) or 0), 3),
        "ancho": int(v["width"]), "alto": int(v["height"]), "fps": fps,
        "video_codec": v.get("codec_name"),
        "audio": bool(a),
        "audio_codec": a.get("codec_name") if a else None,
        "audio_canales": a.get("channels") if a else None,
    }


def _resolver(archivo: str) -> Path:
    p = Path(archivo)
    if p.is_absolute() and p.exists():
        return p
    candidatos = []
    for carpeta in (_grab(), _edit(), BANDEJA, RAIZ):
        candidatos.append(carpeta / archivo)
        if not p.suffix:
            candidatos.append(carpeta / (archivo + ".mp4"))
    for c in candidatos:
        if c.exists() and c.suffix.lower() in EXT_VIDEO:
            return c
    raise ToolError(f"No encuentro '{archivo}' en grabaciones ni editados. "
                     "Usa listar_grabaciones para ver los nombres.")


def _sidecar(video: Path) -> dict:
    j = video.with_suffix(".json")
    if j.exists():
        try:
            return json.loads(j.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


def _transcripcion_path(video: Path) -> Path:
    return video.with_name(video.stem + ".transcripcion.json")


def _salida(origen: Path, sufijo: str, nombre_salida: str | None) -> Path:
    EDIT = _edit()
    EDIT.mkdir(parents=True, exist_ok=True)
    if nombre_salida:
        base = re.sub(r'[<>:"/\\|?*]+', "-", Path(nombre_salida).stem).strip() or "editado"
    else:
        base = f"{origen.stem}_{sufijo}"
    out = EDIT / f"{base}.mp4"
    n = 2
    while out.exists():
        out = EDIT / f"{base}_{n}.mp4"
        n += 1
    return out


_ENCODER: str | None = None


def _encoder() -> str:
    global _ENCODER
    if _ENCODER is None:
        _ENCODER = "libx264"
        try:
            p = subprocess.run([FFMPEG, "-hide_banner", "-f", "lavfi", "-i", "color=s=256x256:d=0.2",
                                "-frames:v", "2", "-c:v", "h264_amf", "-f", "null", "-"],
                               capture_output=True, creationflags=NO_WINDOW, timeout=30)
            if p.returncode == 0:
                _ENCODER = "h264_amf"
        except Exception:
            pass
    return _ENCODER


def _pix_fmt() -> str:
    return "nv12" if _encoder() == "h264_amf" else "yuv420p"


def _venc(fps: float) -> list[str]:
    g = str(max(1, round(fps)))
    if _encoder() == "h264_amf":
        return ["-c:v", "h264_amf", "-quality", "balanced", "-rc", "cqp",
                "-qp_i", "20", "-qp_p", "22", "-bf", "0", "-g", g]
    return ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-g", g]


AENC = ["-c:a", "aac", "-b:a", "160k", "-ar", "48000"]


def _ffmpeg_filtro(entradas: list[str], filtro: str, mapas: list[str], out: Path,
                   fps: float, con_audio: bool, extra: list[str] | None = None) -> None:
    """Corre ffmpeg con el filtro en un archivo (evita el limite de linea de comandos)."""
    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False, encoding="utf-8") as f:
        f.write(filtro)
        script = f.name
    try:
        cmd = [FFMPEG, "-hide_banner", "-y", *entradas, "-/filter_complex", script]
        for m in mapas:
            cmd += ["-map", m]
        cmd += _venc(fps)
        if con_audio:
            cmd += AENC
        cmd += (extra or []) + ["-movflags", "+faststart", str(out)]
        _run(cmd)
    finally:
        os.unlink(script)


def _guardar_meta(out: Path, meta: dict) -> dict:
    info = _probe(out)
    meta = {"archivo": out.name, **meta, "duracion_s": info["duracion_s"],
            "ancho": info["ancho"], "alto": info["alto"], "fps": info["fps"]}
    out.with_suffix(".json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    return meta


def _f(x: float) -> str:
    return f"{x:.3f}"


def _atempo(v: float) -> list[str]:
    """Cadena atempo para cualquier velocidad (cada atempo acepta 0.5..100)."""
    pasos = []
    while v < 0.5:
        pasos.append("atempo=0.5")
        v /= 0.5
    pasos.append(f"atempo={v:.6f}")
    return pasos


def _marcas_trasladadas(marcas: list[dict], mapa: list[dict]) -> list[dict]:
    res = []
    for m in marcas or []:
        t = m.get("t")
        if t is None:
            continue
        for seg in mapa:
            a, b = seg["original"]
            if a <= t <= b:
                x = seg["nuevo"][0] + (t - a) / seg["velocidad"]
                res.append({**m, "t": round(x, 2), "t_original": t})
                break
    return res


# --------------------------------------------------------------------------- herramientas

@server.tool(structured_output=False)
def listar_grabaciones(carpeta: str = "todas") -> str:
    """Lista los videos disponibles con duración, tamaño, fuente, marcas y si están transcritos.

    carpeta: "grabaciones" (originales), "editados" (salidas de este servidor), "bandeja" (lo subido sin ordenar) o "todas". Siempre de la marca activa.
    """
    GRAB, EDIT = _grab(), _edit()
    carpetas = {"grabaciones": [GRAB], "editados": [EDIT], "bandeja": [BANDEJA], "todas": [GRAB, EDIT, BANDEJA]}.get(carpeta)
    if carpetas is None:
        raise ToolError('carpeta debe ser "grabaciones", "editados", "bandeja" o "todas"')
    lineas = []
    for c in carpetas:
        if not c.exists():
            continue
        videos = sorted(p for p in c.iterdir() if p.suffix.lower() in EXT_VIDEO)
        lineas.append(f"## {c.relative_to(RAIZ).as_posix()} ({len(videos)})")
        for v in videos:
            meta = _sidecar(v)
            partes = [v.name]
            if v.suffix.lower() == ".mkv" and v.with_suffix(".mp4").exists() is False:
                partes.append("SIN TERMINAR (grabando o cortada)")
                lineas.append("- " + " | ".join(partes))
                continue
            try:
                info = _probe(v)
                partes.append(f"{info['duracion_s']:.1f}s")
                partes.append(f"{info['ancho']}x{info['alto']}@{info['fps']:g}")
                partes.append("con audio" if info["audio"] else "sin audio")
            except Exception:
                partes.append("no se pudo leer")
            fuente = meta.get("fuente") or {}
            if fuente:
                desc = fuente.get("tipo", "")
                if fuente.get("proceso"):
                    desc += f": {fuente['proceso']}"
                partes.append(desc)
            if meta.get("operacion"):
                partes.append(f"op: {meta['operacion']} de {meta.get('origen')}")
            marcas = meta.get("marcas") or []
            if marcas:
                partes.append(f"{len(marcas)} marcas")
            if _transcripcion_path(v).exists():
                partes.append("transcrito")
            lineas.append("- " + " | ".join(partes))
    return "\n".join(lineas) or "No hay videos."


@server.tool(structured_output=False)
def info_video(archivo: str) -> str:
    """Datos técnicos del video, su .json de metadatos (fuente, rect_capturado, marcas) y si tiene transcripción.

    archivo: nombre en grabaciones o editados (con o sin .mp4), o ruta absoluta.
    """
    v = _resolver(archivo)
    info = _probe(v)
    res = {"ruta": str(v), **info, "metadatos": _sidecar(v),
           "transcripcion": str(_transcripcion_path(v)) if _transcripcion_path(v).exists() else None}
    return json.dumps(res, ensure_ascii=False, indent=2)


def _escribir_srt(segmentos: list[dict], path: Path) -> None:
    def ts(s):
        ms = int(round(s * 1000))
        h, ms = divmod(ms, 3600000)
        m, ms = divmod(ms, 60000)
        s, ms = divmod(ms, 1000)
        return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
    bloques = [f"{i}\n{ts(s['inicio'])} --> {ts(s['fin'])}\n{s['texto']}\n" for i, s in enumerate(segmentos, 1)]
    path.write_text("\n".join(bloques), encoding="utf-8")


def _lineas_transcripcion(data: dict, palabras: bool) -> str:
    out = [f"Transcripción de {data['archivo']} (modelo {data['modelo']}, {len(data['segmentos'])} segmentos)"]
    for s in data["segmentos"]:
        out.append(f"[{s['inicio']:.2f}-{s['fin']:.2f}] {s['texto']}")
        if palabras:
            out.append("    " + " ".join(f"{w['p']}@{w['i']:.2f}" for w in s.get("palabras", [])))
    return "\n".join(out)


def _palabras_de_la_marca() -> str:
    """Lee la fila "Palabras de la marca" de la ficha de la marca activa (pista para whisper)."""
    try:
        ficha = _marca() / "ficha.md"
    except ToolError:
        return ""
    if not ficha.exists():
        return ""
    for linea in ficha.read_text(encoding="utf-8").splitlines():
        m = re.match(r"\|\s*Palabras de la marca[^|]*\|(.*)\|\s*$", linea, re.I)
        if m:
            return m.group(1).strip()
    return ""


@server.tool(structured_output=False)
def transcribir(archivo: str, modelo: str = "medium", idioma: str = "es", forzar: bool = False,
                incluir_palabras: bool = False, pista: str | None = None) -> str:
    """Transcribe el audio con whisper y devuelve líneas "[inicio-fin] texto".

    archivo: un video o un audio suelto (.wav, .mp3, .m4a, .aac).
    Guarda junto al archivo <nombre>.transcripcion.json (segmentos con tiempos por palabra) y <nombre>.srt.
    Si ya existe la transcripción la reutiliza, salvo forzar=True.
    modelo: "medium" por defecto. Otros ("small", "large", "turbo") se descargan la primera vez.
    incluir_palabras: True agrega cada palabra con su tiempo de inicio (útil para cortar muletillas).
    pista: nombres y palabras difíciles que se dicen (marca, productos, personas), para que whisper
      los escriba bien. Si no se pasa, usa la fila "Palabras de la marca" de la ficha de la marca activa.
    """
    v = _resolver_medio(archivo)
    destino = _transcripcion_path(v)
    if destino.exists() and not forzar:
        return _lineas_transcripcion(json.loads(destino.read_text(encoding="utf-8")), incluir_palabras)
    tipos = {s["codec_type"] for s in json.loads(_run([
        FFPROBE, "-v", "error", "-show_entries", "stream=codec_type", "-of", "json", str(v)]).stdout).get("streams", [])}
    if "audio" not in tipos:
        raise ToolError(f"{v.name} no tiene audio: no hay nada que transcribir.")
    pista = (pista or _palabras_de_la_marca()).strip()
    whisper = shutil.which("whisper") or str(Path.home() / ".local" / "bin" / "whisper.exe")
    env = {**os.environ, "PYTHONIOENCODING": "utf-8", "PYTHONUTF8": "1"}
    with tempfile.TemporaryDirectory() as tmp:
        cmd = [whisper, str(v), "--model", modelo, "--language", idioma,
               "--word_timestamps", "True", "--output_format", "json",
               "--output_dir", tmp, "--verbose", "False"]
        if pista:
            cmd += ["--initial_prompt", pista]
        p = subprocess.run(cmd, capture_output=True, env=env, creationflags=NO_WINDOW)
        salida = Path(tmp) / (v.stem + ".json")
        if p.returncode != 0 or not salida.exists():
            err = p.stderr.decode("utf-8", "replace").strip().splitlines()
            raise ToolError("whisper falló:\n" + "\n".join(err[-15:]))
        raw = json.loads(salida.read_text(encoding="utf-8"))
    segmentos = []
    for s in raw.get("segments", []):
        segmentos.append({
            "inicio": round(s["start"], 2), "fin": round(s["end"], 2), "texto": s["text"].strip(),
            "palabras": [{"p": w["word"].strip(), "i": round(w["start"], 2), "f": round(w["end"], 2)}
                         for w in s.get("words", [])],
        })
    data = {"archivo": v.name, "modelo": modelo, "idioma": idioma, "pista": pista or None,
            "texto": raw.get("text", "").strip(), "segmentos": segmentos}
    destino.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    _escribir_srt(segmentos, v.with_suffix(".srt"))
    return _lineas_transcripcion(data, incluir_palabras)


def _silencios(v: Path, umbral_db: float, duracion_min: float) -> tuple[list[dict], float]:
    info = _probe(v)
    if not info["audio"]:
        raise ToolError(f"{v.name} no tiene audio: no se pueden detectar silencios.")
    p = _run([FFMPEG, "-hide_banner", "-nostats", "-i", str(v), "-vn",
              "-af", f"silencedetect=noise={umbral_db}dB:d={duracion_min}", "-f", "null", "-"])
    txt = p.stderr.decode("utf-8", "replace")
    res, ini = [], None
    for linea in txt.splitlines():
        m = re.search(r"silence_start: (-?[\d.]+)", linea)
        if m:
            ini = max(0.0, float(m.group(1)))
        m = re.search(r"silence_end: ([\d.]+)", linea)
        if m and ini is not None:
            fin = float(m.group(1))
            res.append({"inicio": round(ini, 3), "fin": round(fin, 3), "duracion": round(fin - ini, 3)})
            ini = None
    if ini is not None:
        fin = info["duracion_s"]
        res.append({"inicio": round(ini, 3), "fin": round(fin, 3), "duracion": round(fin - ini, 3)})
    return res, info["duracion_s"]


@server.tool(structured_output=False)
def detectar_silencios(archivo: str, umbral_db: float = -35, duracion_min: float = 0.7) -> str:
    """Encuentra los tramos donde el audio está por debajo de umbral_db por al menos duracion_min segundos.

    Útil para ver pausas largas antes de cortar. Sube umbral_db (ej. -30) si hay ruido de fondo.
    """
    v = _resolver(archivo)
    sil, dur = _silencios(v, umbral_db, duracion_min)
    total = sum(s["duracion"] for s in sil)
    return json.dumps({"archivo": v.name, "duracion_s": dur, "silencio_total_s": round(total, 2),
                       "silencios": sil}, ensure_ascii=False)


@server.tool(structured_output=False)
def ver_frames(archivo: str, tiempos: list[float] | None = None, cantidad: int = 6, ancho: int = 768) -> list:
    """Devuelve imágenes del video para mirar qué se ve.

    tiempos: segundos exactos a capturar. Si se omite, toma `cantidad` frames repartidos en todo el video.
    ancho: ancho en píxeles de cada imagen (más chico = más barato).
    """
    v = _resolver(archivo)
    dur = _probe(v)["duracion_s"]
    if not tiempos:
        n = max(1, min(int(cantidad), 24))
        tiempos = [round((i + 0.5) * dur / n, 2) for i in range(n)]
    res: list = []
    for t in tiempos[:24]:
        t = min(max(0.0, float(t)), max(0.0, dur - 0.05))
        p = _run([FFMPEG, "-hide_banner", "-loglevel", "error", "-ss", _f(t), "-i", str(v),
                  "-frames:v", "1", "-vf", f"scale={int(ancho)}:-2", "-f", "image2pipe",
                  "-c:v", "mjpeg", "-q:v", "4", "-"])
        res.append(f"t={t:.2f}s")
        res.append(Image(data=p.stdout, format="jpeg"))
    return res


def _ensamblar(v: Path, segmentos: list[dict], out: Path, operacion: str, extra_meta: dict) -> dict:
    info = _probe(v)
    dur, fps, con_audio = info["duracion_s"], info["fps"], info["audio"]
    segs = []
    for s in segmentos:
        a = max(0.0, float(s["inicio"]))
        b = min(dur, float(s["fin"]))
        vel = float(s.get("velocidad", 1) or 1)
        if not 0.1 <= vel <= 16:
            raise ToolError("velocidad debe estar entre 0.1 y 16")
        if b - a < 0.04:
            continue
        segs.append({"a": a, "b": b, "vel": vel, "mute": bool(s.get("silenciar", False))})
    if not segs:
        raise ToolError("No quedó ningún segmento válido (revisa inicio/fin contra la duración del video).")

    cronologico = all(segs[i]["a"] >= segs[i - 1]["b"] - 1e-6 for i in range(1, len(segs)))
    n = len(segs)
    lineas, entradas = [], []
    pix = _pix_fmt()
    if cronologico:
        entradas = ["-i", str(v)]
        lineas.append(f"[0:v]split={n}" + "".join(f"[vs{i}]" for i in range(n)) + ";")
        if con_audio:
            lineas.append(f"[0:a]asplit={n}" + "".join(f"[as{i}]" for i in range(n)) + ";")
        for i, s in enumerate(segs):
            lineas.append(f"[vs{i}]trim=start={_f(s['a'])}:end={_f(s['b'])},"
                          f"setpts=(PTS-STARTPTS)/{s['vel']:.6f}[v{i}];")
            if con_audio:
                cad = [f"atrim=start={_f(s['a'])}:end={_f(s['b'])}", "asetpts=PTS-STARTPTS"]
                if s["vel"] != 1:
                    cad += _atempo(s["vel"])
                if s["mute"]:
                    cad.append("volume=0")
                lineas.append(f"[as{i}]" + ",".join(cad) + f"[a{i}];")
    else:
        # orden libre: una entrada por segmento con busqueda precisa
        for i, s in enumerate(segs):
            entradas += ["-ss", _f(s["a"]), "-t", _f(s["b"] - s["a"]), "-i", str(v)]
            lineas.append(f"[{i}:v]setpts=(PTS-STARTPTS)/{s['vel']:.6f}[v{i}];")
            if con_audio:
                cad = ["asetpts=PTS-STARTPTS"]
                if s["vel"] != 1:
                    cad += _atempo(s["vel"])
                if s["mute"]:
                    cad.append("volume=0")
                lineas.append(f"[{i}:a]" + ",".join(cad) + f"[a{i}];")
    pares = "".join(f"[v{i}]" + (f"[a{i}]" if con_audio else "") for i in range(n))
    if con_audio:
        lineas.append(f"{pares}concat=n={n}:v=1:a=1[vc][ao];")
    else:
        lineas.append(f"{pares}concat=n={n}:v=1:a=0[vc];")
    lineas.append(f"[vc]fps={fps:g},format={pix}[vo]")
    mapas = ["[vo]"] + (["[ao]"] if con_audio else [])
    _ffmpeg_filtro(entradas, "\n".join(lineas), mapas, out, fps, con_audio)

    mapa, t = [], 0.0
    for s in segs:
        largo = (s["b"] - s["a"]) / s["vel"]
        mapa.append({"original": [round(s["a"], 3), round(s["b"], 3)],
                     "nuevo": [round(t, 3), round(t + largo, 3)], "velocidad": s["vel"],
                     **({"silenciado": True} if s["mute"] else {})})
        t += largo
    marcas = _marcas_trasladadas(_sidecar(v).get("marcas", []), mapa)
    return _guardar_meta(out, {"origen": v.name, "operacion": operacion, **extra_meta,
                               "mapa": mapa, "marcas": marcas})


@server.tool(structured_output=False)
def ensamblar(archivo: str, segmentos: list[dict], nombre_salida: str | None = None) -> str:
    """Arma un video nuevo con los tramos indicados, en el orden dado. Todo lo demás se descarta.

    segmentos: lista de {"inicio": s, "fin": s, "velocidad": 1, "silenciar": false}.
      - velocidad: 2 = el doble de rápido (ideal para partes de tipeo o carga), 0.5 = cámara lenta.
      - silenciar: true deja ese tramo sin sonido.
    Si los tramos van en orden cronológico se procesa en una sola pasada (rápido).
    Devuelve el archivo creado y el mapa original->nuevo. Las marcas se trasladan al nuevo tiempo.
    """
    v = _resolver(archivo)
    out = _salida(v, "ensamblado", nombre_salida)
    meta = _ensamblar(v, segmentos, out, "ensamblar", {})
    return json.dumps(meta, ensure_ascii=False)


@server.tool(structured_output=False)
def quitar_silencios(archivo: str, umbral_db: float = -35, duracion_min: float = 0.8,
                     margen: float = 0.15, nombre_salida: str | None = None) -> str:
    """Corta las pausas largas: elimina los silencios de al menos duracion_min segundos.

    margen: segundos de silencio que se dejan a cada lado del corte para que no suene brusco.
    """
    v = _resolver(archivo)
    sil, dur = _silencios(v, umbral_db, duracion_min)
    cortes = []
    for s in sil:
        a = s["inicio"] + (margen if s["inicio"] > 0.01 else 0)
        b = s["fin"] - (margen if s["fin"] < dur - 0.01 else 0)
        if b - a > 0.05:
            cortes.append((a, b))
    if not cortes:
        return f"No hay silencios de {duracion_min}s o más bajo {umbral_db} dB en {v.name}. No se creó nada."
    keep, t = [], 0.0
    for a, b in cortes:
        if a - t > 0.05:
            keep.append({"inicio": t, "fin": a})
        t = b
    if dur - t > 0.05:
        keep.append({"inicio": t, "fin": dur})
    out = _salida(v, "sin-silencios", nombre_salida)
    meta = _ensamblar(v, keep, out, "quitar_silencios",
                      {"parametros": {"umbral_db": umbral_db, "duracion_min": duracion_min, "margen": margen}})
    meta["eliminado_s"] = round(dur - meta["duracion_s"], 2)
    meta["cortes"] = len(cortes)
    return json.dumps(meta, ensure_ascii=False)


@server.tool(structured_output=False)
def zoom(archivo: str, zonas: list[dict], transicion: float = 0.5, nombre_salida: str | None = None) -> str:
    """Acerca la cámara de forma suave a una zona del video durante un tramo y luego vuelve.

    zonas: lista de {"inicio": s, "fin": s, "x": px, "y": px, "ancho": px, "alto": px}
      en píxeles del video. El acercamiento se ajusta para que la zona llene el cuadro (máx. 4x).
      Las zonas no pueden solaparse en el tiempo.
    transicion: segundos que dura la entrada y la salida del zoom.
    El audio no cambia.
    """
    v = _resolver(archivo)
    info = _probe(v)
    W, H, dur = info["ancho"], info["alto"], info["duracion_s"]
    zs = sorted(zonas, key=lambda z: float(z["inicio"]))
    for i in range(1, len(zs)):
        if float(zs[i]["inicio"]) < float(zs[i - 1]["fin"]):
            raise ToolError("Las zonas se solapan en el tiempo.")
    terminos_z, terminos_x, terminos_y, detalle = [], [], [], []
    for z in zs:
        a, b = max(0.0, float(z["inicio"])), min(dur, float(z["fin"]))
        zw, zh = max(16.0, float(z["ancho"])), max(16.0, float(z["alto"]))
        F = max(1.0, min(W / zw, H / zh, 4.0))
        cx = min(max(float(z["x"]) + zw / 2, 0), W)
        cy = min(max(float(z["y"]) + zh / 2, 0), H)
        tr = max(0.05, min(float(transicion), (b - a) / 2))
        t = f"(in/{info['fps']:g})"  # perspective no expone t; se usa el numero de frame
        s = f"min(clip(({t}-{_f(a)})/{_f(tr)},0,1),clip(({_f(b)}-{t})/{_f(tr)},0,1))"
        e = f"(({s})*({s})*(3-2*({s})))"
        terminos_z.append(f"{F - 1:.4f}*{e}")
        terminos_x.append(f"{cx - W / 2:.2f}*{e}")
        terminos_y.append(f"{cy - H / 2:.2f}*{e}")
        detalle.append({"inicio": a, "fin": b, "factor": round(F, 2), "centro": [round(cx), round(cy)]})
    Z = "(1+" + "+".join(terminos_z) + ")"
    CX = f"({W / 2}+" + "+".join(terminos_x) + ")"
    CY = f"({H / 2}+" + "+".join(terminos_y) + ")"
    # perspective con eval=frame: la ventana visible (W/Z x H/Z) se lleva al cuadro completo,
    # con precision de subpixel. (crop no sirve: limita x/y al tamaño inicial del cuadro.)
    X0 = f"clip({CX}-{W / 2}/{Z},0,{W}-{W}/{Z})"
    Y0 = f"clip({CY}-{H / 2}/{Z},0,{H}-{H}/{Z})"
    X1 = f"{X0}+{W}/{Z}"
    Y1 = f"{Y0}+{H}/{Z}"
    filtro = (f"[0:v]perspective=x0='{X0}':y0='{Y0}':x1='{X1}':y1='{Y0}':"
              f"x2='{X0}':y2='{Y1}':x3='{X1}':y3='{Y1}':interpolation=cubic:eval=frame,"
              f"setsar=1,format={_pix_fmt()}[vo]")
    out = _salida(v, "zoom", nombre_salida)
    mapas = ["[vo]"] + (["0:a"] if info["audio"] else [])
    _ffmpeg_filtro(["-i", str(v)], filtro, mapas, out, info["fps"], False,
                   extra=(["-c:a", "copy"] if info["audio"] else []))
    mapa = [{"original": [0, dur], "nuevo": [0, dur], "velocidad": 1}]
    meta = _guardar_meta(out, {"origen": v.name, "operacion": "zoom", "zonas": detalle,
                               "transicion": transicion, "mapa": mapa,
                               "marcas": _sidecar(v).get("marcas", [])})
    return json.dumps(meta, ensure_ascii=False)


@server.tool(structured_output=False)
def recortar_area(archivo: str, x: int, y: int, ancho: int, alto: int, escalar: bool = True,
                  nombre_salida: str | None = None) -> str:
    """Se queda solo con un rectángulo del video durante todo el clip (zoom fijo).

    x, y, ancho, alto: en píxeles del video.
    escalar: True lleva el recorte al ancho original del video (manteniendo proporción).
    """
    v = _resolver(archivo)
    info = _probe(v)
    W, H = info["ancho"], info["alto"]
    x, y = max(0, int(x)), max(0, int(y))
    ancho, alto = min(int(ancho), W - x) // 2 * 2, min(int(alto), H - y) // 2 * 2
    if ancho < 16 or alto < 16:
        raise ToolError("El área queda fuera del video o es demasiado chica.")
    filtro = f"[0:v]crop={ancho}:{alto}:{x}:{y}"
    if escalar:
        filtro += f",scale={W}:-2:flags=lanczos"
    filtro += f",setsar=1,format={_pix_fmt()}[vo]"
    out = _salida(v, "recorte", nombre_salida)
    mapas = ["[vo]"] + (["0:a"] if info["audio"] else [])
    _ffmpeg_filtro(["-i", str(v)], filtro, mapas, out, info["fps"], False,
                   extra=(["-c:a", "copy"] if info["audio"] else []))
    dur = info["duracion_s"]
    meta = _guardar_meta(out, {"origen": v.name, "operacion": "recortar_area",
                               "area": [x, y, ancho, alto],
                               "mapa": [{"original": [0, dur], "nuevo": [0, dur], "velocidad": 1}],
                               "marcas": _sidecar(v).get("marcas", [])})
    return json.dumps(meta, ensure_ascii=False)


@server.tool(structured_output=False)
def unir(archivos: list[str], nombre_salida: str | None = None) -> str:
    """Pega varios videos uno tras otro. Todos se ajustan al tamaño y fps del primero (con bordes si hace falta)."""
    if len(archivos) < 2:
        raise ToolError("Pasa al menos dos archivos.")
    vids = [_resolver(a) for a in archivos]
    infos = [_probe(v) for v in vids]
    W, H, fps = infos[0]["ancho"], infos[0]["alto"], infos[0]["fps"]
    con_audio = any(i["audio"] for i in infos)
    entradas, lineas = [], []
    for k, (v, inf) in enumerate(zip(vids, infos)):
        entradas += ["-i", str(v)]
        lineas.append(f"[{k}:v]scale={W}:{H}:force_original_aspect_ratio=decrease,"
                      f"pad={W}:{H}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps={fps:g},format={_pix_fmt()}[v{k}];")
        if con_audio:
            if inf["audio"]:
                lineas.append(f"[{k}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo[a{k}];")
            else:
                lineas.append(f"anullsrc=r=48000:cl=stereo,atrim=duration={_f(inf['duracion_s'])},"
                              f"aformat=sample_fmts=fltp:channel_layouts=stereo[a{k}];")
    n = len(vids)
    pares = "".join(f"[v{k}]" + (f"[a{k}]" if con_audio else "") for k in range(n))
    lineas.append(f"{pares}concat=n={n}:v=1:a={1 if con_audio else 0}[vo]" + ("[ao]" if con_audio else ""))
    out = _salida(vids[0], "unido", nombre_salida)
    _ffmpeg_filtro(entradas, "\n".join(lineas), ["[vo]"] + (["[ao]"] if con_audio else []),
                   out, fps, con_audio)
    mapa, t = [], 0.0
    for v, inf in zip(vids, infos):
        mapa.append({"archivo": v.name, "original": [0, inf["duracion_s"]],
                     "nuevo": [round(t, 3), round(t + inf["duracion_s"], 3)], "velocidad": 1})
        t += inf["duracion_s"]
    meta = _guardar_meta(out, {"origen": [v.name for v in vids], "operacion": "unir", "mapa": mapa})
    return json.dumps(meta, ensure_ascii=False)


def _resolver_medio(archivo: str) -> Path:
    """Como _resolver, pero acepta también archivos de solo audio (voz grabada aparte)."""
    p = Path(archivo)
    if p.is_absolute() and p.exists():
        return p
    for carpeta in (_grab(), _edit(), BANDEJA, RAIZ):
        for c in [carpeta / archivo] + ([carpeta / (archivo + e) for e in (".mp4", ".wav", ".m4a")] if not p.suffix else []):
            if c.exists() and c.suffix.lower() in EXT_VIDEO | EXT_AUDIO:
                return c
    raise ToolError(f"No encuentro '{archivo}' en grabaciones ni editados. "
                    "Pasa el nombre o una ruta absoluta (también sirve un .wav, .mp3 o .m4a).")


def _loudnorm_json(stderr: bytes) -> dict:
    txt = stderr.decode("utf-8", "replace")
    m = re.findall(r"\{[^{}]*\"input_i\"[^{}]*\}", txt, re.S)
    if not m:
        raise ToolError("No pude medir el volumen (loudnorm no devolvió datos).")
    return json.loads(m[-1])


def _cadena_voz(reduccion_ruido: int, bajar_respiros: bool) -> str:
    """Cadena de limpieza antes de la normalización de volumen."""
    pasos = [
        "aformat=channel_layouts=mono",       # mic de laptop: a veces un canal vacío o desfasado
        "highpass=f=80",                      # retumbe, golpes en la mesa, ventilador grave
        "lowpass=f=14000",
    ]
    if reduccion_ruido > 0:
        pasos.append(f"afftdn=nr={int(reduccion_ruido)}:nf=-50:tn=1")  # ruido de fondo constante
    if bajar_respiros:
        # puerta suave: entre frases baja ~12 dB (respiros, teclado lejano) sin cortar del todo
        pasos.append("agate=threshold=0.015:ratio=2:range=0.25:attack=8:release=280")
    pasos += [
        "deesser=i=0.35",                                                  # eses filosas
        "acompressor=threshold=0.125:ratio=3:attack=6:release=140:makeup=1.4",  # volumen parejo
    ]
    return ",".join(pasos)


@server.tool(structured_output=False)
def limpiar_voz(archivo: str, reduccion_ruido: int = 12, bajar_respiros: bool = True,
                volumen_lufs: float = -16, nombre_salida: str | None = None) -> str:
    """Deja la voz lista para publicar: quita ruido de fondo, baja respiros, empareja el volumen y lo lleva al nivel de redes.

    archivo: un video con voz (el video se copia sin recodificar) o un audio suelto (.wav, .mp3, .m4a).
    reduccion_ruido: dB de reducción del ruido constante (ventilador, zumbido). 0 = no tocar,
      12 = normal, 20 o más = ruido fuerte (puede sonar metálico).
    bajar_respiros: baja ~12 dB lo que suena entre frases (respiros, teclado), sin cortarlo.
    volumen_lufs: volumen final. -16 para redes; -14 si va sin música.
    Mide el volumen en dos pasadas para que el resultado sea exacto. Pico máximo -1.5 dBTP.
    Devuelve el volumen antes y después.
    """
    if not 0 <= int(reduccion_ruido) <= 40:
        raise ToolError("reduccion_ruido va de 0 a 40")
    if not -30 <= float(volumen_lufs) <= -10:
        raise ToolError("volumen_lufs va de -30 a -10 (normal: -16)")
    src = _resolver_medio(archivo)
    d = json.loads(_run([FFPROBE, "-v", "error", "-show_entries", "format=duration:stream=codec_type",
                         "-of", "json", str(src)]).stdout)
    tipos = {s["codec_type"] for s in d.get("streams", [])}
    if "audio" not in tipos:
        raise ToolError(f"{src.name} no tiene audio. Revisa que el grabador tenga elegido un micrófono.")
    es_video = "video" in tipos and src.suffix.lower() in EXT_VIDEO
    cadena = _cadena_voz(int(reduccion_ruido), bool(bajar_respiros))
    I, TP, LRA = float(volumen_lufs), -1.5, 11

    # Pasada 1: medir después de limpiar
    p1 = _run([FFMPEG, "-hide_banner", "-nostats", "-i", str(src), "-map", "0:a:0",
               "-af", f"{cadena},loudnorm=I={I}:TP={TP}:LRA={LRA}:print_format=json", "-f", "null", "-"])
    m = _loudnorm_json(p1.stderr)
    # Pasada 2: aplicar con los valores medidos (lineal, sin bombeo)
    ln = (f"loudnorm=I={I}:TP={TP}:LRA={LRA}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
          f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:"
          f"linear=true:print_format=json")
    filtro = f"{cadena},{ln},aresample=48000"

    if es_video:
        out = _salida(src, "voz-limpia", nombre_salida)
        cmd = [FFMPEG, "-hide_banner", "-nostats", "-y", "-i", str(src), "-map", "0:v:0", "-map", "0:a:0",
               "-c:v", "copy", "-af", filtro, *AENC, "-ac", "2", "-movflags", "+faststart", str(out)]
    else:
        EDIT = _edit()
        EDIT.mkdir(parents=True, exist_ok=True)
        base = (re.sub(r'[<>:"/\\|?*]+', "-", Path(nombre_salida).stem).strip()
                if nombre_salida else f"{src.stem}_voz-limpia")
        out, n = EDIT / f"{base}.wav", 2
        while out.exists():
            out, n = EDIT / f"{base}_{n}.wav", n + 1
        cmd = [FFMPEG, "-hide_banner", "-nostats", "-y", "-i", str(src), "-map", "0:a:0",
               "-af", filtro, "-c:a", "pcm_s16le", "-ar", "48000", "-ac", "1", str(out)]
    p2 = _run(cmd)
    r = _loudnorm_json(p2.stderr)

    # Volumen original (sin limpiar), para comparar
    p0 = _run([FFMPEG, "-hide_banner", "-nostats", "-i", str(src), "-map", "0:a:0",
               "-af", "loudnorm=print_format=json", "-f", "null", "-"])
    o = _loudnorm_json(p0.stderr)
    dur = round(float(d.get("format", {}).get("duration", 0) or 0), 3)
    meta = {"origen": src.name, "operacion": "limpiar_voz",
            "parametros": {"reduccion_ruido": int(reduccion_ruido), "bajar_respiros": bool(bajar_respiros),
                           "volumen_lufs": I},
            "antes": {"lufs": float(o["input_i"]), "pico_dbtp": float(o["input_tp"])},
            "despues": {"lufs": float(r["output_i"]), "pico_dbtp": float(r["output_tp"])},
            "mapa": [{"original": [0, dur], "nuevo": [0, dur], "velocidad": 1}],
            "marcas": _sidecar(src).get("marcas", [])}
    if es_video:
        meta = _guardar_meta(out, meta)
    else:
        meta = {"archivo": out.name, **meta, "duracion_s": dur}
        out.with_suffix(".json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    return json.dumps(meta, ensure_ascii=False)


FORMATOS = {"9:16": (1080, 1920), "1:1": (1080, 1080), "4:5": (1080, 1350), "16:9": (1920, 1080)}


@server.tool(structured_output=False)
def exportar_formato(archivo: str, formato: str = "9:16", fondo: str = "desenfocado",
                     centro_x: float = 0.5, nombre_salida: str | None = None) -> str:
    """Lleva el video a un formato de red social: "9:16" (1080x1920), "1:1", "4:5" o "16:9" (1920x1080).

    fondo:
      - "desenfocado": el video entero al centro, con una copia borrosa llenando el fondo.
      - "negro": el video entero al centro con bandas negras.
      - "recortar": llena el cuadro cortando los lados; centro_x (0 a 1) elige qué parte horizontal queda.
    """
    if formato not in FORMATOS:
        raise ToolError(f"formato debe ser uno de {list(FORMATOS)}")
    v = _resolver(archivo)
    info = _probe(v)
    TW, TH = FORMATOS[formato]
    pix = _pix_fmt()
    if fondo == "desenfocado":
        filtro = (f"[0:v]split[a][b];"
                  f"[a]scale={TW}:{TH}:force_original_aspect_ratio=increase,crop={TW}:{TH},"
                  f"gblur=sigma=40,eq=brightness=-0.08[bg];"
                  f"[b]scale={TW}:{TH}:force_original_aspect_ratio=decrease:flags=lanczos[fg];"
                  f"[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1,format={pix}[vo]")
    elif fondo == "negro":
        filtro = (f"[0:v]scale={TW}:{TH}:force_original_aspect_ratio=decrease:flags=lanczos,"
                  f"pad={TW}:{TH}:(ow-iw)/2:(oh-ih)/2,setsar=1,format={pix}[vo]")
    elif fondo == "recortar":
        cx = min(max(float(centro_x), 0.0), 1.0)
        filtro = (f"[0:v]scale={TW}:{TH}:force_original_aspect_ratio=increase:flags=lanczos,"
                  f"crop={TW}:{TH}:(iw-{TW})*{cx:.4f}:(ih-{TH})/2,setsar=1,format={pix}[vo]")
    else:
        raise ToolError('fondo debe ser "desenfocado", "negro" o "recortar"')
    out = _salida(v, formato.replace(":", "x"), nombre_salida)
    mapas = ["[vo]"] + (["0:a"] if info["audio"] else [])
    _ffmpeg_filtro(["-i", str(v)], filtro, mapas, out, info["fps"], False,
                   extra=(["-c:a", "copy"] if info["audio"] else []))
    dur = info["duracion_s"]
    meta = _guardar_meta(out, {"origen": v.name, "operacion": "exportar_formato", "formato": formato,
                               "fondo": fondo,
                               "mapa": [{"original": [0, dur], "nuevo": [0, dur], "velocidad": 1}],
                               "marcas": _sidecar(v).get("marcas", [])})
    return json.dumps(meta, ensure_ascii=False)


if __name__ == "__main__":
    server.run("stdio")
