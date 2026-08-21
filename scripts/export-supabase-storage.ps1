param(
  [string]$MigrationEnv = ".env.migration.local",
  [string]$AppEnv = ".env",
  [string]$Destination = "supabase-backup/storage"
)

$ErrorActionPreference = "Stop"

function Read-EnvFile([string]$Path) {
  $values = @{}
  Get-Content -LiteralPath $Path | Where-Object { $_ -match '^[A-Za-z_][A-Za-z0-9_]*=' } | ForEach-Object {
    $parts = $_ -split '=', 2
    $values[$parts[0]] = $parts[1].Trim().Trim('"').Trim("'")
  }
  return $values
}

function Encode-ObjectPath([string]$Path) {
  return (($Path -split '/') | ForEach-Object { [Uri]::EscapeDataString($_) }) -join '/'
}

$migration = Read-EnvFile $MigrationEnv
$app = Read-EnvFile $AppEnv
$baseUrl = $app['VITE_SUPABASE_URL'].TrimEnd('/')
$serviceKey = $migration['SUPABASE_SERVICE_ROLE_KEY']

if ([string]::IsNullOrWhiteSpace($baseUrl) -or [string]::IsNullOrWhiteSpace($serviceKey)) {
  throw 'VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant.'
}

$headers = @{ Authorization = "Bearer $serviceKey"; apikey = $serviceKey }
$bucketResponse = Invoke-RestMethod -Uri "$baseUrl/storage/v1/bucket" -Headers $headers -Method Get
$buckets = @($bucketResponse | ForEach-Object { $_ })
$manifest = [System.Collections.Generic.List[object]]::new()
$failures = [System.Collections.Generic.List[object]]::new()

function Export-Prefix([object]$Bucket, [string]$Prefix) {
  $offset = 0
  do {
    $body = @{ prefix = $Prefix; limit = 1000; offset = $offset; sortBy = @{ column = 'name'; order = 'asc' } } | ConvertTo-Json -Depth 4
    $listUrl = "$baseUrl/storage/v1/object/list/$([Uri]::EscapeDataString($Bucket.id))"
    $itemResponse = Invoke-RestMethod -Uri $listUrl -Headers $headers -Method Post -ContentType 'application/json' -Body $body
    $items = @($itemResponse | ForEach-Object { $_ })

    foreach ($item in $items) {
      if ($Prefix) {
        $objectPath = [string]::Concat([string]$Prefix, '/', [string]$item.name)
      } else {
        $objectPath = [string]$item.name
      }
      if ($null -eq $item.metadata) {
        Export-Prefix $Bucket $objectPath
        continue
      }

      $windowsObjectPath = $objectPath.Replace('/', [string][IO.Path]::DirectorySeparatorChar)
      $relativePath = Join-Path -Path ([string]$Bucket.name) -ChildPath $windowsObjectPath
      $targetPath = Join-Path $Destination $relativePath
      $targetDirectory = Split-Path -Parent $targetPath
      New-Item -ItemType Directory -Force -Path $targetDirectory | Out-Null
      if ((Test-Path -LiteralPath $targetPath) -and ((Get-Item -LiteralPath $targetPath).Length -eq [long]$item.metadata.size)) {
        $manifest.Add([pscustomobject]@{ bucket = $Bucket.name; path = $objectPath; size = $item.metadata.size; etag = $item.metadata.eTag })
        continue
      }
      $accessPath = if ($Bucket.public) { 'public' } else { 'authenticated' }
      $downloadUrl = "$baseUrl/storage/v1/object/$accessPath/$([Uri]::EscapeDataString($Bucket.id))/$(Encode-ObjectPath $objectPath)"
      try {
        Invoke-WebRequest -Uri $downloadUrl -Headers $headers -OutFile $targetPath
        $manifest.Add([pscustomobject]@{ bucket = $Bucket.name; path = $objectPath; size = $item.metadata.size; etag = $item.metadata.eTag })
      } catch {
        Remove-Item -LiteralPath $targetPath -Force -ErrorAction SilentlyContinue
        $failures.Add([pscustomobject]@{ bucket = $Bucket.name; path = $objectPath; error = $_.Exception.Message })
      }
    }

    $offset += $items.Count
  } while ($items.Count -eq 1000)
}

foreach ($bucket in $buckets) {
  Export-Prefix $bucket ''
}

New-Item -ItemType Directory -Force -Path $Destination | Out-Null
ConvertTo-Json -InputObject $manifest.ToArray() -Depth 4 | Set-Content -LiteralPath (Join-Path $Destination 'manifest.json') -Encoding UTF8
ConvertTo-Json -InputObject $failures.ToArray() -Depth 4 | Set-Content -LiteralPath (Join-Path $Destination 'failures.json') -Encoding UTF8
Write-Output "Export Storage terminé : $($buckets.Count) bucket(s), $($manifest.Count) objet(s), $($failures.Count) échec(s)."
