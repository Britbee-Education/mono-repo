#!/usr/bin/env bash
# First-time (or update) deploy on an AIC Cloud Ubuntu VPS.
# Run as root ON the VPS:
#   PUBLIC_IP=1.2.3.4 bash deploy/bootstrap-vps.sh
#
# Or from your laptop (after SSH works):
#   ssh root@IP 'bash -s' < deploy/bootstrap-vps.sh
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive
APP_DIR="${APP_DIR:-/opt/britbee}"
PUBLIC_IP="${PUBLIC_IP:-$(curl -4 -fsS ifconfig.me || true)}"
REPO_URL="${REPO_URL:-https://github.com/Britbee-Education/mono-repo.git}"
BRANCH="${BRANCH:-master}"

echo "==> BritBee bootstrap  dir=$APP_DIR  ip=${PUBLIC_IP:-unknown}"

apt-get update -y
apt-get install -y ca-certificates curl git nginx ufw

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
corepack enable
corepack prepare pnpm@9.15.0 --activate
npm i -g pm2

if [[ ! -d "$APP_DIR/.git" ]]; then
  mkdir -p "$(dirname "$APP_DIR")"
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
else
  git -C "$APP_DIR" fetch origin
  git -C "$APP_DIR" checkout "$BRANCH"
  git -C "$APP_DIR" pull --ff-only origin "$BRANCH"
fi

cd "$APP_DIR"

if [[ ! -f .env ]]; then
  cp deploy/env.production.example .env
  JWT="$(openssl rand -hex 32)"
  sed -i "s|change-me-to-a-long-random-string|$JWT|" .env
fi
if [[ -n "${PUBLIC_IP}" ]]; then
  sed -i "s|PUBLIC_IP|$PUBLIC_IP|g" .env
fi

pnpm install --frozen-lockfile
export $(grep -v '^#' .env | xargs)
pnpm --filter @britbee/website build
NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-http://${PUBLIC_IP}:3001}" \
  pnpm --filter @britbee/office build
(
  cd app
  EXPO_NO_METRO_WORKSPACE_ROOT=1 EXPO_PUBLIC_API_URL="${EXPO_PUBLIC_API_URL:-http://${PUBLIC_IP}:3001}" \
    pnpm exec expo export --platform web
)

sed "s|DEPLOY_ROOT|$APP_DIR|g" deploy/nginx-ip.conf.template >/etc/nginx/sites-available/britbee
ln -sfn /etc/nginx/sites-available/britbee /etc/nginx/sites-enabled/britbee
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 8080/tcp
ufw allow 3001/tcp
ufw allow 3003/tcp
ufw --force enable

pm2 start "$APP_DIR/deploy/pm2.ecosystem.cjs" || pm2 reload "$APP_DIR/deploy/pm2.ecosystem.cjs" --update-env
pm2 save
env PATH="$PATH" pm2 startup systemd -u root --hp /root >/dev/null || true

sleep 2
curl -fsS "http://127.0.0.1:3001/health" || true
echo
echo "==> Live (until DNS):"
echo "    Website  http://${PUBLIC_IP}/"
echo "    Web app  http://${PUBLIC_IP}:8080/"
echo "    API      http://${PUBLIC_IP}:3001/health"
echo "    Office   http://${PUBLIC_IP}:3003/"
echo "    Demo login: guide@britbee.test / password123"
