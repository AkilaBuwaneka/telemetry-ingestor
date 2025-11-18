param(
  [string]$Output = "telemetry-ingestor.zip"
)

$root = $PWD
$staging = Join-Path $root "package-staging"
$excludeDirs = @('node_modules','dist','.git','.vscode','logs')
$excludeFiles = @('.env','.env.local','*.log')

Remove-Item -Recurse -Force $staging -ErrorAction SilentlyContinue
Remove-Item -Force $Output -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $staging | Out-Null

Get-ChildItem -Force | ForEach-Object {
  if($_ -is [IO.DirectoryInfo]) {
    if($excludeDirs -contains $_.Name) { return }
    robocopy $_.FullName (Join-Path $staging $_.Name) /MIR /NFL /NDL /NJH /NJS /NC /NS | Out-Null
  } elseif($_ -is [IO.FileInfo]) {
    if($excludeFiles | Where-Object { $_ -like $_.Name }) { return }
    Copy-Item $_.FullName -Destination $staging
  }
}

Compress-Archive -Path (Join-Path $staging '*') -DestinationPath (Join-Path $root $Output)
Remove-Item -Recurse -Force $staging
Write-Host "Archive created: $Output"