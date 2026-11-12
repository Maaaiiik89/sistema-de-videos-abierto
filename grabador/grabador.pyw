"""Grabador de pantalla simple para Windows (ffmpeg + tkinter).

Graba una pantalla, una ventana o una region a MP4 (H.264 + AAC) en las
grabaciones de la marca activa (mis-videos/marcas/<marca>/grabaciones/; sin marca, en
mis-videos/bandeja/), y deja junto a cada video un .json con metadatos y
marcas de tiempo para que un agente pueda editarlo despues.

Atajos globales (funcionan aunque la ventana no tenga foco):
  Ctrl+Alt+R  grabar / detener
  Ctrl+Alt+P  pausar / reanudar
  Ctrl+Alt+M  agregar marca en el tiempo actual

Mientras graba aparece una barra flotante con el tiempo y los controles. Esa
barra y la ventana principal se excluyen de la captura (no salen en el video).
"""

import ctypes
import json
import os
import queue
import re
import shutil
import subprocess
import sys
import threading
import time
import tkinter as tk
from ctypes import wintypes
from datetime import datetime
from pathlib import Path
from tkinter import messagebox, ttk

# --- Rutas -----------------------------------------------------------------
RAIZ = Path(__file__).resolve().parent.parent
DATOS = RAIZ / "mis-videos"


def _carpeta_salida() -> Path:
    """Grabaciones de la marca activa (mis-videos/config.json). Sin marca activa: la bandeja,
    y el agente la ordena despues."""
    marcas = DATOS / "marcas"
    hay = sorted(d.name for d in marcas.iterdir() if (d / "ficha.md").exists()) if marcas.exists() else []
    activa = None
    try:
        activa = json.loads((DATOS / "config.json").read_text(encoding="utf-8")).get("marcaActiva")
    except Exception:
        pass
    if activa not in hay:
        activa = hay[0] if len(hay) == 1 else None
    return marcas / activa / "grabaciones" if activa else DATOS / "bandeja"


SALIDA = _carpeta_salida()
LOGS = SALIDA / ".logs"
CONFIG = Path(__file__).resolve().parent / "config.json"

FFMPEG = shutil.which("ffmpeg") or "ffmpeg"
SOLO_AUDIO = "Solo audio (micrófono, sin video)"
FFPROBE = shutil.which("ffprobe") or "ffprobe"
NO_WINDOW = 0x08000000  # CREATE_NO_WINDOW

# --- Win32 -----------------------------------------------------------------
user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32
dwmapi = ctypes.windll.dwmapi
try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)  # coordenadas en pixeles reales
except Exception:
    user32.SetProcessDPIAware()


def monitores():
    """Lista de (left, top, right, bottom), el principal primero."""
    res = []
    CB = ctypes.WINFUNCTYPE(ctypes.c_int, wintypes.HMONITOR, wintypes.HDC,
                            ctypes.POINTER(wintypes.RECT), wintypes.LPARAM)

    def cb(h, dc, r, l):
        rr = r.contents
        res.append((rr.left, rr.top, rr.right, rr.bottom))
        return 1

    user32.EnumDisplayMonitors(None, None, CB(cb), 0)
    res.sort(key=lambda m: (m[0] != 0 or m[1] != 0, m[0], m[1]))
    return res


def nombre_proceso(hwnd):
    pid = wintypes.DWORD()
    user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
    h = kernel32.OpenProcess(0x1000, False, pid.value)  # QUERY_LIMITED_INFORMATION
    if not h:
        return ""
    try:
        buf = ctypes.create_unicode_buffer(1024)
        n = wintypes.DWORD(1024)
        if kernel32.QueryFullProcessImageNameW(h, 0, buf, ctypes.byref(n)):
            return Path(buf.value).name
        return ""
    finally:
        kernel32.CloseHandle(h)


def ventanas():
    """Ventanas visibles con titulo: lista de (hwnd, titulo, exe)."""
    res = []
    propio = os.getpid()
    CB = ctypes.WINFUNCTYPE(ctypes.c_bool, wintypes.HWND, wintypes.LPARAM)

    def cb(hwnd, l):
        if not user32.IsWindowVisible(hwnd):
            return True
        n = user32.GetWindowTextLengthW(hwnd)
        if n == 0:
            return True
        cloaked = ctypes.c_int(0)
        dwmapi.DwmGetWindowAttribute(hwnd, 14, ctypes.byref(cloaked), 4)
        if cloaked.value:
            return True
        pid = wintypes.DWORD()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
        if pid.value == propio:
            return True
        buf = ctypes.create_unicode_buffer(n + 1)
        user32.GetWindowTextW(hwnd, buf, n + 1)
        titulo = buf.value.strip()
        if titulo in ("Program Manager", "Configuración", "Settings") or not titulo:
            return True
        res.append((hwnd, titulo, nombre_proceso(hwnd)))
        return True

    user32.EnumWindows(CB(cb), 0)
    return res


