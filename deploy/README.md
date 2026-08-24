# BritBee beta hosting

Preferred path: **one Ubuntu VPS + PM2 + Nginx**, with managed Mongo and S3 off-box. Docker Compose in this folder is optional. **CI/CD** is GitHub Actions + Expo EAS (see below).

BritBee is served on **your** domains — not on the provider marketing sites.

## Production stack

| Layer | Service | Link |
|-------|---------|------|
| Compute | [AIC Cloud](https://aiccloud.in/) VPS · Ubuntu 24.04 · Node 20 · pnpm · **PM2** · **Nginx** | App processes + TLS edge |
| Database | [HeavenCloud MongoDB (Mumbai)](https://heavencloud.in/service/database/india) | `MEMORY_DB=0` + `MONGODB_URI` |
| Object storage | [AceCloud S3-compatible](https://acecloud.ai/cloud/storage/object/) | Proofs / chat / learn media |
| Email | Zoho ZeptoMail | Parental alerts |
| OTP | Hanu OTP | SMS in prod |
| CI/CD | GitHub Actions + EAS | `.github/workflows/` |

Default hosts:

| Host | Surface |
|------|---------|
| `britbee.app` | Marketing website (`website/dist`) |
| `app.britbee.app` | Kids + parent **web app** (`app/dist` Expo export) |
| `api.britbee.app` | API (PM2 → `:3001`) |
| `office.britbee.app` | Backoffice (PM2 → `:3003`) |

---

## CI/CD

| Workflow | File | Triggers | Surfaces |
|----------|------|----------|----------|
| **CI** | `.github/workflows/ci.yml` | PR + push to `master`/`main` | Path-filtered builds: website, office, api typecheck, Expo **web** export |
| **Deploy VPS** | `.github/workflows/deploy-vps.yml` | Push to `master`/`main` + manual | website · office · API · Expo web → AIC Cloud via SSH |
| **EAS Android** | `.github/workflows/eas-android.yml` | Manual + tags `android-v*` | Native **Android** APK/AAB via Expo EAS |

### Per-surface summary

| Surface | CI | CD |
|---------|----|----|
| Marketing website | `pnpm --filter @britbee/website build` | VPS build → Nginx `britbee.app` |
| Backoffice | `pnpm --filter @britbee/office build` | VPS build → PM2 `britbee-office` |
| API | `tsc --noEmit` | PM2 `britbee-api` reload |
| Web app (Expo) | `expo export --platform web` | VPS export → Nginx `app.britbee.app` |
| Android app | — | `eas build --platform android` (`preview` or `production`) |

### Enable VPS deploy

1. Add deploy SSH key on the VPS (`authorized_keys`).
2. GitHub → Settings → Secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, optional `VPS_PORT`.
3. GitHub → Variables: `VPS_DEPLOY_ENABLED=true`, optional `VPS_APP_DIR`, `EXPO_PUBLIC_API_URL`.
4. First-time on VPS: clone repo, `.env.production`, `pnpm install`, seed, `pm2 start deploy/pm2.ecosystem.cjs`, Nginx from `nginx.example.conf`.
5. After that, pushes to `master` run deploy automatically.

### Enable Android EAS

1. Create an Expo access token → secret `EXPO_TOKEN`.
2. Actions → **EAS Android** → Run workflow → choose `preview` (APK) or `production`.
3. Or: `git tag android-v1.0.0 && git push origin android-v1.0.0`.

Profiles are defined in `app/eas.json`.

---

## Preferred: PM2 on AIC Cloud VPS

### 1. Create a VPS

1. Order a Cloud VPS at [aiccloud.in](https://aiccloud.in/) (Mumbai / India preferred).
2. Note public IP + SSH credentials.

### 2. Server packages

```bash
ssh root@YOUR_VPS_IP
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs nginx certbot python3-certbot-nginx git
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
# also: ln -sf .env.production .env   # API loads repo-root .env
nano .env.production

pnpm install
pnpm --filter @britbee/website build
pnpm --filter @britbee/office build
cd app && EXPO_NO_METRO_WORKSPACE_ROOT=1 pnpm exec expo export --platform web && cd ..
pnpm --filter @britbee/api seed   # once

pm2 start deploy/pm2.ecosystem.cjs
pm2 save && pm2 startup
```

### 5. Nginx

Use [`nginx.example.conf`](./nginx.example.conf):

- `britbee.app` → `website/dist`
- `app.britbee.app` → `app/dist`
- `api.britbee.app` → `http://127.0.0.1:3001`
- `office.britbee.app` → `http://127.0.0.1:3003`

Then: `certbot --nginx`. Point DNS **A** records at the VPS IP first.

### 6. Clients

```
EXPO_PUBLIC_API_URL=https://api.britbee.app
NEXT_PUBLIC_API_URL=https://api.britbee.app
```

---

## Optional: Docker Compose

```bash
cp deploy/env.production.example .env.production
# Prefer HeavenCloud for Mongo — set MONGODB_URI; ignore compose mongo if unused
docker compose -f deploy/docker-compose.yml --env-file .env.production up -d --build
```

Bootstrap helper (Docker Engine only): `bash deploy/bootstrap-vps.sh`.

---

## Capacity note (Essential 1 GB)

Fine for private beta. Keep Mongo and object storage **off** the VPS. If Office (Next.js) feels tight on 1 GB RAM, run API + static sites on Essential and move Office later.
