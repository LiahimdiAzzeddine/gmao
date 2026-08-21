#!/usr/bin/env bash
set -euo pipefail

project_dir="${1:-/home/ubuntu/supabase-project}"
compose_file="$project_dir/docker-compose.yml"
backup_file="$project_dir/docker-compose.yml.before-local-bind"

if [[ ! -f "$backup_file" ]]; then
  cp "$compose_file" "$backup_file"
fi

sed -i \
  -e 's|- ${API_GW_HTTP_PORT:-${KONG_HTTP_PORT:-8000}}:8000/tcp|- 127.0.0.1:${API_GW_HTTP_PORT:-${KONG_HTTP_PORT:-8000}}:8000/tcp|' \
  -e 's|- ${POSTGRES_PORT}:5432|- 127.0.0.1:${POSTGRES_PORT}:5432|' \
  -e 's|- ${POOLER_PROXY_PORT_TRANSACTION}:6543|- 127.0.0.1:${POOLER_PROXY_PORT_TRANSACTION}:6543|' \
  "$compose_file"

grep -q '127.0.0.1:${API_GW_HTTP_PORT' "$compose_file"
grep -q '127.0.0.1:${POSTGRES_PORT}:5432' "$compose_file"
grep -q '127.0.0.1:${POOLER_PROXY_PORT_TRANSACTION}:6543' "$compose_file"
echo 'Docker ports restricted to localhost.'
