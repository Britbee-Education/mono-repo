import { users } from "../users";
import { mailEnabled, sendZeptoMail, type MailAddress } from "./zeptoMail";
import { detailCard, paragraph, wrapEmail } from "./templates";

export function isSyntheticEmail(email?: string | null) {
  if (!email) return true;
  const e = email.trim().toLowerCase();
  if (!e.includes("@")) return true;
  if (e.endsWith("@phone.britbee.local")) return true;
  if (e.endsWith("@britbee.local")) return true;
  if (e.includes("@phone.")) return true;
  return false;
}

function appLink() {
  return (process.env.MAIL_APP_URL || process.env.EXPO_PUBLIC_APP_URL || "https://britbee.app").trim();
}

export type MailContact = {
  userId: string;
  email: string;
  name: string;
  role: string;
  childName?: string;
};

export async function resolveMailContact(userId: string): Promise<MailContact | null> {
  if (!mailEnabled()) return null;
  const user = await users.findById(userId);
  if (!user) return null;
  const email = String((user as { email?: string }).email || "").trim();
  if (isSyntheticEmail(email)) return null;
  const anyUser = user as {
    _id: string;
    name: string;
    role: string;
    child?: { childName?: string };
    children?: { childName?: string }[];
    activeChildIndex?: number;
  };
  const child =
    anyUser.child?.childName ||
    (Array.isArray(anyUser.children)
      ? anyUser.children[Number(anyUser.activeChildIndex) || 0]?.childName
      : undefined);
  return {
    userId: String(anyUser._id),
    email,
    name: String(anyUser.name || "BritBee family"),
    role: String(anyUser.role || ""),
    childName: child ? String(child) : undefined,
  };
}

function toAddr(c: MailContact): MailAddress {
  return { address: c.email, name: c.name };
}

/** Login / session alert. */
export function mailLoginAlert(input: {
  userId: string;
  name: string;
  email?: string | null;
  role: string;
  portal?: string;
  when?: string;
}) {
  if (!mailEnabled()) return;
  if (isSyntheticEmail(input.email)) return;
  const when = input.when || new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const portal = input.portal || (input.role === "guide" ? "Office" : "BritBee app");
  const html = wrapEmail({
    preheader: `New sign-in on ${portal}`,
    title: "New sign-in on your BritBee account",
    bodyHtml:
      paragraph(`Hi ${input.name.split(" ")[0] || "there"},`) +
      paragraph(`Someone just signed in to BritBee (${portal}). If this was you, you’re all set.`) +
      detailCard([
        { label: "Account", value: input.email || "—" },
        { label: "Role", value: input.role },
        { label: "When (IST)", value: when },
      ]) +
      paragraph("If you didn’t sign in, reset your password from the app and tell your mentor."),
    ctaLabel: "Open BritBee",
    ctaUrl: appLink(),
  });
  sendZeptoMail({
    to: { address: input.email!, name: input.name },
    subject: "BritBee · New sign-in",
    html,
    text: `New BritBee sign-in for ${input.email} on ${portal} at ${when}.`,
    tag: `login:${input.userId}`,
  });
}

/** Mentor buzz / class / daily reminder → email. */
export function mailNotifyToUsers(
  rows: { userId: string; title: string; body: string; kind?: string; source?: string }[]
) {
  if (!mailEnabled() || !rows.length) return;
  void (async () => {
    for (const row of rows) {
      const contact = await resolveMailContact(row.userId);
      if (!contact) continue;
      const childBit = contact.childName ? ` for ${contact.childName}` : "";
      const html = wrapEmail({
        preheader: row.title,
        title: row.title,
        bodyHtml:
          paragraph(`Hi ${contact.name.split(" ")[0] || "there"},`) +
          paragraph(row.body) +
          detailCard([
            ...(contact.childName ? [{ label: "Child", value: contact.childName }] : []),
            { label: "Type", value: row.kind || row.source || "update" },
          ]) +
          paragraph(`Open the BritBee parent shell${childBit} to follow up.`),
        ctaLabel: "Open parent shell",
        ctaUrl: appLink(),
      });
      sendZeptoMail({
        to: toAddr(contact),
        subject: `BritBee · ${row.title}`.slice(0, 120),
        html,
        text: `${row.title}\n\n${row.body}`,
        tag: `notify:${row.userId}:${row.source || "buzz"}`,
      });
    }
  })();
}

