#!/usr/bin/env bash
set -euo pipefail

project_dir="${1:-/home/ubuntu/supabase-project}"
source_dir="${2:-/home/ubuntu/migration/storage/gmao-photos}"
bucket="gmao-photos"
api_url="http://127.0.0.1:8000"
service_key="$(grep '^SERVICE_ROLE_KEY=' "$project_dir/.env" | cut -d= -f2-)"
failures_file="/home/ubuntu/migration/storage-import-failures.txt"

if [[ -z "$service_key" ]]; then
  echo "SERVICE_ROLE_KEY is missing" >&2
  exit 1
fi

: > "$failures_file"

bucket_status="$(curl --silent --show-error --output /tmp/storage-bucket-response.json --write-out '%{http_code}' \
  --request POST "$api_url/storage/v1/bucket" \
  --header "Authorization: Bearer $service_key" \
  --header "apikey: $service_key" \
  --header 'Content-Type: application/json' \
  --data '{"id":"gmao-photos","name":"gmao-photos","public":true}')"

if [[ "$bucket_status" != "200" && "$bucket_status" != "201" && "$bucket_status" != "409" ]]; then
  echo "Bucket creation failed with HTTP $bucket_status" >&2
  exit 1
fi

success=0
failure=0

while IFS= read -r -d '' file_path; do
  relative_path="${file_path#"$source_dir"/}"
  encoded_path="$(printf '%s' "$relative_path" | jq -sRr 'split("/") | map(@uri) | join("/")')"
  mime_type="$(file --brief --mime-type "$file_path" 2>/dev/null || printf 'application/octet-stream')"
  status="$(curl --silent --show-error --output /tmp/storage-upload-response.json --write-out '%{http_code}' \
    --request POST "$api_url/storage/v1/object/$bucket/$encoded_path" \
    --header "Authorization: Bearer $service_key" \
    --header "apikey: $service_key" \
    --header 'x-upsert: true' \
    --header "Content-Type: $mime_type" \
    --data-binary "@$file_path" || true)"

  if [[ "$status" == "200" || "$status" == "201" ]]; then
    success=$((success + 1))
  else
    failure=$((failure + 1))
    printf '%s\tHTTP %s\n' "$relative_path" "$status" >> "$failures_file"
  fi
done < <(find "$source_dir" -type f -print0)

echo "Storage import completed: $success succeeded, $failure failed."
[[ "$failure" -eq 0 ]]
