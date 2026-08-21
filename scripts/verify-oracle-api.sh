#!/usr/bin/env bash
set -euo pipefail

cd /home/ubuntu/supabase-project
ANON_KEY="$(sed -n 's/^ANON_KEY=//p' .env | head -n 1)"
SERVICE_ROLE_KEY="$(sed -n 's/^SERVICE_ROLE_KEY=//p' .env | head -n 1)"
if [[ -z "$ANON_KEY" || -z "$SERVICE_ROLE_KEY" ]]; then
  echo "Required API key is missing" >&2
  exit 1
fi

check() {
  local name="$1"
  local url="$2"
  local status
  status="$(curl -sS -o /dev/null -w '%{http_code}' \
    -H "apikey: ${ANON_KEY}" -H "Authorization: Bearer ${ANON_KEY}" "$url")"
  printf '%s=%s\n' "$name" "$status"
}

check rest http://127.0.0.1:8000/rest/v1/
check auth http://127.0.0.1:8000/auth/v1/health
check storage http://127.0.0.1:8000/storage/v1/status

rest_table_status="$(curl -sS -o /dev/null -w '%{http_code}' \
  -H "apikey: ${ANON_KEY}" -H "Authorization: Bearer ${ANON_KEY}" \
  'http://127.0.0.1:8000/rest/v1/clients?select=id&limit=1')"
printf 'rest_clients_anon=%s\n' "$rest_table_status"

rest_admin_status="$(curl -sS -o /dev/null -w '%{http_code}' \
  -H "apikey: ${SERVICE_ROLE_KEY}" -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  'http://127.0.0.1:8000/rest/v1/clients?select=id&limit=1')"
printf 'rest_clients_service=%s\n' "$rest_admin_status"

sudo docker compose ps --format '{{.Service}}|{{.State}}|{{.Health}}'
