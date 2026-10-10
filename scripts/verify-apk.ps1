param(
  [Parameter(Mandatory = $true)]
  [string]$ApkPath,
  [string]$ExpectedSha256
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $ApkPath -PathType Leaf)) {
  Write-Error "APK file not found: $ApkPath"
  exit 2
}

$resolvedPath = (Resolve-Path -LiteralPath $ApkPath).Path
if ([IO.Path]::GetExtension($resolvedPath) -ine ".apk") {
  Write-Error "Expected a file with the .apk extension. No file was inspected."
  exit 2
}

# Prefer an apksigner already on PATH; otherwise locate it in Android SDK Build Tools.
$apksigner = Get-Command "apksigner.bat" -ErrorAction SilentlyContinue
if (-not $apksigner) { $apksigner = Get-Command "apksigner" -ErrorAction SilentlyContinue }
$apksignerPath = if ($apksigner) { $apksigner.Source } else { $null }

if (-not $apksignerPath) {
  $sdkRoots = @()
  if ($env:ANDROID_SDK_ROOT) { $sdkRoots += $env:ANDROID_SDK_ROOT }
  if ($env:ANDROID_HOME) { $sdkRoots += $env:ANDROID_HOME }
  if ($env:LOCALAPPDATA) { $sdkRoots += (Join-Path $env:LOCALAPPDATA "Android\Sdk") }
  foreach ($sdkRoot in ($sdkRoots | Select-Object -Unique)) {
    $buildTools = Join-Path $sdkRoot "build-tools"
    if (Test-Path -LiteralPath $buildTools -PathType Container) {
      $candidates = Get-ChildItem -LiteralPath $buildTools -Directory | Sort-Object Name -Descending
      foreach ($candidate in $candidates) {
        $possible = Join-Path $candidate.FullName "apksigner.bat"
        if (Test-Path -LiteralPath $possible -PathType Leaf) { $apksignerPath = $possible; break }
        $possible = Join-Path $candidate.FullName "apksigner"
        if (Test-Path -LiteralPath $possible -PathType Leaf) { $apksignerPath = $possible; break }
      }
    }
    if ($apksignerPath) { break }
  }
}

if (-not $apksignerPath) {
  Write-Error "Android SDK apksigner was not found. Install Android SDK Build Tools or add apksigner to PATH."
  exit 3
}

$actualHash = (Get-FileHash -LiteralPath $resolvedPath -Algorithm SHA256).Hash.ToUpperInvariant()
$expected = if ([string]::IsNullOrWhiteSpace($ExpectedSha256)) { $null } else { $ExpectedSha256.Trim().ToUpperInvariant() }
if ($expected -and $expected -notmatch "^[A-F0-9]{64}$") {
  Write-Error "ExpectedSha256 must be exactly 64 hexadecimal characters."
  exit 2
}

$verifyOutput = @(& $apksignerPath verify --verbose --print-certs $resolvedPath 2>&1 | ForEach-Object { $_.ToString() })
$verifyExitCode = $LASTEXITCODE
$hashMatches = if ($expected) { $actualHash -eq $expected } else { $null }
$report = [ordered]@{
  file = $resolvedPath
  sha256 = $actualHash
  expectedSha256 = $expected
  expectedHashMatches = $hashMatches
  signatureVerified = ($verifyExitCode -eq 0)
  apksignerPath = $apksignerPath
  apksignerExitCode = $verifyExitCode
  apksignerOutput = $verifyOutput
  malwareScanPerformed = $false
  interpretation = "Signature verification checks APK signing integrity, not whether the publisher is trustworthy or the APK is free of malware."
}
$report | ConvertTo-Json -Depth 5

if ($verifyExitCode -ne 0) { exit 1 }
if ($expected -and -not $hashMatches) { exit 4 }

Write-Output "Verification succeeded. Review the signer certificate digest and compare it with an independently trusted publisher value."