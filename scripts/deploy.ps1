# Deploy Fly LRE to Liquid Web (Spark Launch) via SFTP.
# Requires .env.deploy - copy from .env.deploy.example

param(
  [switch]$SkipBuild,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$DistPath = Join-Path $ProjectRoot "dist"
$EnvFile = Join-Path $ProjectRoot ".env.deploy"
$EnvFallback = Join-Path $ProjectRoot ".env"

function Load-EnvFile {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return }
  Get-Content $Path | ForEach-Object {
    if ($_ -match "^\s*#" -or $_ -match "^\s*$") { return }
    $name, $value = $_ -split "=", 2
    if ($name) {
      Set-Item -Path "env:$($name.Trim())" -Value $value.Trim()
    }
  }
}

function Ensure-PoshSSH {
  if (Get-Module -ListAvailable -Name Posh-SSH) {
    Import-Module Posh-SSH -ErrorAction Stop
    return
  }

  $userModuleRoot = Join-Path $env:USERPROFILE "Documents\WindowsPowerShell\Modules"
  $psModuleRoot = Join-Path $env:USERPROFILE "Documents\PowerShell\Modules"
  foreach ($root in @($userModuleRoot, $psModuleRoot)) {
    $modulePath = Get-ChildItem -Path (Join-Path $root "Posh-SSH") -Filter "Posh-SSH.psd1" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($modulePath) {
      Import-Module $modulePath.FullName -ErrorAction Stop
      return
    }
  }

  Write-Host "Installing Posh-SSH module (one-time)..."
  Install-PackageProvider -Name NuGet -MinimumVersion 2.8.5.201 -Force -Scope CurrentUser | Out-Null
  Install-Module -Name Posh-SSH -Scope CurrentUser -Force -AllowClobber
  Import-Module Posh-SSH -ErrorAction Stop
}

function Clear-RemoteWebRoot {
  param($Credential, [string]$HostName, [int]$Port, [string]$RemotePath)
  $ssh = New-SSHSession -ComputerName $HostName -Port $Port -Credential $Credential -AcceptKey -Force
  if (-not $ssh) { throw "Could not connect via SSH" }
  try {
    $command = @"
cd '$RemotePath' && rm -f index.php wp-*.php xmlrpc.php license.txt readme.html 2>/dev/null
rm -rf wp-admin wp-includes 2>/dev/null
rm -rf wp-content/themes wp-content/plugins wp-content/uploads 2>/dev/null
"@
    $result = Invoke-SSHCommand -SessionId $ssh.SessionId -Command $command
    if ($result.Error) {
      Write-Warning "Some old files could not be removed (managed hosting). Continuing upload."
    }
  } finally {
    Remove-SSHSession -SessionId $ssh.SessionId | Out-Null
  }
}

function Upload-Directory {
  param($SessionId, [string]$LocalPath, [string]$RemotePath)
  Get-ChildItem -LiteralPath $LocalPath -Force | ForEach-Object {
    Set-SFTPItem -SessionId $SessionId -Path $_.FullName -Destination $RemotePath -Force
    Write-Host "  uploaded $($_.Name)"
  }
}

Set-Location $ProjectRoot
Load-EnvFile -Path $EnvFallback
Load-EnvFile -Path $EnvFile

if (-not $env:SFTP_HOST -or -not $env:SFTP_USER -or -not $env:SFTP_PASSWORD) {
  throw "SFTP credentials missing. Add SFTP_HOST, SFTP_USER, and SFTP_PASSWORD to .env or .env.deploy."
}

$hostName = $env:SFTP_HOST
$port = if ($env:SFTP_PORT) { [int]$env:SFTP_PORT } else { 22 }
$user = $env:SFTP_USER
$password = $env:SFTP_PASSWORD
$remoteDir = if ($env:SFTP_REMOTE_DIR) { $env:SFTP_REMOTE_DIR.Trim() } else { "html" }
if (-not $remoteDir.StartsWith("/")) {
  $remoteDir = "/$($remoteDir.Trim('/'))"
}

if (-not $SkipBuild) {
  Write-Host "Building site..."
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "Build failed" }
}

if (-not (Test-Path $DistPath)) {
  throw "dist/ not found - run npm run build first"
}

if ($DryRun) {
  Write-Host "Dry run - would upload from $DistPath to $remoteDir on $hostName"
  exit 0
}

Ensure-PoshSSH

$securePassword = ConvertTo-SecureString $password -AsPlainText -Force
$credential = New-Object System.Management.Automation.PSCredential ($user, $securePassword)

Write-Host "Connecting to $hostName..."
$session = New-SFTPSession -ComputerName $hostName -Port $port -Credential $credential -AcceptKey -Force
if (-not $session) { throw "Could not connect via SFTP" }

try {
  $remoteRoot = $remoteDir
  Write-Host "Clearing old site files in $remoteRoot ..."
  Clear-RemoteWebRoot -Credential $credential -HostName $hostName -Port $port -RemotePath $remoteRoot

  Write-Host "Uploading new site from dist/ ..."
  Upload-Directory -SessionId $session.SessionId -LocalPath $DistPath -RemotePath $remoteRoot

  Write-Host ""
  Write-Host "Deploy complete. Verify https://www.flylre.com"
} finally {
  Remove-SFTPSession -SessionId $session.SessionId | Out-Null
}
