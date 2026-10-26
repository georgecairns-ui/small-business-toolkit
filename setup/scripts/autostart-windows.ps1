# START THE TASK LIST WITH WINDOWS
# --------------------------------
# Makes the task list helper start whenever you sign in to Windows, so http://localhost:4747
# always works. Claude runs this with your permission:
#   powershell -ExecutionPolicy Bypass -File setup\scripts\autostart-windows.ps1
#   powershell -ExecutionPolicy Bypass -File setup\scripts\autostart-windows.ps1 -Remove     (to undo)

param([switch]$Remove)
$ErrorActionPreference = "Stop"
$name = "Task List OS"
$dir = Resolve-Path (Join-Path $PSScriptRoot "..\..")

if ($Remove) {
  Unregister-ScheduledTask -TaskName $name -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host "The task list will no longer start by itself."
  exit 0
}

$node = Get-Command node -ErrorAction SilentlyContinue
$python = Get-Command python -ErrorAction SilentlyContinue
if ($node) { $exe = $node.Source; $arg = "`"$dir\apps\server\server.js`"" }
elseif ($python) { $exe = $python.Source; $arg = "`"$dir\apps\server\server.py`"" }
else { Write-Error "Your task list needs Node or Python 3 on this computer, and neither was found."; exit 1 }

$action = New-ScheduledTaskAction -Execute $exe -Argument $arg -WorkingDirectory $dir
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet -Hidden -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings -Description "Runs your Task List OS at http://localhost:4747" -Force | Out-Null
Start-ScheduledTask -TaskName $name
Write-Host "Done. Your task list starts by itself from now on: http://localhost:4747"
