import { Router } from "express";
import {
  loginSchema,
  signupSchema,
  PORTAL_ROLE,
  sendOtpSchema,
  verifyOtpSchema,
  childProfileSchema,
  setPasswordSchema,
  resetPasswordSchema,
} from "@britbee/shared";
import { users, hashPassword, comparePassword } from "../users";
import { logActivity } from "../billingStore";
import {
  requireAuth,
  signToken,
  signResetToken,
  readResetToken,
  toPublicUser,
  type AuthedRequest,
} from "../middleware/auth";
import { isValidMobile, normalizePhone, phoneEmail } from "../utils/phone";
import { generateOtp, saveOtp, consumeOtp } from "../otpStore";
import { hanuConfigured, sendHanuSmsOtp } from "../utils/hanuOtp";
import { memoryDb } from "../memory";
import { mailLoginAlert, mailWelcomeParent } from "../mail/mailer";

export const authRouter = Router();

authRouter.post("/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { name, email, password, phone, role, child, referralCode } = parsed.data;
  const existing = await users.findByEmail(email);
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const passwordHash = await hashPassword(password);
  const user = await users.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    phone: phone ? normalizePhone(phone) : undefined,
    role,
    child,
    ...(role === "parent" && child
      ? { children: [child], activeChildIndex: 0 }
      : undefined),
  });

  if (referralCode) {
    const { claimReferral } = await import("../referralStore");
    claimReferral({
      code: referralCode,
      referredId: String(user._id),
      referredName: name,
      referredChild: child?.childName,
    });
  }

  return res.status(201).json({ token: signToken(user), user: toPublicUser(user) });
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid credentials payload" });
  }
  const { email, phone, password, portal } = parsed.data;
  const user = email?.trim()
    ? await users.findByEmail(email.toLowerCase())
    : await users.findByPhone(normalizePhone(phone || ""));
  if (!user) {
    if (phone) {
      console.log(`[auth] login miss for ${normalizePhone(phone)} (${memoryDb.enabled ? memoryDb.count() : "mongo"} accounts)`);
    }
    return res.status(401).json({
      error: email ? "No account found for this email." : "No account found for this number.",
      code: "NO_ACCOUNT",
    });
  }
  if (!user.passwordHash) {
    return res.status(403).json({
      error: "This account has no password yet. Create your account or recover it with OTP, then set a password.",
      code: "NEEDS_PASSWORD",
    });
  }
  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({
      error: "That password is incorrect.",
      code: "INVALID_PASSWORD",
    });
  }

  if (portal) {
    const expected = PORTAL_ROLE[portal];
    if (portal === "mobile") {
      if (user.role !== "learner" && user.role !== "parent") {
        return res.status(403).json({ error: "This account cannot use the kids app" });
      }
    } else if (expected && user.role !== expected) {
      return res.status(403).json({ error: `This account is not allowed on ${portal}` });
    }
  }

  mailLoginAlert({
    userId: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    portal: portal || undefined,
  });

  return res.json({ token: signToken(user), user: toPublicUser(user) });
});

authRouter.post("/otp/send", async (req, res) => {
  const parsed = sendOtpSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Valid phone number and purpose required" });
  const phone = normalizePhone(parsed.data.phone);
  const { purpose } = parsed.data;
  if (!isValidMobile(phone)) {
    return res.status(400).json({ error: "Enter a valid 10-digit Indian mobile number" });
  }

  const existing = await users.findByPhone(phone);
  if (purpose === "signup" && existing?.passwordHash) {
    return res.status(409).json({
      error: "An account already exists for this number. Log in with your password.",
      code: "ACCOUNT_EXISTS",
    });
  }
  if (purpose === "reset" && !existing) {
    return res.status(404).json({ error: "No account found for this number." });
  }

  const otp = generateOtp();
  saveOtp(phone, otp, purpose);
  try {
    await sendHanuSmsOtp(phone, otp);
  } catch (e: any) {
    return res.status(502).json({ error: e.message || "Could not send OTP" });
  }

  return res.json({
    ok: true,
    phone,
    purpose,
    ...(hanuConfigured() ? {} : { devOtp: otp }),
  });
});

