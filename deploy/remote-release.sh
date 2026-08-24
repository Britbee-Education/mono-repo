#!/usr/bin/env bash
# Runs ON the VPS after CI rsyncs a release into /opt/britbee.
# Builds happen in GitHub Actions (1GB VPS must not compile Next/Expo).
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/britbee}"
cd "$APP_DIR"

echo "==> pnpm install"
pnpm install --frozen-lockfile

if [[ -f deploy/nginx-britbee-buzz.conf ]]; then
  echo "==> nginx"
  cp deploy/nginx-britbee-buzz.conf /etc/nginx/sites-available/britbee
  ln -sfn /etc/nginx/sites-available/britbee /etc/nginx/sites-enabled/britbee
  nginx -t
  systemctl reload nginx
fi

echo "==> pm2"
if pm2 describe britbee-api >/dev/null 2>&1; then
  pm2 reload deploy/pm2.ecosystem.json --update-env
else
  pm2 start deploy/pm2.ecosystem.json
fi
pm2 save

sleep 2
curl -fsS "http://127.0.0.1:3001/health" | head -c 240
echo
curl -fsS -o /dev/null -w "office:%{http_code}\n" "http://127.0.0.1:3003/" || true
curl -fsS -o /dev/null -w "site:%{http_code}\n" -H "Host: britbee.buzz" "http://127.0.0.1/" || true
curl -fsS -o /dev/null -w "app:%{http_code}\n" -H "Host: app.britbee.buzz" "http://127.0.0.1:8080/" || true
echo "==> release OK $(date -u +%Y-%m-%dT%H:%M:%SZ)"
