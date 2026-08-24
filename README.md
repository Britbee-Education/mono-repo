# BritBee Monorepo

> **Practical English for kids — built to help children learn, speak, and grow with confidence.** 🚀  
> One codebase. Three surfaces. Infinite buzz.

Kids learn in the app. Parents guide from the **in-app parent shell**. Mentors run the hive from **Office**. One API powers it all.

---

## 🏛️ Architecture at a glance

| Layer | What it is | Stack | Port / surface |
|-------|------------|-------|----------------|
| 📱 **Kids + Parent App** | Daily practice, quests, chat, live class join + parent PIN shell | **Expo 54** · **React Native** · **React 19** · **expo-router** | Expo Go / iOS / Android / Web (`app.britbee.app`) |
| 🌐 **Marketing website** | Public beta / waitlist | **Vite** · **React** | `britbee.app` |
| 🧭 **Office** | Mentor cockpit — learners, classes, billing, activities, roster | **Next.js 15** · **React 19** · **Lucide** | `office.britbee.app` · `:3003` |
| 🔌 **API** | Auth, progress, speech, notify + Expo Push, billing, guide tools | **Node 20+** · **Express** · **TypeScript** · **Zod** | `api.britbee.app` · `:3001` |
| 📦 **Shared** | Contracts + SEO config shared across apps | `@britbee/shared` · `@britbee/config` · **Zod** | workspace packages |

```
                    ┌─────────────────────┐
                    │   Kids + Parent     │
                    │   Expo / RN App     │
                    └──────────┬──────────┘
                               │
                               ▼
┌──────────────┐      ┌─────────────────────┐      ┌──────────────┐
│ 🧭 Office    │─────▶│  🔌 BritBee API     │◀─────│  Shared pkgs │
│ Next.js :3003│      │  Express :3001      │      │  Zod + SEO   │
└──────────────┘      └──────────┬──────────┘      └──────────────┘
                                 │
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                  ▼
           💾 Dev: JSON files   🍃 Prod: MongoDB    📦 Prod: Object storage
              MEMORY_DB=1       HeavenCloud IN     AceCloud S3-compatible
```

---

## 🧰 Full tech stack (the fun table)

