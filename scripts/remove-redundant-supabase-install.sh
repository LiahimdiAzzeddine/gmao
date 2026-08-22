#!/usr/bin/env bash
set -euo pipefail

target='/home/ubuntu/supabase-install'
resolved="$(readlink -f "$target")"

if [[ "$resolved" != '/home/ubuntu/supabase-install' || ! -d "$resolved" ]]; then
  echo "Refusing unexpected target: $resolved" >&2
  exit 1
fi

rm -rf -- "$resolved"

if [[ -e "$resolved" ]]; then
  echo 'Directory removal failed.' >&2
  exit 1
fi

echo 'Removed /home/ubuntu/supabase-install'
df -h /
/home/ubuntu/supabase-health.sh
