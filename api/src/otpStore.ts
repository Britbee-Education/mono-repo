import crypto from "crypto";

type OtpPurpose = "signup" | "reset";

type OtpRecord = { hash: string; expiresAt: number; attempts: number; purpose: OtpPurpose };

const g = globalThis as unknown as { __britbeeOtps?: Map<string, OtpRecord> };

function store() {
  if (!g.__britbeeOtps) g.__britbeeOtps = new Map();
  return g.__britbeeOtps;
}

function hashOtp(phone: string, otp: string) {
  return crypto.createHash("sha256").update(`${phone}:${otp}`).digest("hex");
}

export function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function saveOtp(phone: string, otp: string, purpose: OtpPurpose, ttlMs = 5 * 60 * 1000) {
  store().set(phone, {
    hash: hashOtp(phone, otp),
    expiresAt: Date.now() + ttlMs,
    attempts: 0,
    purpose,
  });
}

export function consumeOtp(phone: string, otp: string, purpose: OtpPurpose) {
  const rec = store().get(phone);
  if (!rec) return { ok: false, error: "No OTP requested for this number" };
  if (rec.purpose !== purpose) {
    return { ok: false, error: "OTP was requested for a different step. Request a new one." };
  }
  if (Date.now() > rec.expiresAt) {
    store().delete(phone);
    return { ok: false, error: "OTP expired. Request a new one." };
  }
  rec.attempts += 1;
  if (rec.attempts > 5) {
    store().delete(phone);
    return { ok: false, error: "Too many attempts. Request a new OTP." };
  }
  if (rec.hash !== hashOtp(phone, otp)) {
    return { ok: false, error: "Invalid OTP" };
  }
  store().delete(phone);
  return { ok: true };
}
