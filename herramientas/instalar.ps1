# Instala lo que necesita el sistema de videos en Windows 10/11.
# Se abre con doble clic en "Instalar.bat". Se puede correr las veces que quieras:
# lo que ya está instalado se salta. Al final muestra un resumen pieza por pieza.
#
# Pregunta con qué app va a conversar la persona (Claude, ChatGPT/Codex o Antigravity) y la instala.
# Instala (con winget, el instalador de Windows): Git, Node.js LTS, FFmpeg y uv (Python).
# Después: Python 3.12, Whisper (transcribir voz), HyperFrames y sus skills (para las tres apps),
# el programa de HeyGen (catálogo de música), el editor de video y la configuración de la carpeta
# para las tres apps (herramientas/configurar-agentes.ps1). Claude Code de consola solo si eligió Claude.

# -SinPreguntas: no pregunta por la app (lo usa Actualizar.bat para revisar la instalación).
param([switch]$SinPreguntas)

# Versiones fijas: se instala siempre lo mismo que se probó, nunca "la última" que haya en internet.
# Para actualizarlas, ver SEGURIDAD.md ("Versiones fijas y cómo actualizarlas").
$VERSION_HYPERFRAMES = "hyperframes@0.9.30"
$VERSION_WHISPER = "openai-whisper==20250625"

$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"  # la barra de progreso de PowerShell hace lentísimas las descargas
$raiz = Split-Path -Parent $PSScriptRoot
Set-Location $raiz

