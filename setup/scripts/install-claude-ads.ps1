# INSTALL CLAUDE ADS (Windows)
# ----------------------------
# Adds the claude-ads skills to this folder, for Ads OS to use when it plans and builds campaigns.
# Claude runs this for you during setup; you never need to.
#   powershell -ExecutionPolicy Bypass -File setup\scripts\install-claude-ads.ps1
#
# What it does:
#   1. Fetches George's copy of claude-ads at one fixed, tested version (tag v2.0.1) into a
#      temporary folder outside this folder, with git, or as a zip download if git isn't installed.
#   2. Checks it is exactly the tested commit. If not, it stops and installs nothing.
#   3. Runs claude-ads' own installer, skills and agents only (no Python packages), into this
#      folder's .claude\skills and .claude\agents. Nothing is installed anywhere else.
#   4. Copies the MIT licence and third-party notices in beside it, and writes a note saying where it came from.
#   5. Removes its temporary folder.
#
# claude-ads is by AgriciDaniel (https://github.com/AgriciDaniel/claude-ads), MIT licence.
#
# For testing only: set CLAUDE_ADS_SOURCE to a local clone to use it instead of GitHub, and
# CLAUDE_ADS_ZIP_URL to use another address instead of the GitHub zip. Leave both unset normally.

$ErrorActionPreference = 'Stop'

$ForkUrl = 'https://github.com/georgecairns-ui/claude-ads'
$UpstreamUrl = 'https://github.com/AgriciDaniel/claude-ads'
$Tag = 'v2.0.1'
$Commit = '669c7608ecb50dd95c941a71fa3ca0a1c0e40512'
$ZipUrl = if ($env:CLAUDE_ADS_ZIP_URL) { $env:CLAUDE_ADS_ZIP_URL } else { "$ForkUrl/archive/refs/tags/$Tag.zip" }