/** Practice milestones & streak → parental communication. */
export function mailPracticeReport(input: {
  userId: string;
  title: string;
  detail?: string;
  childName?: string;
  meta?: Record<string, unknown>;
}) {
  if (!mailEnabled()) return;
  void (async () => {
    const contact = await resolveMailContact(input.userId);
    if (!contact) return;
    const child = input.childName || contact.childName || "Your child";
    const streak = input.meta?.streak != null ? String(input.meta.streak) : undefined;
    const points = input.meta?.points != null ? String(input.meta.points) : undefined;
    const html = wrapEmail({
      preheader: `${child}: ${input.title}`,
      title: "Student practice report",
      bodyHtml:
        paragraph(`Hi ${contact.name.split(" ")[0] || "there"},`) +
        paragraph(`Here’s a quick update on ${child}'s BritBee practice.`) +
        detailCard([
          { label: "Update", value: input.title },
          ...(input.detail ? [{ label: "Detail", value: input.detail }] : []),
          ...(streak ? [{ label: "Streak", value: `${streak} day(s)` }] : []),
          ...(points ? [{ label: "Points", value: points }] : []),
        ]),
      ctaLabel: "See progress",
      ctaUrl: appLink(),
    });
    sendZeptoMail({
      to: toAddr(contact),
      subject: `BritBee · ${child}: ${input.title}`.slice(0, 120),
      html,
      text: `${input.title}${input.detail ? ` — ${input.detail}` : ""}`,
      tag: `practice:${input.userId}`,
    });
  })();
}

/** Billing / plan lifecycle. */
export function mailBillingEvent(input: {
  userId: string;
  title: string;
  detail?: string;
  type?: string;
}) {
  if (!mailEnabled()) return;
  void (async () => {
    const contact = await resolveMailContact(input.userId);
    if (!contact) return;
    const html = wrapEmail({
      preheader: input.title,
      title: input.title,
      bodyHtml:
        paragraph(`Hi ${contact.name.split(" ")[0] || "there"},`) +
        paragraph(input.detail || "There’s an update on your BritBee Pay / subscription.") +
        detailCard([
          { label: "Event", value: input.type || "billing" },
          ...(contact.childName ? [{ label: "Child", value: contact.childName }] : []),
        ]),
      ctaLabel: "Open billing",
      ctaUrl: appLink(),
    });
    sendZeptoMail({
      to: toAddr(contact),
      subject: `BritBee · ${input.title}`.slice(0, 120),
      html,
      text: `${input.title}${input.detail ? `\n${input.detail}` : ""}`,
      tag: `billing:${input.userId}`,
    });
  })();
}

/** Welcome after parent OTP / signup. */
export function mailWelcomeParent(input: { userId: string; name: string; email?: string | null }) {
  if (!mailEnabled() || isSyntheticEmail(input.email)) return;
  const html = wrapEmail({
    preheader: "Welcome to BritBee",
    title: "Welcome to the hive",
    bodyHtml:
      paragraph(`Hi ${input.name.split(" ")[0] || "there"},`) +
      paragraph(
        "Your BritBee parent account is ready. Kids practice in the app; you guide from the in-app parent shell — progress, billing, and mentor buzzes all in one place."
      ) +
      paragraph("We’ll email login alerts, practice milestones, class reminders, and billing updates to this address."),
    ctaLabel: "Open BritBee",
    ctaUrl: appLink(),
  });
  sendZeptoMail({
    to: { address: input.email!, name: input.name },
    subject: "Welcome to BritBee",
    html,
    text: "Welcome to BritBee — your parent account is ready.",
    tag: `welcome:${input.userId}`,
  });
}