authRouter.post("/otp/verify", async (req, res) => {
  const parsed = verifyOtpSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Phone, OTP, and purpose required" });
  const phone = normalizePhone(parsed.data.phone);
  const { otp, portal, name, child, purpose, referralCode } = parsed.data;
  if (!isValidMobile(phone)) {
    return res.status(400).json({ error: "Enter a valid 10-digit Indian mobile number" });
  }

  const check = consumeOtp(phone, otp.trim(), purpose);
  if (!check.ok) return res.status(401).json({ error: check.error });

  if (purpose === "reset") {
    const user = await users.findByPhone(phone);
    if (!user) return res.status(404).json({ error: "No account found for this number." });
    return res.json({ resetToken: signResetToken(user), phone });
  }

  let user = await users.findByPhone(phone);
  if (user?.passwordHash) {
    return res.status(409).json({
      error: "An account already exists for this number. Log in with your password.",
      code: "ACCOUNT_EXISTS",
    });
  }

  const isNew = !user;
  if (!user) {
    user = await users.create({
      name: name || "BritBee Parent",
      phone,
      email: phoneEmail(phone),
      role: "parent",
      child,
      children: child ? [child] : undefined,
      activeChildIndex: 0,
    });
  } else {
    if (name && user.name === "BritBee Parent") user.name = name;
    if (child) user.child = child;
    if (child) {
      (user as any).children = Array.isArray((user as any).children) && (user as any).children.length ? (user as any).children : [child];
      (user as any).activeChildIndex = Number((user as any).activeChildIndex) || 0;
    }
    if ((user as any).save) await (user as any).save();
    else {
      await users.update(String(user._id), { name: user.name, child: user.child, children: (user as any).children, activeChildIndex: (user as any).activeChildIndex });
    }
  }

  if (portal === "mobile" && user.role !== "learner" && user.role !== "parent") {
    return res.status(403).json({ error: "This account cannot use the kids app" });
  }

  if (isNew) {
    mailWelcomeParent({ userId: String(user._id), name: user.name, email: (user as any).email });
    if (referralCode) {
      const { claimReferral } = await import("../referralStore");
      claimReferral({
        code: referralCode,
        referredId: String(user._id),
        referredName: user.name,
        referredChild: child?.childName || (user as any).child?.childName,
      });
    }
  }

  return res.json({
    token: signToken(user),
    user: toPublicUser(user),
    isNew,
    needsPassword: !user.passwordHash,
  });
});

authRouter.post("/password", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = setPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }
  const user = req.user!;
  const passwordHash = await hashPassword(parsed.data.password);
  const updated = await users.update(String(user._id), { passwordHash });
  if (!updated) return res.status(404).json({ error: "Account not found" });
  return res.json({ user: toPublicUser(updated) });
});

authRouter.post("/password/reset", async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Phone, reset token, and a new password are required" });
  }
  const phone = normalizePhone(parsed.data.phone);
  if (!isValidMobile(phone)) {
    return res.status(400).json({ error: "Enter a valid 10-digit Indian mobile number" });
  }

  let payload;
  try {
    payload = readResetToken(parsed.data.resetToken);
  } catch {
    return res.status(401).json({ error: "Reset link expired. Request a new OTP." });
  }
  if (payload.phone && payload.phone !== phone) {
    return res.status(401).json({ error: "Reset token does not match this number." });
  }

  const user = await users.findById(payload.sub);
  if (!user || (user.phone && user.phone !== phone)) {
    return res.status(401).json({ error: "Reset link expired. Request a new OTP." });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const updated = await users.update(String(user._id), { passwordHash });
  if (!updated) return res.status(404).json({ error: "Account not found" });

  return res.json({ token: signToken(updated), user: toPublicUser(updated) });
});

authRouter.patch("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = req.user!;
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : undefined;
  const childParsed = childProfileSchema.safeParse(req.body?.child ?? {});
  const parentSettings = req.body?.parentSettings;
  if (name) user.name = name;
  if (childParsed.success && req.body?.child) {
    const activeIdx = Number((user as any).activeChildIndex) || 0;
    const nextChild = { ...(user.child || {}), ...childParsed.data };
    user.child = nextChild;
    if ((user as any).children && Array.isArray((user as any).children)) {
      (user as any).children[activeIdx] = nextChild;
    } else {
      (user as any).children = [nextChild];
      (user as any).activeChildIndex = 0;
    }
  }
  if (parentSettings && typeof parentSettings === "object") {
    const prev = ((user as any).parentSettings || {}) as Record<string, unknown>;
    const nextPaused =
      typeof parentSettings.paused === "boolean" ? parentSettings.paused : Boolean(prev.paused);
    if (user.role === "parent" && typeof parentSettings.paused === "boolean" && nextPaused !== Boolean(prev.paused)) {
      logActivity(String(user._id), {
        type: "settings",
        title: nextPaused ? "Practice paused" : "Practice resumed",
        detail: nextPaused ? "Activities locked until you turn practice back on." : "Daily path and Hive are open again.",
      });
    }
    (user as any).parentSettings = {
      paused: nextPaused,
      planId: ["trial", "monthly", "yearly"].includes(parentSettings.planId) ? parentSettings.planId : prev.planId || "trial",
      planSince: typeof parentSettings.planSince === "string" ? parentSettings.planSince : (prev.planSince as string | undefined),
    };
  }
  if ((user as any).save) await (user as any).save();
  else {
    await users.update(String(user._id), {
      name: user.name,
      child: user.child,
      children: (user as any).children,
      activeChildIndex: (user as any).activeChildIndex,
      parentSettings: (user as any).parentSettings,
    });
  }
  return res.json({ user: toPublicUser(user) });
});

