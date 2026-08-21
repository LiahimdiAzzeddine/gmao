#!/usr/bin/env bash
set -euo pipefail

add_rule_before_reject() {
  local port="$1"
  if sudo iptables -C INPUT -p tcp --dport "$port" -m conntrack --ctstate NEW -j ACCEPT 2>/dev/null; then
    return
  fi

  local reject_line
  reject_line="$(sudo iptables -L INPUT --line-numbers -n | awk '$2 == "REJECT" { print $1; exit }')"
  if [[ -z "$reject_line" ]]; then
    echo "No INPUT REJECT rule found; refusing an ambiguous firewall edit." >&2
    exit 1
  fi

  sudo iptables -I INPUT "$reject_line" -p tcp --dport "$port" \
    -m conntrack --ctstate NEW -m comment --comment "Supabase HTTPS ${port}" -j ACCEPT
}

add_rule_before_reject 80
add_rule_before_reject 443

sudo mkdir -p /etc/iptables
sudo iptables-save | sudo tee /etc/iptables/rules.v4 >/dev/null

sudo iptables -nvL INPUT --line-numbers
