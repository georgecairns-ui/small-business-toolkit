# START THE APP (Windows)
# -----------------------
# Starts the little helper that runs your app at http://localhost:4747, unless it's already
# running, then prints the link. Claude runs this for you:
#   powershell -ExecutionPolicy Bypass -File setup\scripts\start-toolkit.ps1
# Uses Node if the computer has it, otherwise Python 3. The name in the messages is the folder's
# own name, from toolkit.json.

$ErrorActionPreference = "Stop"
$dir = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$port = if ($env:TLOS_PORT) { $env:TLOS_PORT } else { "4747" }
$url = "http://localhost:$port"

# The folder's name: "name" in toolkit.json, else the first tool's in apps/installed.json
$name = $null
try { $name = (Get-Content -Raw -Encoding UTF8 (Join-Path $dir "toolkit.json") | ConvertFrom-Json).name } catch { }
if (-not $name) { try { $name = (Get-Content -Raw -Encoding UTF8 (Join-Path $dir "apps\installed.json") | ConvertFrom-Json).tools[0].name } catch { } }
if (-not $name) { $name = "Your toolkit" }

function Test-Alive { try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 "http://127.0.0.1:$port/api/alive.js" | Out-Null; $true } catch { $false } }

if (Test-Alive) { Write-Host "$name is running: $url"; exit 0 }

$node = Get-Command node -ErrorAction SilentlyContinue
$python = Get-Command python -ErrorAction SilentlyContinue
if ($node) { Start-Process -WindowStyle Hidden -FilePath $node.Source -ArgumentList "`"$dir\apps\server\server.js`"" }
elseif ($python) { Start-Process -WindowStyle Hidden -FilePath $python.Source -ArgumentList "`"$dir\apps\server\server.py`"" }
else { Write-Error "$name needs Node or Python 3 on this computer, and neither was found. Claude can help install Node from https://nodejs.org (the LTS version)."; exit 1 }

for ($i = 0; $i -lt 20; $i++) { Start-Sleep -Milliseconds 250; if (Test-Alive) { Write-Host "$name is running: $url"; exit 0 } }
Write-Error "$name didn't start."
exit 1
