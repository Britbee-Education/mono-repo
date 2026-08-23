/**
 * Zoho ZeptoMail REST client.
 * @see https://www.zoho.com/zeptomail/help/api/email-sending.html
 */

export type MailAddress = { address: string; name?: string };

export type SendMailInput = {
  to: MailAddress | MailAddress[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: MailAddress;
  tag?: string;
};

function apiUrl() {
  return (process.env.ZEPTOMAIL_API_URL || "https://api.zeptomail.com/v1.1/email").trim().replace(/\/$/, "");
}

function token() {
  return (process.env.ZEPTOMAIL_TOKEN || process.env.ZEPTOMAIL_SEND_MAIL_TOKEN || "").trim();
}

export function mailEnabled() {
  if (process.env.MAIL_ENABLED === "0" || process.env.ZEPTOMAIL_ENABLED === "0") return false;
  return Boolean(token() && fromAddress());
}

export function fromAddress(): MailAddress | null {
  const address = (process.env.ZEPTOMAIL_FROM_EMAIL || process.env.ZEPTOMAIL_FROM_ADDRESS || "").trim();
  if (!address) return null;
  return { address, name: (process.env.ZEPTOMAIL_FROM_NAME || "BritBee").trim() || "BritBee" };
}

function asList(to: MailAddress | MailAddress[]) {
  return (Array.isArray(to) ? to : [to]).filter((r) => r.address?.includes("@"));
}

/** Fire-and-forget; never throws to callers. */
export function sendZeptoMail(input: SendMailInput) {
  if (!mailEnabled()) return;
  const from = fromAddress();
  const key = token();
  if (!from || !key) return;
  const recipients = asList(input.to);
  if (!recipients.length) return;

  const auth = /^zoho-/i.test(key) ? key : `Zoho-enczapikey ${key}`;

  void (async () => {
    try {
      const res = await fetch(apiUrl(), {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: auth,
        },
        body: JSON.stringify({
          from: { address: from.address, name: from.name },
          to: recipients.map((r) => ({
            email_address: { address: r.address, name: r.name || r.address.split("@")[0] },
          })),
          subject: input.subject,
          htmlbody: input.html,
          ...(input.text ? { textbody: input.text } : {}),
          ...(input.replyTo
            ? { reply_to: [{ address: input.replyTo.address, name: input.replyTo.name || input.replyTo.address }] }
            : {}),
          track_clicks: true,
          track_opens: true,
          ...(input.tag ? { client_reference: input.tag.slice(0, 80) } : {}),
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.warn(`[mail] ZeptoMail HTTP ${res.status}: ${body.slice(0, 280)}`);
      }
    } catch (err) {
      console.warn("[mail] ZeptoMail send failed:", err instanceof Error ? err.message : err);
    }
  })();
}

export function mailStatusLine() {
  if (process.env.MAIL_ENABLED === "0" || process.env.ZEPTOMAIL_ENABLED === "0") {
    return "ZeptoMail OFF (MAIL_ENABLED=0)";
  }
  if (!token()) return "ZeptoMail OFF (set ZEPTOMAIL_TOKEN)";
  if (!fromAddress()) return "ZeptoMail OFF (set ZEPTOMAIL_FROM_EMAIL)";
  return `ZeptoMail ON · from ${fromAddress()!.address}`;
}
