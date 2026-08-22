#!/usr/bin/env bash
set -euo pipefail

target='/home/ubuntu/migration'
resolved="$(readlink -f "$target")"

if [[ "$resolved" != '/home/ubuntu/migration' || ! -d "$resolved" ]]; then
  echo "Refusing unexpected target: $resolved" >&2
  exit 1
fi

rm -rf -- "$resolved"

if [[ -e "$resolved" ]]; then
  echo 'Directory removal failed.' >&2
  exit 1
fi

echo 'Removed /home/ubuntu/migration'
df -h /
/home/ubuntu/supabase-health.sh
