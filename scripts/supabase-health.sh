#!/usr/bin/env bash
set -uo pipefail

PROJECT_DIR="/home/ubuntu/supabase-project"
DOMAIN="gmao.supabase.facilitysolutiongroup.ma"
WARNINGS=0
ERRORS=0

green='\033[0;32m'
yellow='\033[0;33m'
red='\033[0;31m'
reset='\033[0m'

ok() { printf "${green}[OK]${reset} %s\n" "$*"; }
warn() { printf "${yellow}[ATTENTION]${reset} %s\n" "$*"; WARNINGS=$((WARNINGS + 1)); }
fail() { printf "${red}[ERREUR]${reset} %s\n" "$*"; ERRORS=$((ERRORS + 1)); }

echo "=== Supabase GMAO - $(date '+%Y-%m-%d %H:%M:%S %Z') ==="
echo

echo "--- VM ---"
printf 'Uptime : %s\n' "$(uptime -p)"
printf 'CPU    : %s coeurs (%s)\n' "$(nproc)" "$(uname -m)"
load1="$(awk '{print $1}' /proc/loadavg)"
printf 'Charge : %s (1 minute)\n' "$load1"
if awk -v load="$load1" -v cpu="$(nproc)" 'BEGIN { exit !(load > cpu) }'; then
  warn "Charge CPU supérieure au nombre de coeurs."
else
  ok "Charge CPU normale."
fi

mem_total="$(awk '/MemTotal/ {print $2}' /proc/meminfo)"
mem_available="$(awk '/MemAvailable/ {print $2}' /proc/meminfo)"
mem_used_pct=$(( (mem_total - mem_available) * 100 / mem_total ))
printf 'RAM    : %s%% utilisée\n' "$mem_used_pct"
if (( mem_used_pct >= 90 )); then fail "RAM presque saturée.";
elif (( mem_used_pct >= 80 )); then warn "Utilisation RAM élevée.";
else ok "RAM disponible suffisante."; fi

disk_pct="$(df -P / | awk 'NR==2 {gsub(/%/, "", $5); print $5}')"
disk_free="$(df -hP / | awk 'NR==2 {print $4}')"
printf 'Disque : %s%% utilisé, %s libres\n' "$disk_pct" "$disk_free"
if (( disk_pct >= 90 )); then fail "Disque presque plein.";
elif (( disk_pct >= 80 )); then warn "Utilisation disque élevée.";
else ok "Capacité disque suffisante."; fi

echo
echo "--- Services Docker ---"
if ! sudo docker info >/dev/null 2>&1; then
  fail "Docker ne répond pas."
else
  cd "$PROJECT_DIR" || exit 2
  expected="$(sudo docker compose config --services 2>/dev/null | sort)"
  running="$(sudo docker compose ps --status running --services 2>/dev/null | sort)"
  missing="$(comm -23 <(printf '%s\n' "$expected") <(printf '%s\n' "$running"))"
  unhealthy="$(sudo docker compose ps --format '{{.Service}}|{{.State}}|{{.Health}}' 2>/dev/null | awk -F'|' '$2 != "running" || ($3 != "" && $3 != "healthy")')"
  if [[ -n "$missing" ]]; then fail "Services arrêtés : $(echo "$missing" | tr '\n' ' ')"; fi
  if [[ -n "$unhealthy" ]]; then fail "Services non sains : $(echo "$unhealthy" | tr '\n' ' ')"; fi
  if [[ -z "$missing" && -z "$unhealthy" ]]; then ok "Tous les services Supabase sont actifs et sains."; fi
fi

echo
echo "--- API et base de données ---"
http_status="$(curl -sS --connect-timeout 8 -o /dev/null -w '%{http_code}' "https://${DOMAIN}/storage/v1/status" 2>/dev/null || true)"
if [[ "$http_status" == "200" ]]; then ok "API HTTPS accessible publiquement."; else fail "API HTTPS indisponible (HTTP ${http_status:-000})."; fi

cert_days="$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)"
if [[ -n "$cert_days" ]]; then
  cert_epoch="$(date -d "$cert_days" +%s)"
  days_left=$(( (cert_epoch - $(date +%s)) / 86400 ))
  if (( days_left < 7 )); then fail "Certificat TLS expire dans ${days_left} jours.";
  elif (( days_left < 21 )); then warn "Certificat TLS expire dans ${days_left} jours.";
  else ok "Certificat TLS valide encore ${days_left} jours."; fi
else
  fail "Impossible de lire le certificat TLS."
fi

if sudo docker exec supabase-db pg_isready -U supabase_admin -d postgres >/dev/null 2>&1; then
  ok "PostgreSQL répond."
  db_info="$(sudo docker exec supabase-db psql -U supabase_admin -d postgres -Atc \
    "select pg_size_pretty(pg_database_size(current_database())), (select count(*) from pg_stat_activity), (select count(*) from auth.users), (select count(*) from storage.objects);" 2>/dev/null || true)"
  IFS='|' read -r db_size db_connections auth_users storage_objects <<< "$db_info"
  printf 'Base   : %s, %s connexions\n' "${db_size:-inconnue}" "${db_connections:-?}"
  printf 'Données: %s utilisateurs Auth, %s objets Storage\n' "${auth_users:-?}" "${storage_objects:-?}"
else
  fail "PostgreSQL ne répond pas."
fi

storage_size="$(sudo du -sh "$PROJECT_DIR/volumes/storage" 2>/dev/null | awk '{print $1}')"
printf 'Fichiers Storage sur disque : %s\n' "${storage_size:-inconnu}"

echo
echo "--- Résultat ---"
if (( ERRORS > 0 )); then
  printf "${red}%s erreur(s), %s avertissement(s).${reset}\n" "$ERRORS" "$WARNINGS"
  exit 2
elif (( WARNINGS > 0 )); then
  printf "${yellow}Aucune erreur, %s avertissement(s).${reset}\n" "$WARNINGS"
  exit 1
else
  printf "${green}Tout fonctionne correctement.${reset}\n"
fi
