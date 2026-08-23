/** Normalize Indian-first mobile numbers to digits with country code, e.g. 919876543210 */
export function normalizePhone(raw: string) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  if (digits.startsWith("91") && digits.length === 12) return digits;
  if (digits.startsWith("91") && digits.length > 12) return digits.slice(-12);
  return digits;
}

export function phoneEmail(phone: string) {
  return `${phone}@phone.britbee.local`;
}

export function isValidMobile(phone: string) {
  return /^91\d{10}$/.test(phone);
}
