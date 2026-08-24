#!/usr/bin/env bash
# One-time bootstrap on a fresh AIC Cloud Ubuntu VPS.
# Run as root: bash deploy/bootstrap-vps.sh
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

apt-get update -y
apt-get install -y ca-certificates curl git ufw

# Docker Engine
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

systemctl enable --now docker

ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo ""
echo "VPS ready. Next:"
echo "  1. Clone the BritBee repo"
echo "  2. cp deploy/env.production.example .env.production  # edit secrets + hosts"
echo "  3. Point DNS A records for website/api/office hosts to this server"
echo "  4. docker compose -f deploy/docker-compose.yml --env-file .env.production up -d --build"
echo "  5. docker compose -f deploy/docker-compose.yml exec api pnpm seed"