def rect_ventana(hwnd):
    r = wintypes.RECT()
    # DWMWA_EXTENDED_FRAME_BOUNDS = 9 (sin la sombra invisible)
    if dwmapi.DwmGetWindowAttribute(hwnd, 9, ctypes.byref(r), ctypes.sizeof(r)) != 0:
        user32.GetWindowRect(hwnd, ctypes.byref(r))
    return (r.left, r.top, r.right, r.bottom)


def traer_al_frente(hwnd):
    if user32.IsIconic(hwnd):
        user32.ShowWindow(hwnd, 9)  # SW_RESTORE
    user32.SetForegroundWindow(hwnd)


# --- Utilidades ------------------------------------------------------------

def slug(texto, largo=40):
    t = texto.lower()
    for a, b in zip("áéíóúñü", "aeiounu"):
        t = t.replace(a, b)
    t = re.sub(r"[^a-z0-9]+", "-", t).strip("-")
    return (t[:largo].strip("-")) or "grabacion"


def dispositivos():
    """(camaras, microfonos) disponibles por DirectShow."""
    try:
        p = subprocess.run([FFMPEG, "-hide_banner", "-list_devices", "true", "-f", "dshow", "-i", "dummy"],
                           capture_output=True, creationflags=NO_WINDOW)
        txt = p.stderr.decode("utf-8", "replace")
    except Exception:
        return [], []
    return re.findall(r'"([^"]+)" \(video\)', txt), re.findall(r'"([^"]+)" \(audio\)', txt)


def hwnd_de(widget):
    widget.update_idletasks()
    try:
        return int(widget.wm_frame(), 16)
    except Exception:
        return user32.GetParent(widget.winfo_id()) or widget.winfo_id()


def excluir_de_captura(widget):
    """La ventana se ve en pantalla pero no aparece en grabaciones ni capturas."""
    try:
        user32.SetWindowDisplayAffinity(hwnd_de(widget), 0x11)  # WDA_EXCLUDEFROMCAPTURE
    except Exception:
        pass


def sin_activar(widget):
    """Clic en la ventana sin robarle el foco a la app que se graba."""
    try:
        h = hwnd_de(widget)
        ex = user32.GetWindowLongW(h, -20)
        user32.SetWindowLongW(h, -20, ex | 0x08000000 | 0x00000080)  # NOACTIVATE | TOOLWINDOW
    except Exception:
        pass


def encoder_disponible(enc):
    try:
        p = subprocess.run([FFMPEG, "-hide_banner", "-f", "lavfi", "-i", "color=s=256x256:d=0.2",
                            "-frames:v", "2", "-c:v", enc, "-f", "null", "-"],
                           capture_output=True, creationflags=NO_WINDOW, timeout=20)
        return p.returncode == 0
    except Exception:
        return False


def duracion(archivo):
    try:
        p = subprocess.run([FFPROBE, "-v", "error", "-show_entries", "format=duration",
                            "-of", "default=nw=1:nk=1", str(archivo)],
                           capture_output=True, creationflags=NO_WINDOW)
        return round(float(p.stdout.decode().strip()), 3)
    except Exception:
        return None


