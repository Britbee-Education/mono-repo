import { Router } from "express";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth";
import {
  cancelPayment,
  cancelSubscription,
  confirmPayment,
  createCheckout,
  ensureSubscription,
  failPayment,
  getSummary,
  listActivity,
  listInvoices,
  listPayments,
  resumeSubscription,
  seedDemoBilling,
  switchTrial,
  type PaymentMethod,
  type PlanId,
} from "../billingStore";
import { syncUserPlan } from "../billingSync";

export const billingRouter = Router();

billingRouter.use(requireAuth, requireRole("parent"));

billingRouter.get("/summary", async (req: AuthedRequest, res) => {
  const userId = String(req.user!._id);
  seedDemoBilling(userId);
  const summary = getSummary(userId);
  const user = await syncUserPlan(userId);
  return res.json({ ...summary, user });
});

billingRouter.get("/subscription", (req: AuthedRequest, res) => {
  const userId = String(req.user!._id);
  return res.json({ subscription: ensureSubscription(userId) });
});

billingRouter.get("/payments", (req: AuthedRequest, res) => {
  const userId = String(req.user!._id);
  return res.json({ payments: listPayments(userId) });
});

billingRouter.get("/invoices", (req: AuthedRequest, res) => {
  const userId = String(req.user!._id);
  return res.json({ invoices: listInvoices(userId) });
});

billingRouter.get("/activity", (req: AuthedRequest, res) => {
  const userId = String(req.user!._id);
  const limit = Math.min(80, Math.max(1, Number(req.query.limit) || 40));
  return res.json({ activity: listActivity(userId, limit) });
});

billingRouter.post("/checkout", async (req: AuthedRequest, res) => {
  const userId = String(req.user!._id);
  const planId = req.body?.planId as PlanId;
  const method = (req.body?.method || "upi") as PaymentMethod;
  if (!["monthly", "yearly"].includes(planId)) {
    return res.status(400).json({ error: "Pick Monthly or Yearly to checkout." });
  }
  if (!["upi", "card", "netbanking"].includes(method)) {
    return res.status(400).json({ error: "Invalid payment method." });
  }
  try {
    const payment = createCheckout(userId, planId, method);
    return res.json({ payment });
  } catch (e) {
    return res.status(400).json({ error: e instanceof Error ? e.message : "Checkout failed." });
  }
});

billingRouter.post("/payments/:id/confirm", async (req: AuthedRequest, res) => {
  const userId = String(req.user!._id);
  try {
    const result = confirmPayment(userId, String(req.params.id));
    const user = await syncUserPlan(userId);
    return res.json({ ...result, user });
  } catch (e) {
    return res.status(400).json({ error: e instanceof Error ? e.message : "Could not confirm payment." });
  }
});

billingRouter.post("/payments/:id/fail", (req: AuthedRequest, res) => {
  const userId = String(req.user!._id);
  const reason = typeof req.body?.reason === "string" ? req.body.reason : undefined;
  try {
    const payment = failPayment(userId, String(req.params.id), reason);
    return res.json({ payment });
  } catch (e) {
    return res.status(400).json({ error: e instanceof Error ? e.message : "Could not fail payment." });
  }
});

billingRouter.post("/payments/:id/cancel", (req: AuthedRequest, res) => {
  const userId = String(req.user!._id);
  try {
    const payment = cancelPayment(userId, String(req.params.id));
    return res.json({ payment });
  } catch (e) {
    return res.status(400).json({ error: e instanceof Error ? e.message : "Could not cancel payment." });
  }
});

billingRouter.post("/trial", async (req: AuthedRequest, res) => {
  const userId = String(req.user!._id);
  const subscription = switchTrial(userId);
  const user = await syncUserPlan(userId);
  return res.json({ subscription, user });
});

billingRouter.post("/subscription/cancel", async (req: AuthedRequest, res) => {
  const userId = String(req.user!._id);
  const atPeriodEnd = req.body?.atPeriodEnd !== false;
  try {
    const subscription = cancelSubscription(userId, atPeriodEnd);
    const user = await syncUserPlan(userId);
    return res.json({ subscription, user });
  } catch (e) {
    return res.status(400).json({ error: e instanceof Error ? e.message : "Could not cancel." });
  }
});

billingRouter.post("/subscription/resume", async (req: AuthedRequest, res) => {
  const userId = String(req.user!._id);
  try {
    const subscription = resumeSubscription(userId);
    const user = await syncUserPlan(userId);
    return res.json({ subscription, user });
  } catch (e) {
    return res.status(400).json({ error: e instanceof Error ? e.message : "Could not resume." });
  }
});
