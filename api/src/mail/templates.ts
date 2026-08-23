const NAVY = "#1A2B5F";
const YELLOW = "#F5C400";
const MUTED = "#6B7280";
const BG = "#F4F6FB";

export function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value: string) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

export function paragraph(text: string) {
  return `<p style="margin:0 0 12px">${escapeHtml(text)}</p>`;
}

export function detailCard(rows: { label: string; value: string }[]) {
  const lines = rows
    .map(
      (r) =>
        `<tr><td style="padding:6px 0;font-family:Arial,sans-serif;color:${MUTED};font-size:12px;width:120px">${escapeHtml(r.label)}</td><td style="padding:6px 0;font-family:Arial,sans-serif;color:${NAVY};font-size:14px;font-weight:700">${escapeHtml(r.value)}</td></tr>`
    )
    .join("");
  return `<table role="presentation" width="100%" style="margin:12px 0 4px;background:${BG};border-radius:12px"><tr><td style="padding:8px 14px"><table role="presentation" width="100%">${lines}</table></td></tr></table>`;
}

export function wrapEmail(opts: {
  preheader?: string;
  title: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
}) {
  const cta =
    opts.ctaLabel && opts.ctaUrl
      ? `<p style="margin:28px 0 8px"><a href="${escapeAttr(opts.ctaUrl)}" style="display:inline-block;background:${YELLOW};color:${NAVY};font-weight:700;text-decoration:none;padding:12px 22px;border-radius:999px;font-family:Arial,sans-serif">${escapeHtml(opts.ctaLabel)}</a></p>`
      : "";
  const pre = opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(opts.preheader)}</div>`
    : "";

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:${BG}">
${pre}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BG};padding:24px 12px">
  <tr><td align="center">
    <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #E6E8EE">
      <tr><td style="background:${NAVY};padding:18px 24px">
        <div style="font-family:Arial,sans-serif;color:${YELLOW};font-size:20px;font-weight:800">🐝 BritBee</div>
        <div style="font-family:Arial,sans-serif;color:#C7D2FE;font-size:12px;margin-top:4px">Practical English for kids</div>
      </td></tr>
      <tr><td style="padding:28px 24px 8px">
        <h1 style="margin:0 0 12px;font-family:Arial,sans-serif;color:${NAVY};font-size:22px;line-height:1.3">${escapeHtml(opts.title)}</h1>
        <div style="font-family:Arial,sans-serif;color:#374151;font-size:15px;line-height:1.55">${opts.bodyHtml}</div>
        ${cta}
      </td></tr>
      <tr><td style="padding:8px 24px 24px">
        <p style="margin:0;font-family:Arial,sans-serif;color:${MUTED};font-size:12px;line-height:1.5">${escapeHtml(opts.footerNote || "You’re receiving this because you’re on a BritBee family account. Mentors buzz from Office; parents guide from the app shell.")}</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}