| Area | 🛠️ What we use | 💬 Why it rocks |
|------|----------------|-----------------|
| 🗂️ **Monorepo** | **pnpm** workspaces | One install, shared types, zero copy-paste chaos |
| 🟦 **Language** | **TypeScript** everywhere | Types that travel from API → app → office → website |
| 📱 **Mobile** | **Expo SDK 54** + **React Native 0.81** | Ship iOS, Android & web from one codebase |
| 🌐 **Marketing site** | **Vite** + **React** (`website/`) | Public beta / waitlist landing |
| 🧭 **Routing (app)** | **expo-router** | File-based screens that feel native |
| 🖥️ **Office web** | **Next.js 15** (App Router) | Fast mentor UI, SSR-ready |
| ⚡ **UI motion** | Reanimated · Gesture Handler · Linear Gradient | Snappy, playful kid/mentor UX |
| 🔌 **API** | **Express** + **tsx** | Simple, fast, TypeScript-native |
| ✅ **Validation** | **Zod** | Shared schemas = fewer “wait, what shape?” bugs |
| 🔐 **Auth** | **JWT** + **bcryptjs** + **SecureStore** | Phone/password for kids; PIN for parents; staff for office |
| 📩 **OTP SMS** | **Hanu OTP** (optional) | Real SMS in prod; friendly `devOtp` locally |
| 🗣️ **TTS** | **Microsoft Edge neural voices** (free) | Natural British English — no key required |
| 👂 **STT / listen** | **Groq Whisper** (optional) | Better phonics scoring when `GROQ_API_KEY` is set |
| 📸 **Media** | expo-av · image-picker · document-picker · **multer** | Voice, photos, files for class & chat |
| 💳 **Billing** | **BritBee Pay** — custom UPI/GPay QR gateway, proof upload, mentor activation (`billingStore` + parent/Office UI) | Parents pay QR → UTR/screenshot → mentors activate; no Stripe/Razorpay for launch |
| 🎁 **Referrals** | Invite codes + Buzz + plan discounts (`referralStore`, Parent Refer & earn, Office Referrals) | App ↔ Office: who referred whom, counts, checkout discounts |
| 🔔 **Notifications** | **In-app inbox** + **Expo Push** → **FCM** / **APNs** + **Zoho ZeptoMail** | Mentors buzz kids; phone popups + parental email for login, reminders, reports & billing |
| ☁️ **Push relay** | Expo Push HTTP API (`exp.host`) | Free tier for launch; API stores device tokens, fans out on mentor send |
| 📧 **Email** | **Zoho ZeptoMail** (transactional REST API) | Login alerts, class/practice reminders, student reports, BritBee Pay updates to parents |
| 🎬 **Live class** | Book / go-live / join room flow | Mentors start; kids tap Join |
| 💾 **Database (dev)** | File-backed JSON (`api/data/…`) | Zero infra — restart-safe local hive |
| 🍃 **Database (prod)** | **MongoDB** via **Mongoose** on [HeavenCloud India](https://heavencloud.in/service/database/india) | Managed Mumbai Mongo — `MEMORY_DB=0` + `MONGODB_URI` |
| 📦 **Object storage (prod)** | [AceCloud S3-compatible](https://acecloud.ai/cloud/storage/object/) | Proofs, chat voice, learn uploads off the VPS disk |
| 🖥️ **Compute (prod)** | [AIC Cloud](https://aiccloud.in/) Ubuntu VPS · **pnpm** · **PM2** · **Nginx** | Simple direct VM — no Kubernetes for beta |
| 🔁 **CI/CD** | **GitHub Actions** + **EAS** | PR builds; VPS SSH deploy; Android via Expo EAS |
| 🧹 **Tooling** | ESLint · Expo Go · EAS · dotenv · CORS | Clean DX from laptop to classroom |

### 🚫 Intentionally *not* in the stack (yet)

| Skipped | Status |
|---------|--------|
| 🌐 Separate parent website | ❌ Removed — parents live in the app shell |
| 💸 Stripe / Razorpay | ❌ Not needed for launch — BritBee Pay uses mentor GPay QR + manual verify |
| ☸️ Kubernetes | ❌ Deferred — beta runs on one VPS with PM2 |
| 🐳 Docker as primary deploy | ⚪ Optional in `deploy/` — preferred path is PM2 + Nginx on the VM |

---

## 📁 Repo map

| Path | Emoji | Mission |
|------|-------|---------|
| `./api` | 🔌 | Express API — auth, speech, progress, guide, billing, notify |
| `./app` | 📱 | Expo kids app **+** in-app parent shell |
| `./office` | 🧭 | Next.js mentor backoffice |
| `./website` | 🌐 | Public marketing / beta waitlist (Vite) |
| `./deploy` | 🚀 | Beta host docs — preferred PM2 + Nginx; optional Docker |
| `./packages` | 📦 | Shared Zod types + brand/SEO config |
| `./design` | 🎨 | UI mockup references |

---

## ⚡ Prerequisites

- **Node 20+**
- **pnpm 9+** (`npm i -g pnpm`)
- Optional: **MongoDB** (default `MEMORY_DB=1` → `api/data/users.json`)

---

## 🚀 Setup

```bash
cp .env.example .env   # set MEMORY_DB=1 for local file DB
pnpm install
```

Minimum `.env`:

```
MEMORY_DB=1
JWT_SECRET=britbee-dev-secret-change-me
API_PORT=3001
EXPO_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Production Mongo** ([HeavenCloud India](https://heavencloud.in/service/database/india)):

```
MEMORY_DB=0
MONGODB_URI=mongodb://USER:PASS@HOST:PORT/britbee
pnpm seed
```

---

## 🎮 How to preview (3 terminals = lift-off)

### 1️⃣ API (required for login)

```bash
pnpm dev:api
```

Health: http://localhost:3001/health

### 2️⃣ Kids + parent app (Expo)

```bash
pnpm dev:app
```

Then in Expo:

| Key | Opens |
|-----|--------|
| `w` | 🌐 Web |
| `i` | 🍎 iOS Simulator |
| `a` | 🤖 Android emulator |
| QR | 📲 **Expo Go** on a phone |

> On a physical device, set `EXPO_PUBLIC_API_URL` in `app/.env` to your LAN IP (e.g. `http://192.168.1.10:3001`).

Parents unlock the **in-app parent shell** with their PIN — no separate parent website.

```bash
pnpm --filter @britbee/app web
```

### 3️⃣ Guide office

```bash
pnpm dev:office
```

Open http://localhost:3003

### 4️⃣ Marketing website

```bash
pnpm dev:website
```

Open http://localhost:5173

### 🎯 One-shot office + API

```bash
pnpm dev:webs
```

Still run `pnpm dev:app` separately for Expo.

---

## 📲 Expo Go note

Play Store Expo Go supports **SDK 54**. This app targets **SDK 54** so the QR just works. Keep Expo Go updated! ✨

---

## 💳 BritBee Pay (custom payment gateway)

In-house UPI/GPay checkout — looks like a real gateway, settles via mentor verification (no Stripe/Razorpay fees for launch).

### Architecture

```
 Parent shell (Expo)                 BritBee API                      Mentor Office (Next.js)
 ┌─────────────────────┐            ┌──────────────────────┐         ┌─────────────────────┐
 │ BritBeePayPanel     │  checkout  │ billingStore         │ pending │ ParentBillingPanel  │
 │  · plan + amount    │───────────▶│  · Payment           │────────▶│  · UTR / screenshot │
 │  · UPI QR / intent  │            │  · Subscription      │         │  · Activate / Reject│
 │  · txn ID + proof   │  proof     │  · Invoice           │ confirm │                     │
 │  · waiting state    │───────────▶│  · ParentActivity    │◀────────│                     │
 └─────────────────────┘            └──────────┬───────────┘         └─────────────────────┘
                                               │
                                               ▼
                                    ZeptoMail (optional) + parentSettings sync
```

**Status machine:** `pending` (QR shown) → `processing` (proof submitted) → `succeeded` / `failed` (mentor action). Parents cannot self-activate.

### Stack pieces

| Layer | Path / tech | Role |
|-------|-------------|------|
| 🧠 **Domain store** | `api/src/billingStore.ts` | Plans (trial / monthly / yearly), payments, invoices, activity log, UPI intent + QR session |
| 🔌 **Parent API** | `api/src/routes/billing.ts` | `POST /billing/checkout`, `GET …/gateway`, `POST …/submit-proof`, `POST …/proof` (multer upload) |
| 🧭 **Mentor API** | `api/src/routes/guide.ts` → `/guide/billing/*` | Pending queue, confirm / fail, manual checkout, set plan |
| 🔄 **Plan sync** | `api/src/billingSync.ts` | Writes `parentSettings` (plan, status, renews) onto the user after activation |
| 📱 **Parent UI** | `app/components/parent/BritBeePayPanel.tsx` | Gateway chrome: QR, share VPA, open UPI app, txn ID, screenshot, waiting state |
| 🖥️ **Office UI** | `office/components/ParentBillingPanel.tsx` | Review UTR + screenshot, activate / reject, household billing |
| 🗄️ **Persist** | `api/data/billing.json` (gitignored) | File-backed in `MEMORY_DB=1`; same shapes ready for Mongo |
| 🖼 **Proofs** | `app/assets/billing/proofs/` (gitignored) | Uploaded screenshots served at `/assets/billing/proofs/…` |
| 📧 **Email** | ZeptoMail via `logActivity` | Parents get billing / plan emails when configured |

### Checkout flow

1. Parent picks **Monthly / Yearly** in the parent shell → `POST /billing/checkout` creates a `pending` payment + `orderRef`.
2. `gatewaySession()` builds `upi://pay?pa=…&am=…&tr=…` and a QR (auto via qrserver, or `BILLING_UPI_QR_URL`).
3. Parent pays in GPay / PhonePe / any UPI app, then submits **transaction ID** and/or **screenshot**.
4. Payment → `processing`; UI polls until mentor acts.
5. Mentor reviews in Office → **Activate plan** (`confirmPaymentByGuide`) creates invoice, flips subscription, syncs `parentSettings`.
6. Parent shell refreshes — plan shows active. Reject path marks `failed` with a note.

### Configure mentor GPay / UPI

```
BILLING_UPI_VPA=mentor@oksbi
BILLING_UPI_NAME=BritBee Mentors
# optional hosted QR image instead of auto-generated UPI QR:
# BILLING_UPI_QR_URL=https://cdn.example.com/mentor-gpay-qr.png
```

Amounts are stored in **paise** (INR × 100). Default plans: Hive Trial (₹0 / 7d), Monthly (₹499 / 30d), Yearly (₹4,999 / 365d).

---

## 🎁 Referral program (app ↔ Office)

Families share invite codes; mentors see every join in Office. Successful claims award **Buzz Points** and stack **membership discounts** on BritBee Pay checkout.

### Rewards (defaults)

| Side | Buzz Points | Plan discount |
|------|-------------|----------------|
| Referrer (existing family) | +80 | +10% per join (stacks, cap 40%) |
| Referred (new family) | +40 | 20% off first paid plan |

### Flow

1. Parent opens **Parent Access → Refer & earn** (or kid **Account → Invite a friend**) and shares code `BRIT…`.
2. New family enters the code on signup (optional) or later under Refer & earn → Apply code.
3. API `claimReferral` rewards both wallets and credits Buzz on progress snapshots.
4. Next `POST /billing/checkout` applies `peekCheckoutDiscount` / `consumeCheckoutDiscount`.
5. Mentors review **Office → Referrals** (leaders + full table) or the panel on a learner’s parent page.

### Stack pieces

| Layer | Path | Role |
|-------|------|------|
| Store | `api/src/referralStore.ts` | Codes, claims, wallets → `api/data/referrals.json` |
| Parent/kid API | `api/src/routes/referral.ts` | `GET /referral/me`, `POST /referral/claim`, lookup |
| Mentor API | `api/src/routes/guide.ts` | `GET /guide/referrals`, `GET /guide/referrals/parents/:userId` |
| Signup | OTP verify + `referralCode` in shared schemas | Claim on new account |
| App UI | `app/app/parent/refer.tsx`, Account invite | Share / claim / wallet |
| Office UI | `office/app/dashboard/referrals`, `ParentReferralPanel` | Who referred whom + counts |

---

## 🚀 Beta production hosting

Private beta runs on a **direct VM** (not Kubernetes). Full notes: [`deploy/README.md`](./deploy/README.md).

| Layer | Provider | Role |
|-------|----------|------|
| **Compute** | [AIC Cloud](https://aiccloud.in/) Ubuntu VPS (e.g. Essential 1 GB) | `pnpm` + **PM2** (API + Office) + **Nginx** (TLS, static `website/`, reverse proxy) |
| **Database** | [HeavenCloud MongoDB · Mumbai](https://heavencloud.in/service/database/india) | Managed Mongo — set `MEMORY_DB=0` and `MONGODB_URI` |
| **Object storage** | [AceCloud S3-compatible](https://acecloud.ai/cloud/storage/object/) | Billing proofs, chat voice, learn uploads (off VPS disk) |
| **Email** | [Zoho ZeptoMail](https://www.zoho.com/zeptomail/) | Parental transactional mail |
| **OTP** | Hanu OTP | Production SMS |
| **Domains** | Yours (default `britbee.app` / `app.` / `api.` / `office.`) | DNS A records → AIC Cloud VPS IP |
| **CI/CD** | GitHub Actions + Expo EAS | Website · Office · API · Expo web on VPS; Android via EAS |

**Preferred deploy (PM2):** clone on the VPS → `pnpm install` → build website/office → `pm2 start` API + Office → Nginx for HTTPS and static site.

**Optional:** Docker Compose lives under `deploy/` if you want containers later (`pnpm beta:up`).

```bash
cp deploy/env.production.example .env.production   # hosts, JWT, HeavenCloud URI, AceCloud keys, ZeptoMail
```

BritBee public URLs are **your** domains — not `aiccloud.in` / `heavencloud.in` / `acecloud.ai` (those are providers).

---

## 🔁 CI/CD

GitHub Actions + EAS. Workflows live under [`.github/workflows/`](./.github/workflows/). Details: [`deploy/README.md`](./deploy/README.md#cicd).

| Surface | Path | CI (PR / push) | CD |
|---------|------|----------------|-----|
| 🌐 **Marketing website** | `website/` | Build Vite (`ci.yml`) | SSH → build → Nginx static (`deploy-vps.yml`) |
| 🧭 **Backoffice (Office)** | `office/` | `next build` (`ci.yml`) | SSH → build → **PM2** `britbee-office` (`deploy-vps.yml`) |
| 🔌 **API** | `api/` | `tsc --noEmit` (`ci.yml`) | SSH → **PM2** `britbee-api` reload (`deploy-vps.yml`) |
| 💻 **Web app** (kids + parent) | `app/` | `expo export --platform web` (`ci.yml`) | SSH → export → Nginx `app.` host (`deploy-vps.yml`) |
| 📱 **Android app** | `app/` + `eas.json` | — | **EAS Build** (`eas-android.yml`) — manual or `android-v*` tags |

### Pipeline diagram

```
PR / push to master
        │
        ▼
┌───────────────────┐     path filters      ┌────────────────────┐
│  CI (ci.yml)      │ ───────────────────▶  │ website · office   │
│  pnpm install     │                       │ api · expo web     │
└───────────────────┘                       └────────────────────┘
        │
        │ (master only + VPS_DEPLOY_ENABLED)
        ▼
┌───────────────────┐      SSH       ┌─────────────────────────────┐
│ Deploy VPS        │ ─────────────▶ │ AIC Cloud · git pull ·      │
│ deploy-vps.yml    │                │ build · pm2 reload · nginx  │
└───────────────────┘                └─────────────────────────────┘

workflow_dispatch / tag android-v*
        │
        ▼
┌───────────────────┐     EAS cloud    ┌─────────────────────────────┐
│ EAS Android       │ ───────────────▶ │ preview APK / production    │
│ eas-android.yml   │                  │ AAB · Play / internal       │
└───────────────────┘                  └─────────────────────────────┘
```

### GitHub setup (once)

**Actions secrets**

| Secret | Used by |
|--------|---------|
| `VPS_HOST` · `VPS_USER` · `VPS_SSH_KEY` | VPS deploy |
| `VPS_PORT` | Optional (default 22 in runner if unset — set explicitly) |
| `EXPO_TOKEN` | EAS Android ([expo.dev](https://expo.dev) access token) |

**Actions variables**

| Variable | Purpose |
|----------|---------|
| `VPS_DEPLOY_ENABLED=true` | Turns on auto-deploy on push to master |
| `VPS_APP_DIR` | `/opt/britbee` |
| `EXPO_PUBLIC_API_URL` / `NEXT_PUBLIC_API_URL` | e.g. `http://api.britbee.buzz` |

Live CD is **path-aware**: only build/rsync/reload surfaces that changed (`app/` → Expo web only; `api/` → API pm2 reload; shared `packages/` → api+office+app). Manual **Deploy VPS** with force_all does a full release.


### Default public hosts

| Host | Serves |
|------|--------|
| `britbee.app` | Marketing (`website/dist`) |
| `app.britbee.app` | Expo web (`app/dist`) |
| `api.britbee.app` | API :3001 |
| `office.britbee.app` | Office :3003 |

Nginx sketch: [`deploy/nginx.example.conf`](./deploy/nginx.example.conf). PM2: [`deploy/pm2.ecosystem.cjs`](./deploy/pm2.ecosystem.cjs).

### Android release tips

1. `eas login` / set `EXPO_TOKEN` on GitHub.
2. Run **EAS Android** → profile `preview` (internal APK) or `production`.
3. Or tag: `git tag android-v1.0.0 && git push --tags` → production profile.
4. FCM credentials via `eas credentials` (see Push section below).

---

## 📧 Zoho ZeptoMail (parental email)

Transactional email for parents — login alerts, mentor buzzes, class reminders, practice reports, and BritBee Pay updates.

| Piece | Role |
|-------|------|
| `api/src/mail/zeptoMail.ts` | REST client → `https://api.zeptomail.com/v1.1/email` |
| `api/src/mail/mailer.ts` | Login / notify / practice / billing / welcome helpers |
| Auth `POST /login` | Emails a sign-in alert when the account has a real email |
| `notifyBoard.deliver` | Same mentor / daily / class copy also emails parents |
| Billing `logActivity` | Practice milestones + payment / plan emails |

### Setup

1. In [ZeptoMail](https://www.zoho.com/zeptomail/), verify your domain and create a Mail Agent.
2. Copy the **Send Mail Token** (SMTP/API tab).
3. Add to `.env`:

```
ZEPTOMAIL_TOKEN=Zoho-enczapikey ****************
ZEPTOMAIL_FROM_EMAIL=noreply@your-domain.com
ZEPTOMAIL_FROM_NAME=BritBee
# Optional (India DC):
# ZEPTOMAIL_API_URL=https://api.zeptomail.in/v1.1/email
```

4. Restart the API — boot log should show `Email: ZeptoMail ON · from …`.
5. Synthetic phone emails (`*@phone.britbee.local`) are skipped; use a real parent email (or update the demo parent) to receive mail.

Toggle off with `MAIL_ENABLED=0` without removing keys.

## 🔔 Push notifications (phone popups)

Mentors send from **Office** → API writes the **inbox** and fans out an **Expo Push** message. Expo delivers via **FCM** (Android) and **APNs** (iOS) so kids get a real OS popup — lock screen / banner — not just an in-app badge.

| Piece | Role |
|-------|------|
| `expo-notifications` + `expo-device` | Permission, Expo push token, Android channel `britbee-default`, tap → deep link |
| `POST/DELETE /notifications/push-token` | App registers / clears device tokens after login / logout |
| `api/src/pushStore.ts` | Persists tokens in `api/data/push-devices.json` (gitignored) |
| `api/src/pushSend.ts` | Batches to `https://exp.host/--/api/v2/push/send` |
| Mentor **Notify** panel | Selected kids, or whole hive if none selected |

### Local / Expo Go

1. Run API + app; sign in on a **physical phone** (simulators rarely get push).
2. Allow notifications when prompted — token is saved automatically.
3. From Office, send a buzz → phone should popup within seconds.
4. Toggle off with `PUSH_ENABLED=0` on the API if you need to silence sends.

### Production (EAS + FCM/APNs)

1. In `./app`: `npx eas init` — copies the project id into `app.json` → `extra.eas.projectId` (or set `EXPO_PUBLIC_EAS_PROJECT_ID`).
2. **Android:** create a Firebase project, download `google-services.json`, upload FCM V1 credentials in [EAS credentials](https://docs.expo.dev/push-notifications/fcm-credentials/) (`eas credentials`).
3. **iOS:** upload an APNs key via EAS credentials.
4. Build a store/preview binary (`eas build`) — Expo Go is fine for early tests; production popups need your own FCM/APNs credentials on a release build.
5. Keep `PUSH_ENABLED` unset (default on). Set `PUSH_ENABLED=0` only to kill push while leaving inbox intact.

---

## 🔑 Demo accounts

| Surface | Login | Vibes |
|---------|-------|-------|
| 📱 Kids app | `9876543210` / `password123` | OTP only for signup / forgot password |
| 🧭 Office | `guide@britbee.test` / `password123` | Mentor power tools |

Kids login is **phone + password**. SMS OTP is only for first-time signup or password recovery. SMS via [Hanu OTP](https://hanuotp.in/sms-otp-article.php):

```
GET https://api.hanuotp.in/sms-otp.php?apikey=KEY&number=XXXXXXXXXX&OTP=123456&templatesid=SID
```

Set `HANU_OTP_API_KEY` + `HANU_OTP_TEMPLATE_SID` in `.env`. Leave empty locally → OTP shows in an alert.

With `MEMORY_DB=1`, accounts live in `api/data/users.json` and survive API restarts. Device tokens use **SecureStore** (native) / **localStorage** (web) so daily students stay signed in. 🙌

---

## 🗺️ Mobile journey

Splash → Login → Signup / Forgot password → Activities (phonics, daily sentence, story, verbs, prepositions) → Profile → **Parent shell** 👨‍👩‍👧‍👦

---

**Built with 💛 for curious kids and the mentors who cheer them on.**  
*Buzz on.*
