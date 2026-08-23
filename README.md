# 🐝 BritBee Monorepo

> **Practical English for kids — built to help children learn, speak, and grow with confidence.** 🚀  
> One codebase. Three surfaces. Infinite buzz.

Kids learn in the app. Parents guide from the **in-app parent shell**. Mentors run the hive from **Office**. One API powers it all.

---

## 🏛️ Architecture at a glance

| Layer | What it is | Stack | Port / surface |
|-------|------------|-------|----------------|
| 📱 **Kids + Parent App** | Daily practice, quests, chat, live class join + parent PIN shell | **Expo 54** · **React Native** · **React 19** · **expo-router** | Expo Go / iOS / Android / Web |
| 🧭 **Office** | Mentor cockpit — learners, classes, billing, activities, roster | **Next.js 15** · **React 19** · **Lucide** | `:3003` |
| 🔌 **API** | Auth, progress, speech, notify + Expo Push, billing, guide tools | **Node 20+** · **Express** · **TypeScript** · **Zod** | `:3001` |
| 📦 **Shared** | Contracts + SEO config shared across apps | `@britbee/shared` · `@britbee/config` · **Zod** | workspace packages |

```
                    ┌─────────────────────┐
                    │   🐝 Kids + Parent   │
                    │   Expo / RN App     │
                    └──────────┬──────────┘
                               │
                               ▼
┌──────────────┐      ┌─────────────────────┐      ┌──────────────┐
│ 🧭 Office    │─────▶│  🔌 BritBee API     │◀─────│  Shared pkgs │
│ Next.js :3003│      │  Express :3001      │      │  Zod + SEO   │
└──────────────┘      └──────────┬──────────┘      └──────────────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
           💾 Dev: JSON files        🍃 Prod-ready: MongoDB
              MEMORY_DB=1                  MEMORY_DB=0
```

---

## 🧰 Full tech stack (the fun table)

| Area | 🛠️ What we use | 💬 Why it rocks |
|------|----------------|-----------------|
| 🗂️ **Monorepo** | **pnpm** workspaces | One install, shared types, zero copy-paste chaos |
| 🟦 **Language** | **TypeScript** everywhere | Types that travel from API → app → office |
| 📱 **Mobile** | **Expo SDK 54** + **React Native 0.81** | Ship iOS, Android & web from one codebase |
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
| 🔔 **Notifications** | **In-app inbox** + **Expo Push** → **FCM** / **APNs** + **Zoho ZeptoMail** | Mentors buzz kids; phone popups + parental email for login, reminders, reports & billing |
| ☁️ **Push relay** | Expo Push HTTP API (`exp.host`) | Free tier for launch; API stores device tokens, fans out on mentor send |
| 📧 **Email** | **Zoho ZeptoMail** (transactional REST API) | Login alerts, class/practice reminders, student reports, BritBee Pay updates to parents |
| 🎬 **Live class** | Book / go-live / join room flow | Mentors start; kids tap Join |
| 💾 **Database (dev)** | File-backed JSON (`api/data/…`) | Zero infra — restart-safe local hive |
| 🍃 **Database (prod path)** | **MongoDB** via **Mongoose** | Flip `MEMORY_DB=0` → Atlas-ready |
| 🧹 **Tooling** | ESLint · Expo Go · EAS · dotenv · CORS | Clean DX from laptop to classroom |

### 🚫 Intentionally *not* in the stack (yet)

| Skipped | Status |
|---------|--------|
| 🌐 Separate parent website | ❌ Removed — parents live in the app shell |
| 💸 Stripe / Razorpay | ❌ Not needed for launch — BritBee Pay uses mentor GPay QR + manual verify |
| ☁️ Prod host wiring | 🔜 Ready to plug (Atlas + your host of choice) |

---

## 📁 Repo map

| Path | Emoji | Mission |
|------|-------|---------|
| `./api` | 🔌 | Express API — auth, speech, progress, guide, billing, notify |
| `./app` | 📱 | Expo kids app **+** in-app parent shell |
| `./office` | 🧭 | Next.js mentor backoffice |
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

**Production-style Mongo** (e.g. Atlas free tier):

```
MEMORY_DB=0
MONGODB_URI=mongodb+srv://USER:PASS@cluster/britbee
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
*Buzz on.* 🐝
