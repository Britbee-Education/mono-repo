import { normalizePhone } from "./phone";

const HANU_SMS_URL = process.env.HANU_OTP_URL || "https://api.hanuotp.in/sms-otp.php";

/** Hanu expects a 10-digit Indian mobile, not +91. */
function hanuNumber(phone: string) {
  const full = normalizePhone(phone);
  return full.startsWith("91") && full.length === 12 ? full.slice(2) : full;
}

export function hanuConfigured() {
  return Boolean(process.env.HANU_OTP_API_KEY && process.env.HANU_OTP_TEMPLATE_SID);
}

export function hanuConfigError() {
  if (!process.env.HANU_OTP_API_KEY) return "HANU_OTP_API_KEY is not set";
  if (!process.env.HANU_OTP_TEMPLATE_SID) return "HANU_OTP_TEMPLATE_SID is not set";
  return null;
}

type HanuResponse = {
  status?: string;
  message?: string;
  [key: string]: unknown;
};

function parseHanuBody(text: string): HanuResponse | string {
  try {
    return JSON.parse(text) as HanuResponse;
  } catch {
    return text;
  }
}

function hanuOk(body: HanuResponse | string) {
  if (typeof body === "string") return false;
  const status = String(body.status || "").toLowerCase();
  return status === "success" || status === "ok" || status === "sent";
}

/** Send an SMS OTP via Hanu OTP. Docs: https://hanuotp.in/sms-otp-article.php */
export async function sendHanuSmsOtp(phone: string, otp: string) {
  const apikey = process.env.HANU_OTP_API_KEY;
  const templatesid = process.env.HANU_OTP_TEMPLATE_SID;
  const number = hanuNumber(phone);

  if (!apikey || !templatesid) {
    console.log(`[otp] Hanu not fully configured (${hanuConfigError()}) — would send ${otp} to ${number}`);
    return { ok: true, skipped: true as const };
  }

  const url = new URL(HANU_SMS_URL);
  url.searchParams.set("apikey", apikey);
  url.searchParams.set("number", number);
  url.searchParams.set("OTP", otp);
  url.searchParams.set("templatesid", templatesid);

  const res = await fetch(url.toString());
  const text = await res.text();
  const body = parseHanuBody(text);

  if (!res.ok || !hanuOk(body)) {
    const message =
      typeof body === "object" && body.message
        ? String(body.message)
        : text || `Hanu HTTP ${res.status}`;
    console.error("[otp] Hanu SMS failed", res.status, body);
    throw new Error(message);
  }

  console.log("[otp] Hanu SMS sent to", number, body);
  return { ok: true, skipped: false as const, response: body };
}
