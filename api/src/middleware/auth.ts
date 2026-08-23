import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { users, type AppUser } from "../users";

const JWT_SECRET = process.env.JWT_SECRET || "britbee-dev-secret-change-me";

export type AuthPayload = { sub: string; role: string; email: string; purpose?: string };
export type ResetPayload = { sub: string; purpose: "password_reset"; phone: string };

export function signToken(user: AppUser) {
  const payload: AuthPayload = {
    sub: String(user._id),
    role: user.role,
    email: user.email || "",
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "3650d" });
}

export function signResetToken(user: AppUser) {
  const payload: ResetPayload = {
    sub: String(user._id),
    purpose: "password_reset",
    phone: user.phone || "",
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
}

export function readResetToken(token: string): ResetPayload {
  const decoded = jwt.verify(token, JWT_SECRET) as ResetPayload;
  if (decoded.purpose !== "password_reset" || !decoded.sub) {
    throw new Error("Invalid reset token");
  }
  return decoded;
}

export function toPublicUser(user: AppUser) {
  const effectiveChild =
    user.child ||
    // Parents may store multiple children in a new `children` array on the DB.
    // We keep `child` in sync as "active child" so the rest of the app can stay unchanged.
    // This fallback is here so old data still works during migration.
    ((user as any).children?.[Number((user as any).activeChildIndex) || 0] as any) ||
    undefined;
  return {
    id: String(user._id),
    email: user.email,
    name: user.name,
    role: user.role,
    phone: user.phone,
    hasPassword: Boolean(user.passwordHash),
    child: effectiveChild,
    children: Array.isArray((user as any).children) ? (user as any).children : undefined,
    activeChildIndex: Number((user as any).activeChildIndex) || 0,
    parentSettings: (user as any).parentSettings || undefined,
  };
}

export type AuthedRequest = Request & { user?: AppUser; auth?: AuthPayload };

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const token = header.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    if (decoded.purpose) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const user = await users.findById(decoded.sub);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    req.user = user;
    req.auth = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden for this portal" });
    }
    next();
  };
}
