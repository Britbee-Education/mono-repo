# BritBee

Kids English learning monorepo: mobile app (kids + parent shell), guide office, and API.

## Structure

```
./api         Express API (file-backed local DB, or MongoDB)
./app         Expo kids app + in-app parent shell (iOS / Android / web)
./office      Next.js guide office         :3003
./packages    shared types + design tokens
./design      UI mockup references
```

## Prerequisites

- Node 20+
- pnpm 9+ (`npm i -g pnpm`)
- Optional: MongoDB (default `MEMORY_DB=1` stores accounts in `api/data/users.json`)

## Setup

```bash
cp .env.example .env   # already defaults to MEMORY_DB-friendly values — set MEMORY_DB=1 in .env
pnpm install
```

Ensure `.env` contains:

```
MEMORY_DB=1
JWT_SECRET=britbee-dev-secret-change-me
API_PORT=3001
EXPO_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001
```

For a real MongoDB instead:

```
MEMORY_DB=0
MONGODB_URI=mongodb://127.0.0.1:27017/britbee
pnpm seed
```

## How to preview

Open **3 terminals** (or use the scripts below).

### 1. API (required for login)

```bash
pnpm dev:api
```

Health check: http://localhost:3001/health

### 2. Kids mobile app (Expo) — includes parent shell

```bash
pnpm dev:app
```

Then in the Expo terminal:

- press `w` for **web** (http://localhost:8081)
- press `i` for **iOS Simulator**
- press `a` for **Android emulator**
- or scan the QR code with **Expo Go** on a phone

> On a physical device, set `EXPO_PUBLIC_API_URL` in `app/.env` to your machine LAN IP (e.g. `http://192.168.1.10:3001`), not `localhost`.

Parents unlock the in-app parent shell with their PIN — there is no separate parent website.

Quick web-only:

```bash
pnpm --filter @britbee/app web
```

### 3. Guide office

```bash
pnpm dev:office
```

Open http://localhost:3003  
Demo: `guide@britbee.test` / `password123`

### One-shot office + API

```bash
pnpm dev:webs
```

Starts api + office together. Still run `pnpm dev:app` separately for Expo.

## Expo Go note

Play Store Expo Go supports **SDK 54**. This app targets SDK 54 so scanning the QR works. Keep Expo Go updated from the Play Store.

## Demo accounts

| Surface | Login |
|---------|-------|
| Kids app | `9876543210` / `password123` (OTP only for new signup or forgot password) |
| Office | `guide@britbee.test` / `password123` |

Kids app login is **phone + password**. SMS OTP is used only to create an account the first time, or to recover a forgotten password. After that, no OTP is sent. SMS is sent via [Hanu OTP](https://hanuotp.in/sms-otp-article.php):

```
GET https://api.hanuotp.in/sms-otp.php?apikey=KEY&number=XXXXXXXXXX&OTP=123456&templatesid=SID
```

Set both `HANU_OTP_API_KEY` and `HANU_OTP_TEMPLATE_SID` in `.env` (Template SID is in the Hanu dashboard). Leave them empty for local/dev (OTP is shown in an alert).

Accounts are saved on disk at `api/data/users.json` when `MEMORY_DB=1`, so signups survive API restarts. Kids-app login uses a long-lived token stored on the device (SecureStore on iOS/Android, localStorage on web). Opening the app refreshes it, so daily students stay signed in.

## Mobile screens included

Splash → Login → Signup / Forgot password → Activities (phonics, daily sentence, story, verbs, prepositions) → Profile → Parent shell.