authRouter.get("/me/children", requireAuth, async (req: AuthedRequest, res) => {
  const user = req.user!;
  if (user.role !== "parent") return res.status(403).json({ error: "Parent access only." });
  const children = Array.isArray((user as any).children) ? ((user as any).children as any[]) : [];
  const activeChildIndex = Number((user as any).activeChildIndex) || 0;
  const hydratedChildren =
    children.length ? children : user.child ? [user.child] : [];
  return res.json({ children: hydratedChildren, activeChildIndex });
});

authRouter.post("/me/children", requireAuth, async (req: AuthedRequest, res) => {
  const user = req.user!;
  if (user.role !== "parent") return res.status(403).json({ error: "Parent access only." });
  const childParsed = childProfileSchema.safeParse(req.body?.child ?? {});
  if (!childParsed.success) return res.status(400).json({ error: childParsed.error.flatten() });
  const nextChild = childParsed.data.childName
    ? childParsed.data
    : { childName: String((req.body?.child?.childName || "")).trim(), ...childParsed.data };

  if (!nextChild.childName || !String(nextChild.childName).trim()) return res.status(400).json({ error: "Child name is required." });

  const children = Array.isArray((user as any).children)
    ? (((user as any).children as any[]) || [])
    : user.child
      ? [user.child]
      : [];
  children.push(nextChild);
  const activeChildIndex = children.length - 1;
  user.child = nextChild;
  (user as any).children = children;
  (user as any).activeChildIndex = activeChildIndex;
  if ((user as any).save) await (user as any).save();
  else {
    await users.update(String(user._id), { child: user.child, children, activeChildIndex });
  }
  return res.status(201).json({ children, activeChildIndex, user: toPublicUser(user) });
});

authRouter.patch("/me/children/:index", requireAuth, async (req: AuthedRequest, res) => {
  const user = req.user!;
  if (user.role !== "parent") return res.status(403).json({ error: "Parent access only." });
  const idx = Number(req.params.index);
  if (!Number.isFinite(idx) || idx < 0) return res.status(400).json({ error: "Invalid index." });
  const childParsed = childProfileSchema.safeParse(req.body?.child ?? {});
  if (!childParsed.success) return res.status(400).json({ error: childParsed.error.flatten() });

  const children = Array.isArray((user as any).children) ? (((user as any).children as any[]) || []) : user.child ? [user.child] : [];
  if (!children[idx]) return res.status(404).json({ error: "Child not found." });

  children[idx] = { ...(children[idx] || {}), ...childParsed.data };
  if (idx === Number((user as any).activeChildIndex) || (Number((user as any).activeChildIndex) || 0) === idx) {
    user.child = children[idx];
  }
  (user as any).children = children;

  if ((user as any).save) await (user as any).save();
  else {
    await users.update(String(user._id), { child: user.child, children, activeChildIndex: (user as any).activeChildIndex });
  }
  return res.json({ children, activeChildIndex: Number((user as any).activeChildIndex) || 0, user: toPublicUser(user) });
});

authRouter.post("/me/children/active", requireAuth, async (req: AuthedRequest, res) => {
  const user = req.user!;
  if (user.role !== "parent") return res.status(403).json({ error: "Parent access only." });
  const idx = typeof req.body?.index === "number" ? req.body.index : Number(req.body?.index);
  if (!Number.isFinite(idx) || idx < 0) return res.status(400).json({ error: "Invalid index." });
  const children = Array.isArray((user as any).children) ? (((user as any).children as any[]) || []) : user.child ? [user.child] : [];
  if (!children[idx]) return res.status(404).json({ error: "Child not found." });
  (user as any).activeChildIndex = idx;
  user.child = children[idx];

  if ((user as any).save) await (user as any).save();
  else {
    await users.update(String(user._id), { child: user.child, children, activeChildIndex: idx });
  }
  return res.json({ children, activeChildIndex: idx, user: toPublicUser(user) });
});

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = req.user!;
  return res.json({ user: toPublicUser(user), token: signToken(user) });
});

authRouter.post("/logout", (_req, res) => res.json({ ok: true }));