def par(n):
    return max(2, int(n) // 2 * 2)


def recortar_a_monitor(rect):
    """Devuelve (indice_monitor, monitor, rect recortado a ese monitor)."""
    l, t, r, b = rect
    cx, cy = (l + r) // 2, (t + b) // 2
    mons = monitores()
    idx = 0
    for i, m in enumerate(mons):
        if m[0] <= cx < m[2] and m[1] <= cy < m[3]:
            idx = i
            break
    m = mons[idx]
    l, t = max(l, m[0]), max(t, m[1])
    r, b = min(r, m[2]), min(b, m[3])
    return idx, m, (l, t, l + par(r - l), t + par(b - t))


# --- Atajos globales -------------------------------------------------------

class Atajos(threading.Thread):
    MOD = 0x0001 | 0x0002 | 0x4000  # ALT | CONTROL | NOREPEAT
    TECLAS = {1: ord("R"), 2: ord("M"), 3: ord("P")}

    def __init__(self, cola):
        super().__init__(daemon=True)
        self.cola = cola
        self.ok = {}

    def run(self):
        for i, vk in self.TECLAS.items():
            self.ok[i] = bool(user32.RegisterHotKey(None, i, self.MOD, vk))
        msg = wintypes.MSG()
        while user32.GetMessageW(ctypes.byref(msg), None, 0, 0) > 0:
            if msg.message == 0x0312:  # WM_HOTKEY
                self.cola.put(msg.wParam)


# --- Selector de region ----------------------------------------------------

def elegir_region(root):
    """Overlay a pantalla completa; arrastrar para elegir. Devuelve rect o None."""
    vx, vy = user32.GetSystemMetrics(76), user32.GetSystemMetrics(77)
    vw, vh = user32.GetSystemMetrics(78), user32.GetSystemMetrics(79)
    top = tk.Toplevel(root)
    top.overrideredirect(True)
    top.attributes("-topmost", True)
    top.attributes("-alpha", 0.35)
    top.geometry(f"{vw}x{vh}+{vx}+{vy}")
    c = tk.Canvas(top, bg="black", highlightthickness=0, cursor="crosshair")
    c.pack(fill="both", expand=True)
    c.create_text(vw // 2, 60, text="Arrastra para elegir la región · Esc para cancelar",
                  fill="white", font=("Segoe UI", 16, "bold"))
    estado = {"ini": None, "rect": None, "res": None}

    def down(e):
        estado["ini"] = (e.x, e.y)
        if estado["rect"]:
            c.delete(estado["rect"])
        estado["rect"] = c.create_rectangle(e.x, e.y, e.x, e.y, outline="#ff6a1a", width=3)

    def move(e):
        if estado["ini"]:
            x0, y0 = estado["ini"]
            c.coords(estado["rect"], x0, y0, e.x, e.y)

    def up(e):
        if estado["ini"]:
            x0, y0 = estado["ini"]
            l, r = sorted((x0, e.x))
            t, b = sorted((y0, e.y))
            if r - l > 20 and b - t > 20:
                estado["res"] = (l + vx, t + vy, r + vx, b + vy)
        top.destroy()

    c.bind("<ButtonPress-1>", down)
    c.bind("<B1-Motion>", move)
    c.bind("<ButtonRelease-1>", up)
    top.bind("<Escape>", lambda e: top.destroy())
    top.focus_force()
    root.wait_window(top)
    return estado["res"]


# --- Barra flotante --------------------------------------------------------

FONDO = "#16181d"
ROJO = "#ff4d4d"
AMBAR = "#ffb020"


class Barra:
    """Indicador y controles mientras graba. Excluida de la captura."""

    def __init__(self, app):
        self.app = app
        t = self.top = tk.Toplevel(app.root)
        t.overrideredirect(True)
        t.attributes("-topmost", True)
        t.attributes("-alpha", 0.93)
        t.configure(bg=FONDO)
        fr = tk.Frame(t, bg=FONDO, padx=10, pady=5)
        fr.pack()
        self.punto = tk.Label(fr, text="●", fg=ROJO, bg=FONDO, font=("Segoe UI", 13))
        self.punto.pack(side="left")
        self.tiempo = tk.Label(fr, text="00:00", fg="white", bg=FONDO, font=("Consolas", 13, "bold"), padx=6)
        self.tiempo.pack(side="left")
        self.b_pausa = self._boton(fr, "⏸", "Pausar (Ctrl+Alt+P)", app.alternar_pausa)
        self._boton(fr, "■", "Detener (Ctrl+Alt+R)", app.detener)
        self._boton(fr, "⚑", "Marca (Ctrl+Alt+M)", app.marcar)
        self.info = tk.Label(fr, text="", fg="#9aa0aa", bg=FONDO, font=("Segoe UI", 9), padx=4)
        self.info.pack(side="left")
        for w in (fr, self.punto, self.tiempo, self.info):
            w.bind("<ButtonPress-1>", self._agarrar)
            w.bind("<B1-Motion>", self._arrastrar)
            w.bind("<ButtonRelease-1>", self._soltar)
        t.update_idletasks()
        pos = app.cfg.get("barra_pos")
        if pos:
            x, y = pos
        else:
            x = (user32.GetSystemMetrics(0) - t.winfo_reqwidth()) // 2
            y = 10
        t.geometry(f"+{x}+{y}")
        excluir_de_captura(t)
        sin_activar(t)
        self.parpadeo = 0

    def _boton(self, padre, txt, ayuda, cmd):
        b = tk.Label(padre, text=txt, fg="white", bg=FONDO, font=("Segoe UI Symbol", 13), padx=7, cursor="hand2")
        b.pack(side="left")
        b.bind("<Enter>", lambda e: b.config(bg="#2a2e37"))
        b.bind("<Leave>", lambda e: b.config(bg=FONDO))
        b.bind("<ButtonRelease-1>", lambda e: cmd())
        b.ayuda = ayuda
        return b

    def _agarrar(self, e):
        self._d = (e.x_root - self.top.winfo_x(), e.y_root - self.top.winfo_y())

    def _arrastrar(self, e):
        self.top.geometry(f"+{e.x_root - self._d[0]}+{e.y_root - self._d[1]}")

    def _soltar(self, e):
        self.app.cfg["barra_pos"] = [self.top.winfo_x(), self.top.winfo_y()]
        self.app.guardar_cfg()

    def actualizar(self, estado, segundos, marcas, aviso=""):
        self.parpadeo = (self.parpadeo + 1) % 6
        m, s = divmod(int(segundos), 60)
        h, m = divmod(m, 60)
        self.tiempo.config(text=(f"{h}:{m:02d}:{s:02d}" if h else f"{m:02d}:{s:02d}"))
        if estado == "grabando":
            self.punto.config(fg=ROJO if self.parpadeo < 4 else FONDO, text="●")
            self.b_pausa.config(text="⏸")
        elif estado == "pausado":
            self.punto.config(fg=AMBAR, text="⏸")
            self.b_pausa.config(text="▶")
        else:
            self.punto.config(fg=AMBAR if self.parpadeo < 3 else FONDO, text="●")
            aviso = aviso or "iniciando…"
        self.info.config(text=aviso or (f"{marcas} ⚑" if marcas else ""))

    def cerrar(self):
        try:
            self.top.destroy()
        except Exception:
            pass


# --- App -------------------------------------------------------------------

SIN_AUDIO = "(sin audio)"
SIN_CAMARA = "(sin cámara)"
POSICIONES = ["abajo derecha", "abajo izquierda", "arriba derecha", "arriba izquierda"]
TAMANOS = {"pequeña": 0.20, "mediana": 0.28, "grande": 0.36}
FORMAS = ["círculo", "rectángulo"]


class App:
    def __init__(self, root):
        self.root = root
        self.estado_rec = "listo"  # listo | arrancando | grabando | pausado | guardando
        self.sesion = None
        self.barra = None
        self.aviso = ("", 0)
        self.encoder = "libx264"
        self.cola = queue.Queue()
        self.cfg = self.cargar_cfg()

        root.title("Grabador")
        root.attributes("-topmost", True)
        root.resizable(False, False)
        dpi = user32.GetDpiForSystem()
        root.tk.call("tk", "scaling", dpi / 72)

        f = ttk.Frame(root, padding=10)
        f.grid()
        ttk.Label(f, text="Fuente").grid(row=0, column=0, sticky="w")
        self.fuente = ttk.Combobox(f, width=48, state="readonly")
        self.fuente.grid(row=0, column=1, columnspan=3, sticky="we", pady=2)
        ttk.Button(f, text="↻", width=3, command=self.refrescar).grid(row=0, column=4, padx=(4, 0))

        ttk.Label(f, text="Micrófono").grid(row=1, column=0, sticky="w")
        self.mic = ttk.Combobox(f, width=48, state="readonly")
        self.mic.grid(row=1, column=1, columnspan=4, sticky="we", pady=2)

        ttk.Label(f, text="Cámara").grid(row=2, column=0, sticky="w")
        self.cam = ttk.Combobox(f, width=48, state="readonly")
        self.cam.grid(row=2, column=1, columnspan=4, sticky="we", pady=2)

        fc = ttk.Frame(f)
        fc.grid(row=3, column=1, columnspan=4, sticky="w", pady=2)
        self.cam_pos = ttk.Combobox(fc, width=16, state="readonly", values=POSICIONES)
        self.cam_pos.set(self.cfg.get("cam_pos", POSICIONES[0]))
        self.cam_pos.pack(side="left")
        self.cam_tam = ttk.Combobox(fc, width=9, state="readonly", values=list(TAMANOS))
        self.cam_tam.set(self.cfg.get("cam_tam", "mediana"))
        self.cam_tam.pack(side="left", padx=4)
        self.cam_forma = ttk.Combobox(fc, width=10, state="readonly", values=FORMAS)
        self.cam_forma.set(self.cfg.get("cam_forma", FORMAS[0]))
        self.cam_forma.pack(side="left")

        ttk.Label(f, text="FPS").grid(row=4, column=0, sticky="w")
        self.fps = ttk.Combobox(f, width=6, state="readonly", values=["30", "60"])
        self.fps.set(str(self.cfg.get("fps", "30")))
        self.fps.grid(row=4, column=1, sticky="w", pady=2)
        self.minimizar = tk.BooleanVar(value=self.cfg.get("minimizar", True))
        ttk.Checkbutton(f, text="Minimizar al grabar", variable=self.minimizar,
                        command=self.guardar_cfg).grid(row=4, column=2, columnspan=3, sticky="w")

        for cb in (self.fuente, self.mic, self.cam, self.cam_pos, self.cam_tam, self.cam_forma, self.fps):
            cb.bind("<<ComboboxSelected>>", lambda e: self.guardar_cfg())

        self.btn = ttk.Button(f, text="●  Grabar  (Ctrl+Alt+R)", command=self.alternar)
        self.btn.grid(row=5, column=0, columnspan=5, sticky="we", pady=(8, 2))

        self.nota = ttk.Entry(f, width=36)
        self.nota.grid(row=6, column=0, columnspan=3, sticky="we", pady=2)
        ttk.Button(f, text="⚑ Marca (Ctrl+Alt+M)", command=lambda: self.marcar(self.nota.get())).grid(
            row=6, column=3, columnspan=2, sticky="we", padx=(4, 0))

        self.estado = ttk.Label(f, text="Listo", foreground="#555")
        self.estado.grid(row=7, column=0, columnspan=4, sticky="w", pady=(6, 0))
        ttk.Button(f, text="Abrir carpeta", command=lambda: os.startfile(SALIDA)).grid(
            row=7, column=4, sticky="e", pady=(6, 0))

        SALIDA.mkdir(parents=True, exist_ok=True)
        LOGS.mkdir(parents=True, exist_ok=True)
        self.refrescar()
        cams, mics = dispositivos()
        self.mic["values"] = [SIN_AUDIO] + mics
        g = self.cfg.get("mic")
        self.mic.set(g if g in mics else (mics[0] if mics else SIN_AUDIO))
        self.cam["values"] = [SIN_CAMARA] + cams
        g = self.cfg.get("cam")
        self.cam.set(g if g in cams else SIN_CAMARA)

        excluir_de_captura(root)
        self.atajos = Atajos(self.cola)
        self.atajos.start()
        threading.Thread(target=self.detectar_encoder, daemon=True).start()
        root.protocol("WM_DELETE_WINDOW", self.cerrar)
        root.after(100, self.tick)

    # --- config
    def cargar_cfg(self):
        try:
            return json.loads(CONFIG.read_text(encoding="utf-8"))
        except Exception:
            return {}

    def guardar_cfg(self):
        self.cfg.update(fuente=self.fuente.get(), mic=self.mic.get(), cam=self.cam.get(),
                        cam_pos=self.cam_pos.get(), cam_tam=self.cam_tam.get(),
                        cam_forma=self.cam_forma.get(), fps=self.fps.get(), minimizar=self.minimizar.get())
        try:
            CONFIG.write_text(json.dumps(self.cfg, ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception:
            pass

    def detectar_encoder(self):
        for enc in ("h264_amf", "h264_nvenc"):
            if encoder_disponible(enc):
                self.encoder = enc
                return
        self.encoder = "libx264"

    def refrescar(self):
        self.mons = monitores()
        self.vents = ventanas()
        opciones = [SOLO_AUDIO]
        opciones += [f"Pantalla {i + 1}  ({m[2] - m[0]}x{m[3] - m[1]})" for i, m in enumerate(self.mons)]
        opciones.append("Región… (elegir al grabar)")
        opciones += [f"Ventana: {t[:60]}  [{exe}]" for _, t, exe in self.vents]
        self.fuente["values"] = opciones
        prev = self.cfg.get("fuente")
        self.fuente.set(prev if prev in opciones else opciones[1])

    # --- fuente y comando ffmpeg
    def resolver_fuente(self):
        if self.fuente.get() == SOLO_AUDIO:
            if self.mic.get() == SIN_AUDIO:
                messagebox.showwarning("Grabador", "Para grabar solo audio, elige un micrófono.")
                return None, None, None
            return {"tipo": "audio"}, "voz", None
        opciones = [o for o in self.fuente["values"] if o != SOLO_AUDIO]
        i = opciones.index(self.fuente.get())
        nm = len(self.mons)
        if i < nm:
            m = self.mons[i]
            return {"tipo": "pantalla", "monitor": i + 1, "rect": list(m)}, f"pantalla{i + 1}", m
        if i == nm:
            self.root.withdraw()
            time.sleep(0.2)
            rect = elegir_region(self.root)
            self.root.deiconify()
            if not rect:
                return None, None, None
            return {"tipo": "region", "rect": list(rect)}, "region", rect
        hwnd, titulo, exe = self.vents[i - nm - 1]
        if not user32.IsWindow(hwnd):
            messagebox.showwarning("Grabador", "Esa ventana ya no existe. Refresca la lista.")
            return None, None, None
        traer_al_frente(hwnd)
        time.sleep(0.3)
        rect = rect_ventana(hwnd)
        nombre = Path(exe).stem if exe else titulo
        return {"tipo": "ventana", "titulo": titulo, "proceso": exe, "rect": list(rect)}, nombre, rect

    def comando(self, rect, salida, usar_gdigrab):
        if rect is None:
            # Solo audio: el micrófono a AAC, sin capturar pantalla
            mic = self.mic.get()
            cmd = [FFMPEG, "-hide_banner", "-y", "-f", "dshow", "-audio_buffer_size", "50",
                   "-i", f"audio={mic}", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
                   "-af", "aresample=async=1", str(salida)]
            return cmd, {"microfono": mic, "solo_audio": True}
        fps = int(self.fps.get())
        idx, mon, (l, t, r, b) = recortar_a_monitor(rect)
        w, h = r - l, b - t
        completo = (l, t, r, b) == tuple(mon)
        mic = self.mic.get() if self.mic.get() != SIN_AUDIO else None
        cam = self.cam.get() if self.cam.get() != SIN_CAMARA else None

        cmd = [FFMPEG, "-hide_banner", "-y"]
        # Los dispositivos DirectShow van PRIMERO: si van despues, ddagrab se queda sin
        # frames y el video sale trabado. Camara y micro en la misma entrada = en sincronia.
        if mic or cam:
            cmd += ["-thread_queue_size", "1024", "-f", "dshow", "-rtbufsize", "256M"]
            if mic:
                cmd += ["-audio_buffer_size", "50"]
            if cam:
                cmd += ["-vcodec", "mjpeg", "-video_size", "1280x720", "-framerate", "30"]
            disp = ([f"video={cam}"] if cam else []) + ([f"audio={mic}"] if mic else [])
            cmd += ["-i", ":".join(disp)]
        i_pant = 1 if (mic or cam) else 0
        cmd += ["-thread_queue_size", "1024"]
        if usar_gdigrab:
            cmd += ["-f", "gdigrab", "-framerate", str(fps), "-offset_x", str(l), "-offset_y", str(t),
                    "-video_size", f"{w}x{h}", "-draw_mouse", "1", "-i", "desktop"]
            pant = f"[{i_pant}:v]"
        else:
            dd = f"ddagrab=output_idx={idx}:framerate={fps}:draw_mouse=1"
            if not completo:
                dd += f":offset_x={l - mon[0]}:offset_y={t - mon[1]}:video_size={w}x{h}"
            cmd += ["-f", "lavfi", "-i", dd]
            pant = f"[{i_pant}:v]hwdownload,format=bgra,"
        pix = {"h264_amf": "nv12"}.get(self.encoder, "yuv420p")

        cam_info = None
        if cam:
            S = max(80, par(h * TAMANOS.get(self.cam_tam.get(), 0.28)))
            M = par(max(12, h * 0.03))
            if self.cam_forma.get() == "rectángulo":
                cw, ch = par(S * 16 / 9), S
                g_cam = f"[0:v]scale={cw}:{ch},format=yuva420p[cam]"
            else:
                cw = ch = S
                c = S / 2
                g_cam = (f"[0:v]crop=ih:ih,scale={S}:{S},format=yuva420p[c0];"
                         f"color=c=black:s={S}x{S}:d=1:r=1,format=gray,"
                         f"geq=lum='255*clip({c}-hypot(X-{c}+0.5,Y-{c}+0.5),0,1)'[mk];"
                         f"[c0][mk]alphamerge[cam]")
            pos = self.cam_pos.get()
            x = f"{M}" if "izquierda" in pos else f"main_w-overlay_w-{M}"
            y = f"{M}" if "arriba" in pos else f"main_h-overlay_h-{M}"
            grafo = (f"{pant}format=yuv420p[p];{g_cam};"
                     f"[p][cam]overlay=x={x}:y={y}:eof_action=repeat,format={pix}[v]")
            cam_info = {"dispositivo": cam, "posicion": pos, "forma": self.cam_forma.get(),
                        "rect_en_video": None, "ancho": cw, "alto": ch}
            cx = M if "izquierda" in pos else w - cw - M
            cy = M if "arriba" in pos else h - ch - M
            cam_info["rect_en_video"] = [cx, cy, cx + cw, cy + ch]
        else:
            grafo = f"{pant}format={pix}[v]"

        if self.encoder == "h264_amf":
            venc = ["-c:v", "h264_amf", "-quality", "balanced", "-rc", "cqp",
                    "-qp_i", "20", "-qp_p", "22", "-bf", "0"]
        elif self.encoder == "h264_nvenc":
            venc = ["-c:v", "h264_nvenc", "-preset", "p4", "-rc", "constqp", "-qp", "22"]
        else:
            venc = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-tune", "zerolatency"]
        cmd += ["-filter_complex", grafo, "-map", "[v]"]
        if mic:
            cmd += ["-map", "0:a"]
        cmd += [*venc, "-g", str(fps), "-fps_mode", "cfr", "-r", str(fps)]
        if mic:
            cmd += ["-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-af", "aresample=async=1"]
        cmd += [str(salida)]
        info = {"monitor": idx + 1, "rect_capturado": [l, t, r, b], "ancho": w, "alto": h, "fps": fps,
                "encoder": self.encoder, "captura": "gdigrab" if usar_gdigrab else "ddagrab",
                "microfono": mic, "camara": cam_info}
        return cmd, info

    # --- ciclo de grabacion
    def alternar(self):
        if self.estado_rec == "listo":
            self.grabar()
        elif self.estado_rec in ("grabando", "pausado"):
            self.detener()

    def grabar(self):
        fuente, nombre, rect = self.resolver_fuente()
        if not fuente:
            return
        base = datetime.now().strftime("%Y-%m-%d_%H%M%S") + "_" + slug(nombre)
        self.sesion = {"base": base, "fuente": fuente, "rect": rect, "segs": [], "marcas": [],
                       "gdigrab": False, "inicio": datetime.now().isoformat(timespec="seconds"),
                       "con_cam": self.cam.get() != SIN_CAMARA}
        self.estado_rec = "arrancando"
        self.btn.config(text="■  Detener  (Ctrl+Alt+R)")
        self.estado.config(text="Arrancando…", foreground="#c0392b")
        self.barra = Barra(self)
        espera = 0
        if self.minimizar.get():
            self.root.iconify()
            espera = 300
        self.root.after(espera, self.iniciar_segmento)

    def iniciar_segmento(self):
        s = self.sesion
        n = len(s["segs"]) + 1
        mkv = SALIDA / f"{s['base']}.parte{n:02d}.mkv"
        cmd, info = self.comando(s["rect"], mkv, s["gdigrab"])
        log = open(LOGS / f"{s['base']}.log", "a", encoding="utf-8", errors="replace")
        log.write(f"\n--- parte {n}\n" + " ".join(cmd) + "\n\n")
        log.flush()
        proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL,
                                stderr=log, creationflags=NO_WINDOW)
        seg = {"n": n, "mkv": mkv, "proc": proc, "log": log, "ini": time.monotonic(), "fin": None}
        s["segs"].append(seg)
        s["info"] = info
        self.estado_rec = "grabando"
        self.root.after(3500 if s["con_cam"] else 1500, lambda: self.verificar_arranque(seg))

    def verificar_arranque(self, seg):
        s = self.sesion
        if not s or seg not in s["segs"] or seg["proc"].poll() is None or seg["fin"] is not None:
            return
        # ffmpeg murio al arrancar
        seg["log"].close()
        s["segs"].remove(seg)
        try:
            seg["mkv"].unlink()
        except Exception:
            pass
        if not s["gdigrab"]:
            s["gdigrab"] = True  # reintenta con el capturador clasico
            self.iniciar_segmento()
            return
        log = LOGS / f"{s['base']}.log"
        if s["segs"]:
            self.estado_rec = "pausado"
            messagebox.showerror("Grabador", f"No se pudo reanudar. Lo grabado hasta ahora se conserva.\nLog: {log}")
            self.detener()
        else:
            self._fin_sesion()
            messagebox.showerror("Grabador", f"ffmpeg no pudo grabar. ¿La cámara está en uso por otra app?\nLog: {log}")

    def _cortar(self, seg):
        seg["fin"] = time.monotonic()
        try:
            seg["proc"].stdin.write(b"q")
            seg["proc"].stdin.flush()
            seg["proc"].stdin.close()
        except Exception:
            pass
        try:
            seg["proc"].wait(timeout=15)
        except subprocess.TimeoutExpired:
            seg["proc"].kill()
        seg["log"].close()

    def alternar_pausa(self):
        if self.estado_rec == "grabando":
            self._cortar(self.sesion["segs"][-1])
            self.estado_rec = "pausado"
            self.estado.config(text="En pausa", foreground="#b7791f")
        elif self.estado_rec == "pausado":
            self.estado_rec = "arrancando"
            self.iniciar_segmento()

    def marcar(self, nota=""):
        if self.estado_rec != "grabando":
            return
        seg = self.sesion["segs"][-1]
        self.sesion["marcas"].append({"seg": seg["n"], "t_rel": time.monotonic() - seg["ini"],
                                      "nota": (nota or "").strip()})
        self.nota.delete(0, "end")
        self.aviso = (f"⚑ {len(self.sesion['marcas'])}", time.monotonic())

    def segundos_grabados(self):
        if not self.sesion:
            return 0
        tot = 0.0
        for seg in self.sesion["segs"]:
            tot += (seg["fin"] or time.monotonic()) - seg["ini"]
        return tot

    def detener(self):
        if self.estado_rec not in ("grabando", "pausado"):
            return
        if self.estado_rec == "grabando":
            self._cortar(self.sesion["segs"][-1])
        s, self.sesion = self.sesion, None
        self.estado_rec = "guardando"
        if self.barra:
            self.barra.cerrar()
            self.barra = None
        self.btn.config(state="disabled")
        self.estado.config(text="Guardando…", foreground="#555")
        threading.Thread(target=self.finalizar, args=(s,), daemon=True).start()

    def finalizar(self, s):
        base = s["base"]
        mp4 = SALIDA / (f"{base}.m4a" if s["fuente"].get("tipo") == "audio" else f"{base}.mp4")
        partes = [g for g in s["segs"] if g["mkv"].exists()]
        offset = 0.0
        for g in partes:
            d = duracion(g["mkv"]) or 0.0
            # las marcas se miden desde que se lanzo ffmpeg; el video arranca un poco despues
            # (abrir micro/camara tarda), asi que se descuenta ese desfase
            g["dur"], g["offset"], g["desfase"] = d, offset, max(0.0, (g["fin"] - g["ini"]) - d)
            offset += d
        por_n = {g["n"]: g for g in partes}
        marcas = []
        for m in s["marcas"]:
            g = por_n.get(m["seg"])
            if g:
                t = g["offset"] + min(max(0.0, m["t_rel"] - g["desfase"]), g["dur"])
                marcas.append({"t": round(t, 2), "nota": m["nota"]})

        if len(partes) == 1:
            args = ["-i", str(partes[0]["mkv"])]
            lista = None
        else:
            lista = LOGS / f"{base}.concat.txt"
            lista.write_text("".join("file '{}'\n".format(str(g["mkv"]).replace("'", "'\\''"))
                                     for g in partes), encoding="utf-8")
            args = ["-f", "concat", "-safe", "0", "-i", str(lista)]
        ok = False
        if partes:
            r = subprocess.run([FFMPEG, "-hide_banner", "-y", *args, "-c", "copy",
                                "-movflags", "+faststart", str(mp4)],
                               capture_output=True, creationflags=NO_WINDOW)
            ok = r.returncode == 0 and mp4.exists()
        if ok:
            for g in partes:
                try:
                    g["mkv"].unlink()
                except Exception:
                    pass
            if lista:
                lista.unlink(missing_ok=True)
            final = mp4
        else:
            final = partes[0]["mkv"] if partes else None

        if final:
            meta = {"fuente": s["fuente"], **s.get("info", {}), "inicio": s["inicio"],
                    "archivo": final.name, "duracion_s": duracion(final),
                    "desfase_inicio_s": round(partes[0]["desfase"], 2),
                    "pausas": [round(g["offset"], 2) for g in partes[1:]],
                    "marcas": marcas, "version": 2}
            if not ok and len(partes) > 1:
                meta["partes_sin_unir"] = [g["mkv"].name for g in partes]
            (SALIDA / f"{base}.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
            self.cola.put(("guardado", final.name, meta["duracion_s"]))
        else:
            self.cola.put(("guardado", None, None))

    def _fin_sesion(self):
        self.sesion = None
        self.estado_rec = "listo"
        if self.barra:
            self.barra.cerrar()
            self.barra = None
        self.btn.config(text="●  Grabar  (Ctrl+Alt+R)", state="normal")
        self.root.deiconify()

    def tick(self):
        # pase lo que pase, el refresco sigue vivo (si no, la UI queda pegada en "Guardando…")
        try:
            self._tick()
        except Exception:
            import traceback
            with open(LOGS / "errores_ui.log", "a", encoding="utf-8") as f:
                f.write(datetime.now().isoformat() + "\n" + traceback.format_exc() + "\n")
        self.root.after(200, self.tick)

    def _tick(self):
        while not self.cola.empty():
            ev = self.cola.get()
            if ev == 1:
                self.alternar()
            elif ev == 2:
                self.marcar()
            elif ev == 3:
                self.alternar_pausa()
            elif isinstance(ev, tuple) and ev[0] == "guardado":
                self._fin_sesion()
                if ev[1]:
                    d = f"{ev[2]:.1f}s" if ev[2] else "?"
                    self.estado.config(text=f"Guardado: {ev[1]} ({d})", foreground="#1e7e34")
                else:
                    self.estado.config(text="No se guardó nada", foreground="#c0392b")
        if self.sesion and self.barra:
            seg = self.segundos_grabados()
            aviso = self.aviso[0] if time.monotonic() - self.aviso[1] < 1.5 else ""
            n = len(self.sesion["marcas"])
            estado = self.estado_rec
            ult = self.sesion["segs"][-1] if self.sesion["segs"] else None
            if estado == "grabando" and ult and not ult.get("vivo"):
                # ffmpeg escribe el archivo recien cuando le llegan los primeros frames
                try:
                    # stat() no ve el tamaño real mientras ffmpeg tiene el archivo abierto
                    with open(ult["mkv"], "rb") as fh:
                        ult["vivo"] = fh.seek(0, 2) > 2048
                except OSError:
                    pass
                if not ult.get("vivo"):
                    estado = "iniciando"
            self.barra.actualizar(estado, seg, n, aviso)
            mm, ss = divmod(int(seg), 60)
            txt = {"grabando": "● REC", "pausado": "⏸ PAUSA"}.get(self.estado_rec, "…")
            self.root.title(f"{txt} {mm:02d}:{ss:02d}")
            if self.estado_rec == "grabando":
                self.estado.config(text=f"Grabando {mm:02d}:{ss:02d}  ·  {n} marcas", foreground="#c0392b")
        else:
            self.root.title("Grabador")

    def cerrar(self):
        if self.estado_rec == "arrancando":
            self.root.after(300, self.cerrar)
            return
        if self.estado_rec in ("grabando", "pausado"):
            if not messagebox.askyesno("Grabador", "Hay una grabación en curso. ¿Detener y salir?"):
                return
            self.detener()
        if self.estado_rec == "guardando":
            self.root.after(300, self.cerrar)
            return
        self.root.destroy()


if __name__ == "__main__":
    root = tk.Tk()
    App(root)
    root.mainloop()