$Kit = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$Work = Join-Path ([IO.Path]::GetTempPath()) ('ads-os-claude-ads-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Path $Work | Out-Null

function Stop-Install([string]$Why) {
    Write-Error "claude-ads was not installed: $Why"
    exit 1
}

# The commit a zip was made from sits in the zip's own comment, at the very end of the file
function Get-ZipComment([string]$Path) {
    $bytes = [IO.File]::ReadAllBytes($Path)
    $start = [Math]::Max(0, $bytes.Length - 65557)
    for ($i = $bytes.Length - 22; $i -ge $start; $i--) {
        if ($bytes[$i] -eq 0x50 -and $bytes[$i + 1] -eq 0x4b -and $bytes[$i + 2] -eq 0x05 -and $bytes[$i + 3] -eq 0x06) {
            $length = [BitConverter]::ToUInt16($bytes, $i + 20)
            return [Text.Encoding]::ASCII.GetString($bytes, $i + 22, $length).Trim()
        }
    }
    return ''
}

try {
    if ($Kit.StartsWith($Work)) { Stop-Install 'this folder is inside the temporary folder' }
    $Src = Join-Path $Work 'claude-ads'
    $HaveGit = [bool](Get-Command git -ErrorAction SilentlyContinue)

    if ($env:CLAUDE_ADS_SOURCE) {
        if (-not (Test-Path $env:CLAUDE_ADS_SOURCE -PathType Container)) { Stop-Install "CLAUDE_ADS_SOURCE is not a folder: $($env:CLAUDE_ADS_SOURCE)" }
        if (-not $HaveGit) { Stop-Install 'git is needed to use CLAUDE_ADS_SOURCE' }
        Write-Host "Using the local copy at $($env:CLAUDE_ADS_SOURCE) (testing only)."
        $local = (Resolve-Path $env:CLAUDE_ADS_SOURCE).Path
        git -c advice.detachedHead=false clone --quiet --depth 1 --branch $Tag "file://$local" $Src
        if ($LASTEXITCODE -ne 0) { Stop-Install "could not read tag $Tag from $local" }
        $Found = (git -C $Src rev-parse HEAD).Trim()
    }
    elseif ($HaveGit) {
        Write-Host "Fetching claude-ads $Tag with git."
        git -c advice.detachedHead=false clone --quiet --depth 1 --branch $Tag "$ForkUrl.git" $Src
        if ($LASTEXITCODE -ne 0) { Stop-Install "could not fetch $ForkUrl at $Tag. Check the internet connection and try again" }
        $Found = (git -C $Src rev-parse HEAD).Trim()
    }
    else {
        Write-Host "git isn't installed, so downloading claude-ads $Tag as a zip."
        $zip = Join-Path $Work 'claude-ads.zip'
        try { Invoke-WebRequest -Uri $ZipUrl -OutFile $zip -UseBasicParsing }
        catch { Stop-Install "could not download $ZipUrl. Check the internet connection and try again" }
        $Found = Get-ZipComment $zip
        $unzipped = Join-Path $Work 'unzipped'
        Expand-Archive -Path $zip -DestinationPath $unzipped
        $inner = Get-ChildItem -Path $unzipped -Directory | Select-Object -First 1
        if (-not $inner) { Stop-Install 'the download had nothing in it' }
        Move-Item -Path $inner.FullName -Destination $Src
    }

    if ($Found -ne $Commit) {
        Stop-Install "it is not the tested version. Expected commit $Commit but found '$Found'. Nothing was installed"
    }
    Write-Host "Checked: commit $Commit."

    if (-not (Test-Path (Join-Path $Src 'install.ps1'))) { Stop-Install 'install.ps1 is missing from the download' }
    if (-not (Test-Path (Join-Path $Src 'LICENSE'))) { Stop-Install 'LICENSE is missing from the download' }

    $Skills = Join-Path $Kit '.claude\skills'
    $Agents = Join-Path $Kit '.claude\agents'
    New-Item -ItemType Directory -Force -Path $Skills, $Agents | Out-Null

    & (Join-Path $Src 'install.ps1') -Source local -RepoDir $Src -NoDeps -SkillDir $Skills -AgentDir $Agents
    if ($LASTEXITCODE -ne 0 -and $null -ne $LASTEXITCODE) { Stop-Install "claude-ads' own installer stopped. Read what it printed above" }

    $Dest = Join-Path $Skills 'ads'
    if (-not (Test-Path $Dest)) { Stop-Install "the installer ran but $Dest is not there" }
    Copy-Item (Join-Path $Src 'LICENSE') (Join-Path $Dest 'LICENSE') -Force
    if (Test-Path (Join-Path $Src 'THIRD_PARTY_NOTICES.md')) {
        Copy-Item (Join-Path $Src 'THIRD_PARTY_NOTICES.md') (Join-Path $Dest 'THIRD_PARTY_NOTICES.md') -Force
    }

    $today = Get-Date -Format 'yyyy-MM-dd'
    $note = @"
# Installed by Ads OS

These claude-ads skills and agents were added to this folder by Ads OS during setup.

- Made by: AgriciDaniel, $UpstreamUrl
- Installed from: $ForkUrl
- Version: $Tag (commit $Commit)
- Installed on: $today
- Licence: MIT, Copyright (c) 2026 agricidaniel. The full licence is in LICENSE beside this file.
- Installed skills only. No Python packages were added.

To move to a newer version, a maintainer changes the version and commit at the top of
setup/scripts/install-claude-ads.sh (and .ps1), then runs the script again.
"@
    Set-Content -Path (Join-Path $Dest 'INSTALLED-BY-ADS-OS.md') -Value $note -Encoding UTF8

    $skillCount = (Get-ChildItem -Path $Skills -Directory | Where-Object { $_.Name -eq 'ads' -or $_.Name -like 'ads-*' }).Count
    $agentCount = (Get-ChildItem -Path $Agents -File).Count
    Write-Host "claude-ads $Tag is installed: $skillCount skills and $agentCount agents."
}
finally {
    Remove-Item -Recurse -Force -Path $Work -ErrorAction SilentlyContinue
}
