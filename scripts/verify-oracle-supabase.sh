#!/usr/bin/env bash
set -euo pipefail

cd /home/ubuntu/supabase-project

echo DATABASE
sudo docker exec supabase-db psql -U supabase_admin -d postgres -Atc \
  "select 'auth.users', count(*) from auth.users
   union all select 'auth.identities', count(*) from auth.identities
   union all select 'public.clients', count(*) from public.clients
   union all select 'public.machines', count(*) from public.machines
   union all select 'storage.buckets', count(*) from storage.buckets
   union all select 'storage.objects', count(*) from storage.objects;"

echo BUCKET
sudo docker exec supabase-db psql -U supabase_admin -d postgres -Atc \
  "select id, public from storage.buckets order by id;"

echo FUNCTIONS
find volumes/functions -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort

echo HEALTH
curl -sS -o /dev/null -w 'gateway=%{http_code}\n' http://127.0.0.1:8000/
curl -sS -o /dev/null -w 'auth=%{http_code}\n' http://127.0.0.1:8000/auth/v1/health
curl -sS -o /dev/null -w 'storage=%{http_code}\n' http://127.0.0.1:8000/storage/v1/status