function Titulo($t) { Write-Host ""; Write-Host "== $t" -ForegroundColor Cyan }
function Ok($t) { Write-Host "   listo: $t" -ForegroundColor Green }
function Aviso($t) { Write-Host "   ojo: $t" -ForegroundColor Yellow }
function Tiene($cmd) { return [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }
function RecargarRuta {
  $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
}

# Resumen final: pieza, si quedó, si es imprescindible y qué hacer si falló (una frase)
$resumen = New-Object System.Collections.ArrayList
function Marcar($pieza, $quedo, $siFalla, $imprescindible = $true) {
  [void]$resumen.Add([pscustomobject]@{ Pieza = $pieza; Quedo = [bool]$quedo; SiFalla = $siFalla; Imprescindible = $imprescindible })
}

Write-Host "Sistema de videos con IA: instalación" -ForegroundColor White
Write-Host "Puede tardar entre 10 y 30 minutos la primera vez. No cierres esta ventana."

if (-not (Tiene "winget")) {
  Write-Host ""
  Write-Host "Falta 'winget' (Instalador de aplicaciones de Microsoft)." -ForegroundColor Red
  Write-Host "Ábrelo desde Microsoft Store: busca 'Instalador de aplicaciones', actualízalo y vuelve a abrir Instalar.bat."
  exit 1
}

# ¿Con qué app va a conversar con el agente?
$apps = @{
  "1" = @{ nombre = "Claude";      id = "Anthropic.Claude";   fuente = "winget";  web = "claude.ai/download";
           pasos = @("Abre la app de Claude e inicia sesión (plan Pro o superior).", "Entra a la pestaña 'Code'.", "Elige esta carpeta como proyecto.") };
  "2" = @{ nombre = "ChatGPT (Codex)"; id = "9PLM9XGG6VKS";   fuente = "msstore"; web = "chatgpt.com/download";
           pasos = @("Abre la app de ChatGPT e inicia sesión.", "Entra a Codex y toca 'Add new project' (o Ctrl+O).", "Elige esta carpeta y, si pregunta, márcala como de confianza.") };
  "3" = @{ nombre = "Antigravity";  id = "Google.Antigravity"; fuente = "winget";  web = "antigravity.google/download";
           pasos = @("Abre Antigravity e inicia sesión con tu cuenta de Google.", "Abre esta carpeta como espacio de trabajo (workspace).", "Si pregunta si confías en la carpeta, di que sí.") }
}
Write-Host ""
Write-Host "¿Con qué app vas a conversar con el agente?" -ForegroundColor White
Write-Host "  1. Claude          (con la que está probado el sistema)"
Write-Host "  2. ChatGPT (Codex)"
Write-Host "  3. Antigravity     (de Google)"
Write-Host "  4. Ya tengo una instalada, no instales ninguna"
if ($SinPreguntas) { $eleccion = "4"; Write-Host "  (revisión sin preguntas: no se instala ninguna app)" }
else { $eleccion = (Read-Host "Escribe el número y Enter (solo Enter = 1)").Trim() }
if ($eleccion -eq "") { $eleccion = "1" }
$app = $apps[$eleccion]

$reabrir = "Cierra esta ventana y vuelve a abrir Instalar.bat."
$paquetes = @(
  @{ id = "Git.Git";           cmd = "git";    nombre = "Git";     para = "lo usa Claude Code en Windows" },
  @{ id = "OpenJS.NodeJS.LTS"; cmd = "node";   nombre = "Node.js"; para = "corre HyperFrames" },
  @{ id = "Gyan.FFmpeg";       cmd = "ffmpeg"; nombre = "FFmpeg";  para = "corta y convierte video" },
  @{ id = "astral-sh.uv";      cmd = "uv";     nombre = "uv";      para = "instala Python y sus paquetes" }
)
foreach ($p in $paquetes) {
  Titulo "$($p.nombre) ($($p.para))"
  if (Tiene $p.cmd) { Ok "ya estaba" }
  else {
    winget install --id $p.id --exact --silent --accept-package-agreements --accept-source-agreements
    RecargarRuta
    if (Tiene $p.cmd) { Ok "instalado" } else { Aviso "se instaló pero esta ventana no lo ve todavía." }
  }
  Marcar $p.nombre (Tiene $p.cmd) $reabrir
}

if ($app) {
  Titulo "App $($app.nombre) (donde vas a conversar con el agente)"
  winget list --id $app.id --exact --accept-source-agreements *> $null
  $tieneApp = ($LASTEXITCODE -eq 0)
  if ($tieneApp) { Ok "ya estaba" }
  else {
    if ($app.fuente -eq "msstore") {
      winget install --id $app.id --source msstore --silent --accept-package-agreements --accept-source-agreements
    } else {
      winget install --id $app.id --exact --silent --accept-package-agreements --accept-source-agreements
    }
    winget list --id $app.id --exact --accept-source-agreements *> $null
    $tieneApp = ($LASTEXITCODE -eq 0)
    if ($tieneApp) { Ok "instalada" } else { Aviso "no se pudo instalar sola." }
  }
  Marcar "App $($app.nombre)" $tieneApp "Descárgala desde $($app.web) e instálala."
}

Titulo "Python 3.12 (para el editor y el grabador)"
$py = $false
if (Tiene "uv") {
  uv python install 3.12
  uv python find 3.12 *> $null
  $py = ($LASTEXITCODE -eq 0)
}
if ($py) { Ok "Python listo" } else { Aviso "no quedó instalado." }
Marcar "Python 3.12" $py $reabrir

if ($eleccion -eq "1") {
  Titulo "Claude Code en la consola (opcional: para Empezar.bat)"
  if (Tiene "claude") { Ok "ya estaba" }
  else {
    # Con winget (paquete de Anthropic PBC), no con un script descargado y ejecutado a ciegas
    winget install --id Anthropic.ClaudeCode --exact --silent --accept-package-agreements --accept-source-agreements
    RecargarRuta
    if (Tiene "claude") { Ok "instalado" } else { Aviso "no quedó instalado. No importa: usas la app de Claude." }
  }
  Marcar "Claude Code (consola)" (Tiene "claude") "No hace falta si usas la app de Claude." $false
}

Titulo "Whisper (pasa la voz a texto)"
$whisperExe = Join-Path $env:USERPROFILE ".local\bin\whisper.exe"
if ((Tiene "whisper") -or (Test-Path $whisperExe)) { Ok "ya estaba" }
elseif (Tiene "uv") {
  uv tool install $VERSION_WHISPER --python 3.12
  uv tool update-shell
  RecargarRuta
  if ((Tiene "whisper") -or (Test-Path $whisperExe)) { Ok "instalado (la primera transcripción descarga el modelo, unos 1,5 GB)" } else { Aviso "revisa el mensaje de arriba" }
}
Marcar "Whisper" ((Tiene "whisper") -or (Test-Path $whisperExe)) $reabrir

Titulo "HyperFrames (hace los videos) y sus skills"
$hf = $false
if (Tiene "npx.cmd") {
  npx.cmd --yes $VERSION_HYPERFRAMES skills
  npx.cmd --yes $VERSION_HYPERFRAMES --version *> $null
  $hf = ($LASTEXITCODE -eq 0)
  if ($hf) { Ok "listo" } else { Aviso "revisa el mensaje de arriba" }
} else { Aviso "falta Node.js" }
Marcar "HyperFrames" $hf $reabrir

# La app de Antigravity lee las skills globales de ~/.gemini/config/skills, pero HyperFrames las deja
# en la carpeta del IDE (~/.gemini/antigravity/skills). Se copian una por una, sin tocar otras skills.
$agIde = Join-Path $env:USERPROFILE ".gemini\antigravity\skills"
$agApp = Join-Path $env:USERPROFILE ".gemini\config\skills"
if (Test-Path $agIde) {
  New-Item -ItemType Directory -Force $agApp | Out-Null
  foreach ($s in Get-ChildItem $agIde -Directory) {
    robocopy $s.FullName (Join-Path $agApp $s.Name) /MIR /NJH /NJS /NFL /NDL /NP | Out-Null
  }
  Ok "skills de HyperFrames también para la app de Antigravity"
}

Titulo "HeyGen (catálogo de música gratis de HyperFrames)"
if (Tiene "heygen") { Ok "ya estaba" }
else {
  try {
    $cdn = "https://static.heygen.ai/cli"
    $tag = (Invoke-RestMethod "$cdn/stable").Trim()
    $zip = "heygen_${tag}_windows_amd64.zip"
    $tmp = Join-Path $env:TEMP "heygen-cli"
    New-Item -ItemType Directory -Force $tmp | Out-Null
    Invoke-WebRequest -UseBasicParsing "$cdn/releases/$tag/$zip" -OutFile (Join-Path $tmp $zip)
    $sumas = (Invoke-WebRequest -UseBasicParsing "$cdn/releases/$tag/checksums.txt").Content
    $esperada = ($sumas -split "`n" | Where-Object { $_ -match [regex]::Escape($zip) }) -replace "\s.*$", ""
    $real = (Get-FileHash (Join-Path $tmp $zip) -Algorithm SHA256).Hash.ToLower()
    if ($esperada.Trim().ToLower() -ne $real) { throw "la suma de verificación no coincide" }
    Expand-Archive (Join-Path $tmp $zip) -DestinationPath $tmp -Force
    $bin = Join-Path $env:USERPROFILE ".local\bin"
    New-Item -ItemType Directory -Force $bin | Out-Null
    Copy-Item (Join-Path $tmp "heygen.exe") $bin -Force
    $rutaUsuario = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($rutaUsuario -notlike "*$bin*") { [Environment]::SetEnvironmentVariable("Path", "$rutaUsuario;$bin", "User") }
    RecargarRuta
    Ok "instalado ($tag, verificado)"
  } catch { Aviso "no se pudo instalar ($_)." }
}
Marcar "HeyGen (música)" (Tiene "heygen") "Sin esto igual hay música: la de recursos/musica/." $false

Titulo "Editor de video (servidor MCP)"
$editor = $false
if (Tiene "uv") {
  uv sync --directory mcp-video --python 3.12
  $editor = ($LASTEXITCODE -eq 0)
}
if ($editor) { Ok "listo" } else { Aviso "revisa el mensaje de arriba" }
Marcar "Editor de video" $editor $reabrir

Titulo "Dejar la carpeta lista para Claude, ChatGPT (Codex) y Antigravity"
$apps3 = $false
try { & (Join-Path $PSScriptRoot "configurar-agentes.ps1"); $apps3 = $true } catch { Aviso "$_" }
Marcar "Skills y editor en las apps" $apps3 $reabrir

# ---------------------------------------------------------------- resumen
Write-Host ""
Write-Host "================ Resumen ================" -ForegroundColor White
foreach ($r in $resumen) {
  if ($r.Quedo) { Write-Host ("  OK     " + $r.Pieza) -ForegroundColor Green }
  elseif ($r.Imprescindible) { Write-Host ("  FALTA  " + $r.Pieza + ": " + $r.SiFalla) -ForegroundColor Red }
  else { Write-Host ("  (no)   " + $r.Pieza + ": " + $r.SiFalla) -ForegroundColor Yellow }
}
$faltan = @($resumen | Where-Object { -not $_.Quedo -and $_.Imprescindible })

# Resumen para el panel (Primeros pasos y Mantenimiento). Queda en mis-videos/: Actualizar no lo toca.
try {
  $archivoEstado = Join-Path $raiz "mis-videos\.instalacion.json"
  $appNombre = $null
  if ($app) { $appNombre = ($app.nombre -replace "\s*\(Codex\)", "") }
  elseif (Test-Path $archivoEstado) { try { $appNombre = (Get-Content $archivoEstado -Raw -Encoding UTF8 | ConvertFrom-Json).app } catch {} }
  $estadoInst = [ordered]@{
    fecha = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss"); app = $appNombre
    piezas = @($resumen | ForEach-Object { [ordered]@{ pieza = $_.Pieza; quedo = $_.Quedo; imprescindible = $_.Imprescindible; siFalla = $_.SiFalla } })
  }
  New-Item -ItemType Directory -Force (Split-Path $archivoEstado) | Out-Null
  [IO.File]::WriteAllText($archivoEstado, ($estadoInst | ConvertTo-Json -Depth 4), (New-Object Text.UTF8Encoding $false))
} catch { Aviso "no pude guardar el resumen para el panel ($_)" }

Write-Host ""
if ($faltan.Count -gt 0) {
  Write-Host "Faltan piezas. Casi siempre se arregla cerrando esta ventana y abriendo Instalar.bat otra vez." -ForegroundColor Red
  Write-Host "Si sigue igual, reinicia el computador y vuelve a abrirlo."
} else {
  try { Set-Clipboard -Value $raiz } catch {}
  Write-Host "Todo listo." -ForegroundColor Green
  Write-Host ""
  Write-Host "Siguiente paso:"
  $pasos = if ($app) { $app.pasos } else { @("Abre tu app de agente (Claude, ChatGPT/Codex o Antigravity).", "Abre esta carpeta como proyecto.") }
  $i = 1
  foreach ($paso in $pasos) { Write-Host "  $i. $paso"; $i++ }
  Write-Host "     La carpeta es esta (ya copié la ruta: si te la piden, pégala con Ctrl+V):"
  Write-Host "     $raiz" -ForegroundColor Cyan
  Write-Host "  $i. Escribe: Hola, quiero empezar"
  Write-Host ""
  Write-Host "La primera vez la app te pide permiso para usar el editor de video de esta carpeta: elige Permitir."
  Write-Host ""
  Write-Host "Para la música gratis del catálogo: doble clic en Conectar-musica.bat (una sola vez)."
  Write-Host ""
  Write-Host "Para seguir los primeros pasos, revisar tu marca, subir archivos o actualizar: doble clic en Panel.bat."
}
