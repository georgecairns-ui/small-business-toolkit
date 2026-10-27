# START THE APP WITH WINDOWS
# --------------------------
# Makes the helper that runs your app start whenever you sign in to Windows, so http://localhost:4747
# always works. The scheduled task is named after the folder's own name, from toolkit.json.
# Claude runs this with your permission:
#   powershell -ExecutionPolicy Bypass -File setup\scripts\autostart-windows.ps1
#   powershell -ExecutionPolicy Bypass -File setup\scripts\autostart-windows.ps1 -Remove     (to undo)

param([switch]$Remove)
$ErrorActionPreference = "Stop"
$dir = Resolve-Path (Join-Path $PSScriptRoot "..\..")

# The folder's name: "name" in toolkit.json, else the first tool's in apps/installed.json
$name = $null
try { $name = (Get-Content -Raw -Encoding UTF8 (Join-Path $dir "toolkit.json") | ConvertFrom-Json).name } catch { }
if (-not $name) { try { $name = (Get-Content -Raw -Encoding UTF8 (Join-Path $dir "apps\installed.json") | ConvertFrom-Json).tools[0].name } catch { } }
if (-not $name) { $name = "Your toolkit" }

# A task made by an earlier copy of these scripts under another name, for this same folder, would fight for the port
function Remove-OldTasks {
  Get-ScheduledTask -ErrorAction SilentlyContinue | Where-Object { $_.TaskName -ne $name -and ($_.Actions | Where-Object { $_.Arguments -like "*$dir\apps\server\*" }) } |
    ForEach-Object { Unregister-ScheduledTask -TaskName $_.TaskName -TaskPath $_.TaskPath -Confirm:$false }
}

if ($Remove) {
  Remove-OldTasks
  Unregister-ScheduledTask -TaskName $name -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host "$name will no longer start by itself."
  exit 0
}

$node = Get-Command node -ErrorAction SilentlyContinue
$python = Get-Command python -ErrorAction SilentlyContinue
if ($node) { $exe = $node.Source; $arg = "`"$dir\apps\server\server.js`"" }
elseif ($python) { $exe = $python.Source; $arg = "`"$dir\apps\server\server.py`"" }
else { Write-Error "$name needs Node or Python 3 on this computer, and neither was found."; exit 1 }

Remove-OldTasks

$action = New-ScheduledTaskAction -Execute $exe -Argument $arg -WorkingDirectory $dir
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet -Hidden -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings -Description "Runs $name at http://localhost:4747" -Force | Out-Null
Start-ScheduledTask -TaskName $name
Write-Host "Done. $name starts by itself from now on: http://localhost:4747"
