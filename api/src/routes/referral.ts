import { Router } from "express";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth";
import {
  claimReferral,
  findReferralCode,
  getReferralMe,
  peekCheckoutDiscount,
  seedDemoReferrals,
} from "../referralStore";
import { users } from "../users";

export const referralRouter = Router();

referralRouter.get("/lookup/:code", (req, res) => {
  const row = findReferralCode(String(req.params.code || ""));
  if (!row) return res.status(404).json({ error: "Referral code not found." });
  return res.json({
    code: row.code,
    valid: true,
    welcomeDiscountPct: 20,
  });
});

referralRouter.use(requireAuth, requireRole("parent", "learner"));

referralRouter.get("/me", async (req: AuthedRequest, res) => {
  const userId = String(req.user!._id);
  const user = await users.findById(userId);
  const name = user?.name || "Family";
  // Seed a couple of demo rows for the seeded parent so Office looks alive in local demos.
  const email = (user as { email?: string } | null)?.email || "";
  const phone = String(user?.phone || "");
  const me =
    email.includes("parent@britbee") || phone.includes("9876543210")
      ? seedDemoReferrals(userId, name)
      : getReferralMe(userId, name);
  return res.json({
    ...me,
    checkoutDiscountPct: peekCheckoutDiscount(userId),
  });
});

referralRouter.post("/claim", async (req: AuthedRequest, res) => {
  const userId = String(req.user!._id);
  const code = typeof req.body?.code === "string" ? req.body.code : "";
  const user = await users.findById(userId);
  const childName =
    (user as { child?: { childName?: string }; children?: { childName?: string }[] } | null)?.child?.childName ||
    (user as { children?: { childName?: string }[] } | null)?.children?.[0]?.childName;
  const result = claimReferral({
    code,
    referredId: userId,
    referredName: user?.name || "New family",
    referredChild: childName,
  });
  if (!result.ok) return res.status(400).json({ error: result.error });
  return res.json({
    claim: result.claim,
    me: {
      ...getReferralMe(userId, user?.name),
      checkoutDiscountPct: peekCheckoutDiscount(userId),
    },
  });
});
