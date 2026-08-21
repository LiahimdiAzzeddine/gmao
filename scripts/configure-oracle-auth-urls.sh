#!/usr/bin/env bash
set -euo pipefail

cd /home/ubuntu/supabase-project
cp -a .env ".env.before-site-url-$(date +%Y%m%d%H%M%S)"

set_env() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" .env; then
    sed -i "s|^${key}=.*|${key}=${value}|" .env
  else
    printf '%s=%s\n' "$key" "$value" >> .env
  fi
}

set_env SITE_URL 'https://gestion.facilitysolutiongroup.ma'
set_env ADDITIONAL_REDIRECT_URLS 'http://localhost:5173,http://localhost:5173/**,https://gestion.facilitysolutiongroup.ma/**'
chmod 600 .env

sudo docker compose up -d --force-recreate auth
echo 'Auth redirect URLs configured.'
