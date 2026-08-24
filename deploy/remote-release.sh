#!/usr/bin/env bash
# Runs ON the VPS after CI rsyncs changed paths.
# Env flags (true/false): DEPLOY_API DEPLOY_OFFICE DEPLOY_WEBSITE DEPLOY_APP DEPLOY_NGINX DEPLOY_DEPS
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/britbee}"
cd "$APP_DIR"

DEPLOY_API="${DEPLOY_API:-false}"
DEPLOY_OFFICE="${DEPLOY_OFFICE:-false}"
DEPLOY_WEBSITE="${DEPLOY_WEBSITE:-false}"
DEPLOY_APP="${DEPLOY_APP:-false}"
DEPLOY_NGINX="${DEPLOY_NGINX:-false}"
DEPLOY_DEPS="${DEPLOY_DEPS:-false}"

echo "==> flags api=$DEPLOY_API office=$DEPLOY_OFFICE website=$DEPLOY_WEBSITE app=$DEPLOY_APP nginx=$DEPLOY_NGINX deps=$DEPLOY_DEPS"

need_pnpm=false
if [[ "$DEPLOY_DEPS" == "true" || "$DEPLOY_API" == "true" || "$DEPLOY_OFFICE" == "true" ]]; then
  need_pnpm=true
fi

if [[ "$need_pnpm" == "true" ]]; then
  echo "==> pnpm install"
  pnpm install --frozen-lockfile
fi

if [[ "$DEPLOY_NGINX" == "true" && -f deploy/nginx-britbee-buzz.conf ]]; then
  echo "==> nginx"
  cp deploy/nginx-britbee-buzz.conf /etc/nginx/sites-available/britbee
  ln -sfn /etc/nginx/sites-available/britbee /etc/nginx/sites-enabled/britbee
  nginx -t
  systemctl reload nginx
fi

reload_one() {
  local name="$1"
  if pm2 describe "$name" >/dev/null 2>&1; then
    pm2 reload "$name" --update-env
  else
    pm2 start deploy/pm2.ecosystem.json --only "$name"
  fi
}

if [[ "$DEPLOY_API" == "true" || "$DEPLOY_OFFICE" == "true" ]]; then
  echo "==> pm2"
  if ! pm2 describe britbee-api >/dev/null 2>&1 && ! pm2 describe britbee-office >/dev/null 2>&1; then
    pm2 start deploy/pm2.ecosystem.json
  else
    [[ "$DEPLOY_API" == "true" ]] && reload_one britbee-api
    [[ "$DEPLOY_OFFICE" == "true" ]] && reload_one britbee-office
  fi
  pm2 save
fi

if [[ "$DEPLOY_API" == "true" ]]; then
  echo "==> health wait (api)"
  ok=0
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    if curl -fsS "http://127.0.0.1:3001/health" >/tmp/britbee-health.json 2>/dev/null; then
      ok=1
      break
    fi
    sleep 2
  done
  if [[ "$ok" != "1" ]]; then
    echo "API health failed; pm2 logs:"
    pm2 logs britbee-api --lines 40 --nostream || true
    exit 1
  fi
  head -c 240 /tmp/britbee-health.json
  echo
fi

if [[ "$DEPLOY_OFFICE" == "true" ]]; then
  curl -fsS -o /dev/null -w "office:%{http_code}\n" "http://127.0.0.1:3003/" || true
fi
if [[ "$DEPLOY_WEBSITE" == "true" ]]; then
  curl -fsS -o /dev/null -w "site:%{http_code}\n" -H "Host: britbee.buzz" "http://127.0.0.1/" || true
fi
if [[ "$DEPLOY_APP" == "true" ]]; then
  curl -fsS -o /dev/null -w "app:%{http_code}\n" -H "Host: app.britbee.buzz" "http://127.0.0.1:8080/" || true
fi

echo "==> release OK $(date -u +%Y-%m-%dT%H:%M:%SZ)"
