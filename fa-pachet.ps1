# Face arhiva de urcat pe cPanel (Romarg), pentru https://vireo.ro/lista/
#
#   powershell -ExecutionPolicy Bypass -File fa-pachet.ps1
#
# Rezultat: pachet\lista.zip  ->  se urca in public_html/lista/ si se extrage acolo.
# In arhiva, caile sunt scrise cu "/" (altfel cPanel extrage aiurea pe Windows-zip).

$ErrorActionPreference = 'Stop'
$radacina = Split-Path -Parent $MyInvocation.MyCommand.Path
$pachet   = Join-Path $radacina 'pachet'
$zip      = Join-Path $pachet 'lista.zip'

if (Test-Path $pachet) { Remove-Item $pachet -Recurse -Force }
New-Item -ItemType Directory -Path $pachet | Out-Null

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$arhiva = [System.IO.Compression.ZipFile]::Open($zip, 'Create')

function Adauga-Fisier($caleFizica, $caleInArhiva) {
  $caleInArhiva = $caleInArhiva -replace '\\', '/'
  [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
    $arhiva, $caleFizica, $caleInArhiva, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
  Write-Host "  + $caleInArhiva"
}

# 1. aplicatia (continutul folderului app/ ajunge direct in /lista/)
$app = Join-Path $radacina 'app'
Get-ChildItem $app -Recurse -File -Force | ForEach-Object {
  $rel = $_.FullName.Substring($app.Length + 1)
  Adauga-Fisier $_.FullName $rel
}

# 2. API-ul (in /lista/api/) - fara config.php, care se scrie o singura data pe server
$api = Join-Path $radacina 'api'
Get-ChildItem $api -Recurse -File -Force | Where-Object { $_.Name -ne 'config.php' } | ForEach-Object {
  $rel = 'api/' + $_.FullName.Substring($api.Length + 1)
  Adauga-Fisier $_.FullName $rel
}

$arhiva.Dispose()

$dim = [math]::Round((Get-Item $zip).Length / 1KB, 1)
Write-Host ""
Write-Host "Gata: $zip ($dim KB)" -ForegroundColor Green
Write-Host "Urca-l in public_html/lista/ si extrage-l acolo (Extract din File Manager)."
Write-Host "ATENTIE: config.php nu e in arhiva - se creeaza o singura data pe server."
