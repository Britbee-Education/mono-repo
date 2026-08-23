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
| 🔌 **API** | Auth, progress, speech, notify, billing, guide tools | **Node 20+** · **Express** · **TypeScript** · **Zod** | `:3001` |
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
| 💳 **Billing** | In-house subscription store (simulated for now) | Parent shell ↔ Office stay in sync |
| 🔔 **Notifications** | In-app inbox (**FCM-free** today) | Mentors buzz kids without Firebase yet |
| 🎬 **Live class** | Book / go-live / join room flow | Mentors start; kids tap Join |
| 💾 **Database (dev)** | File-backed JSON (`api/data/…`) | Zero infra — restart-safe local hive |
| 🍃 **Database (prod path)** | **MongoDB** via **Mongoose** | Flip `MEMORY_DB=0` → Atlas-ready |
| 🧹 **Tooling** | ESLint · Expo Go · dotenv · CORS | Clean DX from laptop to classroom |

### 🚫 Intentionally *not* in the stack (yet)

| Skipped | Status |
|---------|--------|
| 🌐 Separate parent website | ❌ Removed — parents live in the app shell |
| 🔥 Firebase / FCM push | ❌ Not configured — inbox only for now |
| 💸 Stripe / Razorpay | ❌ Billing is simulated; gateway later |
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
