# BritBee beta hosting

Canonical **production + CI/CD architecture** is documented in the root [`README.md`](../README.md) (sections **Production hosting** and **CI/CD architecture**).

This folder holds the scripts and configs those docs refer to.

## Quick reference

| Domain | Port | Role |
|--------|------|------|
| `britbee.buzz` | **80** | Lander — Nginx → `website/dist` |
| `app.britbee.buzz` | **8080** | Expo web — Nginx → `app/dist` |
| `api.britbee.buzz` | **3001** | API — PM2 `britbee-api` |
| `office.britbee.buzz` | **3003** | Office — PM2 `britbee-office` |

| File | Purpose |
|------|---------|
| `nginx-britbee-buzz.conf` | Lander `:80` + app `:8080` only |
| `pm2.ecosystem.json` | API + Office process list |
| `remote-release.sh` | Path-aware post-rsync install / reload |
| `env.production.example` | Template for `/opt/britbee/.env` |
| `bootstrap-vps.sh` | First-time package install helper |
| `docker-compose.yml` | Optional container path (not primary) |

## Path-aware CD (summary)

Push to `master` → `.github/workflows/deploy-vps.yml`:

- `website/**` → build + rsync dist (no PM2)
- `app/**` → Expo export + rsync dist (no PM2)
- `api/**` → rsync + reload **britbee-api** only
- `office/**` → build + rsync + reload **britbee-office** only
- `packages/**` / lockfile → api + office + app
- `deploy/**` → scripts / nginx

Full release: Actions → **Deploy VPS** → `force_all`.

Secrets/vars: see root README.
