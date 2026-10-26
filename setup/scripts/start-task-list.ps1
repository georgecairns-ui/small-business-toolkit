# START THE TASK LIST (Windows)
# -----------------------------
# Starts the little helper that runs your task list at http://localhost:4747, unless it's already
# running, then prints the link. Claude runs this for you:
#   powershell -ExecutionPolicy Bypass -File setup\scripts\start-task-list.ps1
# Uses Node if the computer has it, otherwise Python 3.

$ErrorActionPreference = "Stop"
$dir = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$port = if ($env:TLOS_PORT) { $env:TLOS_PORT } else { "4747" }
$url = "http://localhost:$port"

function Test-Alive { try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 "http://127.0.0.1:$port/api/alive.js" | Out-Null; $true } catch { $false } }

if (Test-Alive) { Write-Host "Your task list is running: $url"; exit 0 }

$node = Get-Command node -ErrorAction SilentlyContinue
$python = Get-Command python -ErrorAction SilentlyContinue
if ($node) { Start-Process -WindowStyle Hidden -FilePath $node.Source -ArgumentList "`"$dir\apps\server\server.js`"" }
elseif ($python) { Start-Process -WindowStyle Hidden -FilePath $python.Source -ArgumentList "`"$dir\apps\server\server.py`"" }
else { Write-Error "Your task list needs Node or Python 3 on this computer, and neither was found. Claude can help install Node from https://nodejs.org (the LTS version)."; exit 1 }

for ($i = 0; $i -lt 20; $i++) { Start-Sleep -Milliseconds 250; if (Test-Alive) { Write-Host "Your task list is running: $url"; exit 0 } }
Write-Error "The task list didn't start."
exit 1
