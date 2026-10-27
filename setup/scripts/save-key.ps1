# SAVE A KEY (Windows)
# --------------------
# Saves a key for one of your apps (for example your Fireflies API key) for your Windows account,
# so Claude Code can use it, without the key ever appearing in a chat or in this folder.
#
# How to use it: open PowerShell in this folder and run, for example:
#   powershell -ExecutionPolicy Bypass -File setup\scripts\save-key.ps1 FIREFLIES_API_KEY
# Then paste your key when asked and press Enter. Nothing shows while you paste; that's normal.
#
# It saves the key as an environment variable for your Windows user only.
# Afterwards: close PowerShell and Claude Code, then open them again so they pick it up.

param([Parameter(Mandatory = $true)][string]$Name)

if ($Name -cnotmatch '^[A-Z][A-Z0-9_]*$') {
  Write-Error "Please give the name of the key in capitals, for example: FIREFLIES_API_KEY"
  exit 1
}

$secure = Read-Host "Paste your key for $Name, then press Enter (it won't show on screen)" -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $key = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr).Trim()
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
}

if ([string]::IsNullOrWhiteSpace($key)) {
  Write-Error "No key was pasted, so nothing was saved. Run the command again when you have it."
  exit 1
}

[Environment]::SetEnvironmentVariable($Name, $key, "User")
Remove-Variable key

Write-Host "Saved $Name for your Windows account."
Write-Host "Next: close PowerShell and Claude, then open them again so they can see it."
