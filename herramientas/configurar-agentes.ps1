# Deja esta carpeta lista para las tres apps de agente: Claude, ChatGPT/Codex y Antigravity.
# Lo corre Instalar.bat. Se puede correr de nuevo si la carpeta se movió de lugar.
#
# 1. Skills: salen de los módulos encendidos (modulos/<id>/skills/) y se copian a las carpetas que
#    leen las apps: .agents/skills/ (Codex y Antigravity) y .claude/skills/ (Claude).
#    Lo hace herramientas/modulos.mjs sincronizar.
# 2. Editor de video (servidor MCP "video-editor"), con la ruta real de esta carpeta:
#    - Claude:      .mcp.json                 (ruta relativa, ya viene en la carpeta)
#    - Codex:       .codex/config.toml         (solo en carpetas de confianza)
#    - Antigravity: .agents/mcp_config.json

$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $PSScriptRoot
$editor = Join-Path $raiz "mcp-video"
$utf8 = New-Object System.Text.UTF8Encoding $false

# 1. Skills de los módulos encendidos
& node.exe (Join-Path $raiz "herramientas\modulos.mjs") sincronizar
if ($LASTEXITCODE -ne 0) { throw "No se pudieron preparar las skills de los módulos" }

# 2a. Codex: .codex/config.toml
function TomlTexto($s) { return '"' + $s.Replace('\', '\\').Replace('"', '\"') + '"' }
$codex = Join-Path $raiz ".codex"
New-Item -ItemType Directory -Force $codex | Out-Null
$toml = @"
# Editor de video para la app de ChatGPT / Codex. Lo escribe herramientas/configurar-agentes.ps1
# con la ruta de esta carpeta: si la mueves, abre Instalar.bat otra vez.
[mcp_servers.video-editor]
command = "uv"
args = ["run", "--directory", $(TomlTexto $editor), "--python", "3.12", "server.py"]
cwd = $(TomlTexto $raiz)
startup_timeout_sec = 60.0
tool_timeout_sec = 1800.0   # transcribir un video largo tarda más que el minuto por defecto

[mcp_servers.video-editor.env]
PYTHONIOENCODING = "utf-8"
"@
[System.IO.File]::WriteAllText((Join-Path $codex "config.toml"), $toml, $utf8)

# 2b. Antigravity: .agents/mcp_config.json
$ag = [ordered]@{
  mcpServers = [ordered]@{
    "video-editor" = [ordered]@{
      command = "uv"
      args = @("run", "--directory", $editor, "--python", "3.12", "server.py")
      env = [ordered]@{ PYTHONIOENCODING = "utf-8" }
    }
  }
}
[System.IO.File]::WriteAllText((Join-Path $raiz ".agents\mcp_config.json"), ($ag | ConvertTo-Json -Depth 6), $utf8)

Write-Host "   editor de video configurado para Claude, ChatGPT/Codex y Antigravity"
