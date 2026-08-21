$ErrorActionPreference = 'Stop'

$oracleEnvPath = Join-Path $PSScriptRoot '..\supabase-backup\oracle\.env.oracle'
$appEnvPath = Join-Path $PSScriptRoot '..\.env'

function Read-EnvFile([string]$Path) {
  $values = @{}
  foreach ($line in Get-Content -LiteralPath $Path) {
    if ($line -match '^([^#=]+)=(.*)$') {
      $values[$matches[1]] = $matches[2]
    }
  }
  return $values
}

$oracle = Read-EnvFile $oracleEnvPath
$app = Read-EnvFile $appEnvPath

if (-not $oracle['ANON_KEY']) {
  throw 'ANON_KEY est absent de la configuration Oracle.'
}

$app['VITE_SUPABASE_URL'] = 'https://gmao.supabase.facilitysolutiongroup.ma'
$app['VITE_SUPABASE_ANON_KEY'] = $oracle['ANON_KEY']

$orderedKeys = @('VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY')
$remainingKeys = $app.Keys | Where-Object { $_ -notin $orderedKeys } | Sort-Object
$lines = foreach ($key in ($orderedKeys + $remainingKeys)) {
  if ($app.ContainsKey($key)) {
    '{0}={1}' -f $key, $app[$key]
  }
}

Set-Content -LiteralPath $appEnvPath -Value $lines -Encoding utf8
Write-Output 'Configuration locale Supabase actualisée.'
