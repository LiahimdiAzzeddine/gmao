param(
  [string]$Source = "supabase-backup/database/data-20260821-latest.sql",
  [string]$Destination = "supabase-backup/database/data-20260821-oracle.sql"
)

$ErrorActionPreference = 'Stop'
$content = [IO.File]::ReadAllText((Resolve-Path $Source))
$emptyCopyPattern = '(?m)^COPY [^\r\n]+ FROM stdin;\r?\n\\\.\r?\n'
$matches = [regex]::Matches($content, $emptyCopyPattern)
$compatible = [regex]::Replace($content, $emptyCopyPattern, '')
$storageCopyPattern = '(?ms)^COPY "storage"\.[^\r\n]+ FROM stdin;\r?\n.*?^\\\.\r?\n'
$storageMatches = [regex]::Matches($compatible, $storageCopyPattern)
$compatible = [regex]::Replace($compatible, $storageCopyPattern, '')
$utf8WithoutBom = [Text.UTF8Encoding]::new($false)
[IO.File]::WriteAllText((Join-Path (Resolve-Path (Split-Path $Destination -Parent)) (Split-Path $Destination -Leaf)), $compatible, $utf8WithoutBom)
Write-Output "Empty COPY blocks removed: $($matches.Count)"
Write-Output "Storage COPY blocks deferred to API migration: $($storageMatches.Count)"
