# BritBee beta hosting

Preferred path: **one Ubuntu VPS + PM2 + Nginx**, with managed Mongo and S3 off-box. Docker Compose in this folder is optional.

BritBee is served on **your** domains (default `britbee.app`, `api.britbee.app`, `office.britbee.app`) — not on the provider marketing sites.

## Production stack

| Layer | Service | Link |
|-------|---------|------|
| Compute | [AIC Cloud](https://aiccloud.in/) VPS · Ubuntu 24.04 · Node 20 · pnpm · **PM2** · **Nginx** | App processes + TLS edge |
| Database | [HeavenCloud MongoDB (Mumbai)](https://heavencloud.in/service/database/india) | `MEMORY_DB=0` + `MONGODB_URI` |
| Object storage | [AceCloud S3-compatible](https://acecloud.ai/cloud/storage/object/) | Proofs / chat / learn media |
| Email | Zoho ZeptoMail | Parental alerts |
| OTP | Hanu OTP | SMS in prod |

Kids/parent Expo still points at `EXPO_PUBLIC_API_URL`.

---

## Preferred: PM2 on AIC Cloud VPS

### 1. Create a VPS

1. Order a Cloud VPS at [aiccloud.in](https://aiccloud.in/) (Mumbai / India preferred).
2. Note public IP + SSH credentials.

### 2. Server packages

```bash
ssh root@YOUR_VPS_IP
# Node 20+, pnpm, nginx, certbot, pm2 — e.g.
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs nginx certbot python3-certbot-nginx
npm i -g pnpm@9 pm2
```

### 3. Managed Mongo + object storage

1. Create a Mongo plan on [HeavenCloud India](https://heavencloud.in/service/database/india) → copy connection string.
2. Create an S3 bucket on [AceCloud Object Storage](https://acecloud.ai/cloud/storage/object/) → note endpoint, access key, secret, bucket.
3. Put them in `.env.production` (see `env.production.example`).

### 4. App on the VPS

```bash
git clone YOUR_REPO_URL britbee && cd britbee
cp deploy/env.production.example .env.production
nano .env.production   # JWT, HeavenCloud URI, AceCloud, ZeptoMail, hosts

pnpm install
pnpm --filter @britbee/website build
pnpm --filter @britbee/office build
pnpm --filter @britbee/api seed   # once

# Example PM2 processes (adjust paths)
pm2 start "pnpm --filter @britbee/api start" --name britbee-api
pm2 start "pnpm --filter @britbee/office start" --name britbee-office
pm2 save && pm2 startup
```

### 5. Nginx

- `britbee.app` → `website/dist` (static)
- `api.britbee.app` → `http://127.0.0.1:3001`
- `office.britbee.app` → `http://127.0.0.1:3003`

Then: `certbot --nginx` for HTTPS. Point DNS **A** records at the VPS IP first.

### 6. Mobile app

```
EXPO_PUBLIC_API_URL=https://api.britbee.app
```

---

## Optional: Docker Compose

If you prefer containers on the same VPS:

```bash
cp deploy/env.production.example .env.production
# Prefer HeavenCloud for Mongo — remove/ignore the compose `mongo` service and set MONGODB_URI
docker compose -f deploy/docker-compose.yml --env-file .env.production up -d --build
```

Bootstrap helper (Docker Engine only): `bash deploy/bootstrap-vps.sh`.

---

## Capacity note (Essential 1 GB)

Fine for private beta. Keep Mongo and object storage **off** the VPS. If Office (Next.js) feels tight on 1 GB RAM, run API + website on Essential and move Office later.
