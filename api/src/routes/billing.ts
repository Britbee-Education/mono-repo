import fs from "fs";
import path from "path";
import multer from "multer";
import { Router } from "express";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth";
import {
  cancelPayment,
  cancelSubscription,
  createCheckout,
  ensureSubscription,
  failPayment,
  gatewaySession,
  getGatewayConfig,
  getSummary,
  listActivity,
  listInvoices,
  listPayments,
  resumeSubscription,
  seedDemoBilling,
  submitPaymentProof,
  switchTrial,
  type PaymentMethod,
  type PlanId,
} from "../billingStore";
import { syncUserPlan } from "../billingSync";

export const billingRouter = Router();

billingRouter.use(requireAuth, requireRole("parent"));

const proofUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

function proofDir() {
  return path.resolve(process.cwd(), "../app/assets/billing/proofs");
}

function findOwnedPayment(userId: string, paymentId: string) {
  return listPayments(userId).find((p) => p.id === paymentId) || null;
}

billingRouter.get("/summary", async (req: AuthedRequest, res) => {
  const userId = String(req.user!._id);
  seedDemoBilling(userId);
  const summary = getSummary(userId);
  const user = await syncUserPlan(userId);
  return res.json({ ...summary, user });
});

billingRouter.get("/gateway", (_req, res) => {
  return res.json({ gateway: getGatewayConfig() });
});

billingRouter.get("/subscription", (req: AuthedRequest, res) => {
  const userId = String(req.user!._id);
  return res.json({ subscription: ensureSubscription(userId) });
});

billingRouter.get("/payments", (req: AuthedRequest, res) => {
  const userId = String(req.user!._id);
  return res.json({ payments: listPayments(userId) });
});

billingRouter.get("/payments/:id/gateway", (req: AuthedRequest, res) => {
  const userId = String(req.user!._id);
  const payment = findOwnedPayment(userId, String(req.params.id));
  if (!payment) return res.status(404).json({ error: "Payment not found." });
  if (payment.status !== "pending" && payment.status !== "processing") {
    return res.status(400).json({ error: "This payment is already settled." });
  }
  return res.json(gatewaySession(payment));
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
    return res.json({ payment, session: gatewaySession(payment) });
  } catch (e) {
    return res.status(400).json({ error: e instanceof Error ? e.message : "Checkout failed." });
  }
});

/** Parent submits UTR / screenshot — mentor activates later. */
billingRouter.post("/payments/:id/submit-proof", (req: AuthedRequest, res) => {
  const userId = String(req.user!._id);
  const transactionId = typeof req.body?.transactionId === "string" ? req.body.transactionId : undefined;
  const proofUrl = typeof req.body?.proofUrl === "string" ? req.body.proofUrl : undefined;
  try {
    const payment = submitPaymentProof(userId, String(req.params.id), { transactionId, proofUrl });
    return res.json({ payment, session: gatewaySession(payment) });
  } catch (e) {
    return res.status(400).json({ error: e instanceof Error ? e.message : "Could not submit payment proof." });
  }
});

billingRouter.post("/payments/:id/proof", proofUpload.single("file"), (req: AuthedRequest, res) => {
  const userId = String(req.user!._id);
  const payment = findOwnedPayment(userId, String(req.params.id));
  if (!payment) return res.status(404).json({ error: "Payment not found." });
  if (payment.status !== "pending" && payment.status !== "processing") {
    return res.status(400).json({ error: "This payment is already settled." });
  }
  const file = req.file;
  if (!file) return res.status(400).json({ error: "Choose a payment screenshot." });
  const mime = (file.mimetype || "").toLowerCase();
  if (!mime.startsWith("image/")) return res.status(400).json({ error: "Upload an image screenshot (JPG or PNG)." });
  if (file.size > 8 * 1024 * 1024) return res.status(400).json({ error: "Screenshot is too large (max 8 MB)." });

  const ext = path.extname(file.originalname || "").toLowerCase();
  const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".heic"].includes(ext) ? ext : ".jpg";
  const fileName = `proof-${userId}-${payment.id}-${Date.now()}${safeExt}`;
  const absDir = proofDir();
  fs.mkdirSync(absDir, { recursive: true });
  fs.writeFileSync(path.join(absDir, fileName), file.buffer);

  const base = `${req.protocol}://${req.get("host")}`;
  const proofUrl = `${base}/assets/billing/proofs/${fileName}`;
  return res.status(201).json({ proofUrl });
});

/** Parent self-activation disabled — mentors verify BritBee Pay proofs. */
billingRouter.post("/payments/:id/confirm", (_req, res) => {
  return res.status(400).json({
    error: "Pay via BritBee Pay, then submit your UPI ID or screenshot. A mentor activates your plan after verification.",
  });
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
