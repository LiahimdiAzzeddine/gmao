$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$sourceFiles = Get-ChildItem -Path (Join-Path $root 'src'), (Join-Path $root 'supabase\functions') -Recurse -File |
  Where-Object { $_.Extension -in '.ts', '.tsx', '.js', '.jsx' }

$fromPattern = '\.from\(\s*[''"]([^''"]+)[''"]'

$usages = foreach ($file in $sourceFiles) {
  $content = Get-Content -LiteralPath $file.FullName -Raw
  $matches = [regex]::Matches($content, $fromPattern)
  foreach ($match in $matches) {
    [pscustomobject]@{
      Table = $match.Groups[1].Value
      Area = if ($file.FullName -like '*\src\gestion\*') { 'gestion' } else { 'outside' }
      File = $file.FullName.Substring($root.Length + 1).Replace('\', '/')
    }
  }
}

$usages |
  Sort-Object Table, Area, File -Unique |
  Group-Object Table |
  ForEach-Object {
    $areas = $_.Group.Area | Sort-Object -Unique
    [pscustomobject]@{
      Table = $_.Name
      Areas = $areas -join ','
      GestionFiles = ($_.Group | Where-Object Area -eq 'gestion').File -join '; '
      OutsideFiles = ($_.Group | Where-Object Area -eq 'outside').File -join '; '
    }
  } |
  Sort-Object Table |
  ConvertTo-Csv -NoTypeInformation
