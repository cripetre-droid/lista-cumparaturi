# Face arhiva de urcat pe cPanel (Romarg), pentru https://lista.vireo.ro/
#
#   powershell -ExecutionPolicy Bypass -File fa-pachet.ps1
#
# Rezultat: pachet\lista.zip  ->  se urca in /home/rvir1227/lista/ (document root-ul
# subdomeniului lista.vireo.ro) si se extrage acolo.
# In arhiva, caile sunt scrise cu "/" (altfel cPanel extrage aiurea pe Windows-zip).

#   -Instalare   include si install.php + verifica.php (doar la prima instalare).
#                Fara el, arhiva e de ACTUALIZARE: nu readuce pe server fisierele sterse dupa instalare.

param([switch]$Instalare)

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
$excluse = @('config.php')
if (-not $Instalare) { $excluse += @('install.php', 'verifica.php') }
Get-ChildItem $api -Recurse -File -Force | Where-Object { $excluse -notcontains $_.Name } | ForEach-Object {
  $rel = 'api/' + $_.FullName.Substring($api.Length + 1)
  Adauga-Fisier $_.FullName $rel
}

# 3. paginile cerute de Google Play: politica de confidentialitate, stergerea contului, assetlinks
$gp = Join-Path $radacina 'GooglePlay'
$siteGata = Join-Path $gp 'site-gata'
$paginiGp = $false
if (Test-Path (Join-Path $gp 'pregateste-site.mjs')) {
  & node (Join-Path $gp 'pregateste-site.mjs') | Out-Null
  if ($LASTEXITCODE -eq 0 -and (Test-Path $siteGata)) {
    Get-ChildItem $siteGata -Recurse -File -Force | ForEach-Object {
      $rel = $_.FullName.Substring($siteGata.Length + 1)
      Adauga-Fisier $_.FullName $rel
    }
    $paginiGp = $true
  }
}

$arhiva.Dispose()

$dim = [math]::Round((Get-Item $zip).Length / 1KB, 1)
Write-Host ""
Write-Host "Gata: $zip ($dim KB)" -ForegroundColor Green
Write-Host "Urca-l in /home/rvir1227/lista/ si extrage-l acolo (Extract din File Manager)."
Write-Host "ATENTIE: config.php nu e in arhiva - se creeaza o singura data pe server."
if (-not $Instalare) { Write-Host "Arhiva de ACTUALIZARE: fara install.php si verifica.php." -ForegroundColor Yellow }
if (-not $paginiGp) { Write-Host "FARA paginile Google Play: completeaza GooglePlay\date-publice.json (nume + e-mail)." -ForegroundColor Yellow }
