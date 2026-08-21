#!/usr/bin/env bash
set -euo pipefail

DOMAIN="gmao.supabase.facilitysolutiongroup.ma"
PROJECT_DIR="/home/ubuntu/supabase-project"

sudo apt-get update
sudo apt-get install -y caddy

sudo install -m 0644 /dev/null /etc/caddy/Caddyfile
printf '%s\n' \
  "${DOMAIN} {" \
  "    encode zstd gzip" \
  "    reverse_proxy 127.0.0.1:8000" \
  "}" | sudo tee /etc/caddy/Caddyfile >/dev/null

cd "$PROJECT_DIR"
cp -a .env ".env.before-https-$(date +%Y%m%d%H%M%S)"

set_env() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" .env; then
    sed -i "s|^${key}=.*|${key}=${value}|" .env
  else
    printf '%s=%s\n' "$key" "$value" >> .env
  fi
}

set_env SUPABASE_PUBLIC_URL "https://${DOMAIN}"
set_env API_EXTERNAL_URL "https://${DOMAIN}"
set_env PROXY_DOMAIN "${DOMAIN}"
chmod 600 .env

sudo systemctl enable --now caddy
sudo systemctl reload caddy
sudo docker compose up -d

echo "HTTPS configuration installed for ${DOMAIN}"
