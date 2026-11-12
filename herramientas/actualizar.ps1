# Actualiza el sistema de videos a la última versión publicada, sin tocar mis-videos/.
# Se abre con doble clic en "Actualizar.bat".
#
# 1. Lee la versión instalada (sistema.json) y la última publicada en GitHub (Releases del repositorio).
# 2. Muestra qué trae y pregunta.
# 3. Descarga el zip y su huella SHA-256 (archivo .sha256 publicado junto al zip) y la comprueba.
# 4. Guarda un respaldo del sistema actual en .respaldos/ y reemplaza los archivos del sistema.
#    mis-videos/ (tus marcas, videos y grabaciones) y la configuración de tu computador no se tocan.
# 5. Revisa la instalación (instala lo que falte) y vuelve a configurar las apps.
#
# Para probar sin internet: -Desde <ruta al zip> (busca <zip>.sha256 al lado).

param([string]$Desde = "", [switch]$SinPreguntar)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
$raiz = Split-Path -Parent $PSScriptRoot
if ($env:SISTEMA_RAIZ) { $raiz = $env:SISTEMA_RAIZ.TrimEnd('\') }  # Actualizar.bat corre una copia de este script desde TEMP
function Titulo($t) { Write-Host ""; Write-Host "== $t" -ForegroundColor Cyan }
function Ok($t) { Write-Host "   listo: $t" -ForegroundColor Green }
function Falla($t) { Write-Host ""; Write-Host $t -ForegroundColor Red; exit 1 }
# Windows 10 con PowerShell 5.1 puede no ofrecer TLS 1.2, que GitHub exige.
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

# Última versión sin la API de GitHub: la página pública "releases/latest" redirige a la etiqueta de la versión;
# el zip y su huella se bajan de sus direcciones públicas, y las notas salen del CHANGELOG.md de esa etiqueta.
function UltimaSinApi($repo, $archivo) {
  $req = [Net.HttpWebRequest]::Create("https://github.com/$repo/releases/latest")
  $req.Method = "HEAD"; $req.AllowAutoRedirect = $false; $req.UserAgent = "sistema-de-videos"; $req.Timeout = 20000
  $res = $req.GetResponse()
  try { $destino = [string]$res.Headers["Location"] } finally { $res.Close() }
  if ($destino -notmatch "/releases/tag/(v\d+\.\d+\.\d+)$") { throw "no encontré una versión publicada" }
  $tag = $Matches[1]
  $notas = "(No pude leer las notas de esta versión. Están en CHANGELOG.md.)"
  try {
    $cl = Join-Path $tmp "changelog.md"
    Invoke-WebRequest -UseBasicParsing -UserAgent "sistema-de-videos" "https://raw.githubusercontent.com/$repo/$tag/CHANGELOG.md" -OutFile $cl
    $texto = Get-Content $cl -Raw -Encoding UTF8
    $v = [regex]::Escape($tag.Substring(1))
    if ($texto -match "(?ms)^## $v [^\n]*\n(.*?)(?=^## |\z)") { $notas = $Matches[1].Trim() }
  } catch { }
  $base = "https://github.com/$repo/releases/download/$tag"
  [pscustomobject]@{ tag_name = $tag; body = $notas; assets = @(
    [pscustomobject]@{ name = $archivo; browser_download_url = "$base/$archivo" },
    [pscustomobject]@{ name = "$archivo.sha256"; browser_download_url = "$base/$archivo.sha256" }) }
}

$info = Get-Content (Join-Path $raiz "sistema.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$actual = [version]$info.version
Write-Host "Sistema de videos: actualizar" -ForegroundColor White
Write-Host "Versión instalada: $actual"

$tmp = Join-Path $env:TEMP ("sistema-videos-act-" + [guid]::NewGuid().ToString("N").Substring(0, 8))
New-Item -ItemType Directory -Force $tmp | Out-Null
$zip = Join-Path $tmp "sistema.zip"

if ($Desde) {
  if (-not (Test-Path $Desde)) { Falla "No encuentro $Desde" }
  Copy-Item $Desde $zip
  $sumaArchivo = "$Desde.sha256"
  if (-not (Test-Path $sumaArchivo)) { Falla "Falta $sumaArchivo (la huella SHA-256). Sin huella no se actualiza." }
  $esperada = ((Get-Content $sumaArchivo -Raw) -split "\s+")[0].Trim().ToLower()
  $notas = "(actualización desde un archivo local)"
  $nueva = $null
} else {
  if (-not $info.repositorio) { Write-Host ""; Write-Host "Todavía no hay un repositorio configurado para buscar actualizaciones (sistema.json)." -ForegroundColor Yellow; exit 0 }
  Titulo "Buscando la última versión"
  $cab = @{ "User-Agent" = "sistema-de-videos" }
  try { $rel = Invoke-RestMethod -UseBasicParsing -Headers @{ "User-Agent" = "sistema-de-videos"; "Accept" = "application/vnd.github+json" } "https://api.github.com/repos/$($info.repositorio)/releases/latest" }
  catch {
    # Sin cuenta, la API de GitHub permite 60 consultas por hora por dirección de internet, y muchos proveedores
    # comparten una dirección entre sus clientes. Si se pasó el límite (o la API falla), se usa la página pública.
    try { $rel = UltimaSinApi $info.repositorio $info.archivo }
    catch { Falla "No pude consultar GitHub ($($_.Exception.Message)). Revisa tu internet y vuelve a intentarlo." }
  }
  $nueva = [version]($rel.tag_name -replace "^v", "")
  if ($nueva -le $actual) { Write-Host ""; Write-Host "Estás al día (versión $actual)." -ForegroundColor Green; exit 0 }
  $assetZip = $rel.assets | Where-Object { $_.name -eq $info.archivo } | Select-Object -First 1
  $assetSuma = $rel.assets | Where-Object { $_.name -eq "$($info.archivo).sha256" } | Select-Object -First 1
  if (-not $assetZip -or -not $assetSuma) { Falla "La versión $nueva no trae el zip y su huella SHA-256. No se actualiza." }
  $notas = $rel.body
  try { Invoke-WebRequest -UseBasicParsing -Headers $cab $assetSuma.browser_download_url -OutFile (Join-Path $tmp "suma.txt") }
  catch { Falla "No pude bajar la huella SHA-256 de la versión $nueva ($($_.Exception.Message)). No se actualizó nada." }
  $esperada = ((Get-Content (Join-Path $tmp "suma.txt") -Raw) -split "\s+")[0].Trim().ToLower()
}

Write-Host ""
if ($nueva) { Write-Host "Versión nueva: $nueva" -ForegroundColor White }
Write-Host $notas
Write-Host ""
Write-Host "Tus marcas, videos, grabaciones y lo que subiste (mis-videos/) NO se tocan." -ForegroundColor Green
if (-not $SinPreguntar) {
  $r = Read-Host "¿Actualizar ahora? Escribe S y Enter (o solo Enter para cancelar)"
  if ($r.Trim().ToUpper() -ne "S") { Write-Host "No se actualizó nada."; exit 0 }
}

if (-not $Desde) {
  Titulo "Descargando"
  try { Invoke-WebRequest -UseBasicParsing -Headers $cab $assetZip.browser_download_url -OutFile $zip }
  catch { Falla "No pude bajar la versión $nueva ($($_.Exception.Message)). Revisa tu internet y vuelve a intentarlo. No se actualizó nada." }
}

Titulo "Comprobando la huella SHA-256"
$real = (Get-FileHash $zip -Algorithm SHA256).Hash.ToLower()
if ($real -ne $esperada) { Falla "La huella no coincide: el archivo no es el publicado o se dañó al bajar. No se actualizó nada." }
Ok "coincide"

Titulo "Preparando la versión nueva"
$ext = Join-Path $tmp "ext"
Expand-Archive $zip -DestinationPath $ext -Force
$nuevoSis = Get-ChildItem $ext -Recurse -Filter "sistema.json" -Depth 1 | Select-Object -First 1
if (-not $nuevoSis) { Falla "El zip no tiene sistema.json: no parece una versión del sistema." }
$origen = $nuevoSis.DirectoryName
if (Test-Path (Join-Path $origen "mis-videos\marcas\*\ficha.md")) { Falla "El zip trae datos de marcas dentro de mis-videos: no se usa para no mezclarlos con los tuyos." }
Ok "versión $(((Get-Content (Join-Path $origen 'sistema.json') -Raw -Encoding UTF8 | ConvertFrom-Json).version))"

# Lo que nunca se reemplaza ni se borra (rutas relativas a la carpeta del sistema): tus datos,
# respaldos, entornos instalados y la configuración de este computador.
# OJO: no se usa robocopy /MIR. Su exclusión /XD no protege una carpeta del destino si la versión nueva
# trae una carpeta con el mismo nombre (la deja igual a la nueva, vacía). Por eso: se copia sin borrar y
# después se borran, uno por uno, solo los archivos viejos del sistema que fuera de estas rutas ya no existen.
$protegidas = @("mis-videos", ".respaldos", "mcp-video\.venv", ".agents\skills", ".claude\skills", ".git", "node_modules",
  ".codex\config.toml", ".agents\mcp_config.json", "grabador\config.json", ".claude\settings.local.json")
function EsProtegida($rel) {
  # Los entornos de Python de los módulos (por ejemplo modulos\referencias\entorno\.venv) se generan en cada computador
  if ($rel -match '(^|\\)\.venv(\\|$)') { return $true }
  foreach ($p in $protegidas) { if ($rel -ieq $p -or $rel.StartsWith($p + "\", [StringComparison]::OrdinalIgnoreCase)) { return $true } }
  return $false
}
function ArchivosDelSistema($base) {
  # Archivos bajo $base fuera de las rutas protegidas (sin entrar en ellas), como rutas relativas
  $out = New-Object System.Collections.Generic.List[string]
  $pila = New-Object System.Collections.Stack; $pila.Push($base)
  while ($pila.Count) {
    $dir = $pila.Pop()
    foreach ($e in Get-ChildItem -LiteralPath $dir -Force) {
      $rel = $e.FullName.Substring($base.Length + 1)
      if (EsProtegida $rel) { continue }
      if ($e.PSIsContainer) { $pila.Push($e.FullName) } else { $out.Add($rel) }
    }
  }
  return $out
}

# La versión nueva no debe traer nada que vaya en una ruta protegida: se quita antes de copiar
foreach ($p in $protegidas) { $x = Join-Path $origen $p; if (Test-Path -LiteralPath $x) { Remove-Item -LiteralPath $x -Recurse -Force } }

Titulo "Respaldo del sistema actual"
$respaldo = Join-Path $raiz (".respaldos\sistema-$actual-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
$viejos = ArchivosDelSistema $raiz
foreach ($rel in $viejos) {
  $dest = Join-Path $respaldo $rel
  New-Item -ItemType Directory -Force (Split-Path $dest) | Out-Null
  Copy-Item -LiteralPath (Join-Path $raiz $rel) $dest -Force
}
Ok ("$($viejos.Count) archivos en " + $respaldo.Substring($raiz.Length + 1))

Titulo "Reemplazando los archivos del sistema"
$nuevos = ArchivosDelSistema $origen
$enNueva = New-Object System.Collections.Generic.HashSet[string]([StringComparer]::OrdinalIgnoreCase)
foreach ($rel in $nuevos) { [void]$enNueva.Add($rel) }
try {
  foreach ($rel in $nuevos) {
    $dest = Join-Path $raiz $rel
    New-Item -ItemType Directory -Force (Split-Path $dest) | Out-Null
    Copy-Item -LiteralPath (Join-Path $origen $rel) $dest -Force
  }
  $quitados = 0
  foreach ($rel in $viejos) {
    if (-not $enNueva.Contains($rel) -and -not (EsProtegida $rel)) { Remove-Item -LiteralPath (Join-Path $raiz $rel) -Force; $quitados++ }
  }
} catch {
  Write-Host "   algo falló ($($_.Exception.Message)): restaurando el respaldo..." -ForegroundColor Yellow
  foreach ($rel in $viejos) { Copy-Item -LiteralPath (Join-Path $respaldo $rel) (Join-Path $raiz $rel) -Force -ErrorAction SilentlyContinue }
  Falla "No se pudo actualizar. Se dejó el sistema como estaba."
}
Ok "$($nuevos.Count) archivos actualizados, $quitados que ya no se usan retirados (quedan en el respaldo)"
Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue

Titulo "Revisando la instalación"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $raiz "herramientas\instalar.ps1") -SinPreguntas
Write-Host ""
Write-Host "Actualizado. Si tu app de agente estaba abierta, empieza una conversación nueva para que vea los cambios." -ForegroundColor Green
Write-Host "El respaldo del sistema anterior quedó en $($respaldo.Substring($raiz.Length + 1)). Se puede borrar cuando todo funcione."
