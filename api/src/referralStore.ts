import fs from "fs";
import path from "path";
import { activityBoard, type AppSnapshot } from "./activityStore";
import { logActivity } from "./billingStore";

export type ReferralClaimStatus = "pending" | "rewarded" | "void";

export type ReferralCode = {
  userId: string;
  code: string;
  createdAt: string;
};

export type ReferralClaim = {
  id: string;
  code: string;
  referrerId: string;
  referredId: string;
  referredName: string;
  referredChild?: string;
  status: ReferralClaimStatus;
  referrerBuzz: number;
  referredBuzz: number;
  referrerDiscountPct: number;
  referredDiscountPct: number;
  note?: string;
  createdAt: string;
  rewardedAt?: string;
};

export type ReferralWallet = {
  userId: string;
  nextDiscountPct: number;
  stackDiscountPct: number;
  welcomeDiscountPct: number;
  welcomeUsed: boolean;
  totalReferrals: number;
  rewardedReferrals: number;
  buzzEarned: number;
  updatedAt: string;
};

type Disk = {
  nextId: number;
  codes: ReferralCode[];
  claims: ReferralClaim[];
  wallets: ReferralWallet[];
};

const DATA_PATH = path.resolve(__dirname, "../data/referrals.json");

export const REFERRER_BUZZ = 80;
export const REFERRED_BUZZ = 40;
export const REFERRER_DISCOUNT_PER = 10;
export const REFERRER_DISCOUNT_CAP = 40;
export const REFERRED_WELCOME_DISCOUNT = 20;

const g = globalThis as unknown as { __britbeeReferrals?: Disk; __britbeeReferralsLoaded?: boolean };

function emptyDisk(): Disk {
  return { nextId: 1, codes: [], claims: [], wallets: [] };
}

function load(): Disk {
  if (g.__britbeeReferralsLoaded && g.__britbeeReferrals) return g.__britbeeReferrals;
  try {
    if (fs.existsSync(DATA_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(DATA_PATH, "utf8")) as Disk;
      g.__britbeeReferrals = parsed?.codes ? parsed : emptyDisk();
    } else {
      g.__britbeeReferrals = emptyDisk();
    }
  } catch {
    g.__britbeeReferrals = emptyDisk();
  }
  g.__britbeeReferralsLoaded = true;
  return g.__britbeeReferrals!;
}

function save() {
  const disk = load();
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(disk, null, 2));
}

function nextId(disk: Disk) {
  const id = `ref_${disk.nextId}`;
  disk.nextId += 1;
  return id;
}

export function normalizeReferralCode(raw: string) {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);
}

function makeCode(userId: string) {
  const seed = String(userId)
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(-4)
    .padStart(4, "X");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `BRIT${seed}${rand}`.slice(0, 12);
}

function blankWallet(userId: string): ReferralWallet {
  return {
    userId,
    nextDiscountPct: 0,
    stackDiscountPct: 0,
    welcomeDiscountPct: 0,
    welcomeUsed: false,
    totalReferrals: 0,
    rewardedReferrals: 0,
    buzzEarned: 0,
    updatedAt: new Date().toISOString(),
  };
}

function blankSnap(): AppSnapshot {
  return {
    points: 0,
    streak: 0,
    clearedSounds: [],
    dailyDone: false,
    dailyEver: false,
    storyEver: false,
    verbsCleared: [],
    prepCorrect: 0,
  };
}

export function creditReferralBuzz(userId: string, points: number) {
  if (points <= 0) return 0;
  const prev = activityBoard.getProgress(userId)?.snapshot;
  const base = { ...blankSnap(), ...(prev || {}) } as AppSnapshot;
  const next: AppSnapshot = {
    ...base,
    points: Number(base.points || 0) + points,
  };
  activityBoard.saveProgress(userId, next);
  return points;
}

export function ensureWallet(userId: string): ReferralWallet {
  const disk = load();
  let w = disk.wallets.find((x) => x.userId === userId);
  if (!w) {
    w = blankWallet(userId);
    disk.wallets.push(w);
    save();
  }
  return w;
}

export function ensureReferralCode(userId: string): ReferralCode {
  const disk = load();
  const existing = disk.codes.find((c) => c.userId === userId);
  if (existing) return existing;
  let code = makeCode(userId);
  while (disk.codes.some((c) => c.code === code)) {
    code = makeCode(`${userId}${Math.random()}`);
  }
  const row: ReferralCode = { userId, code, createdAt: new Date().toISOString() };
  disk.codes.push(row);
  ensureWallet(userId);
  save();
  return row;
}

export function findReferralCode(codeRaw: string) {
  const code = normalizeReferralCode(codeRaw);
  if (!code) return null;
  return load().codes.find((c) => c.code === code) || null;
}

export function getWallet(userId: string) {
  return ensureWallet(userId);
}

export function listClaimsForReferrer(referrerId: string) {
  return load()
    .claims.filter((c) => c.referrerId === referrerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listAllClaims() {
  return [...load().claims].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function claimByReferred(referredId: string) {
  return load().claims.find((c) => c.referredId === referredId) || null;
}

export type ReferralMe = {
  code: string;
  shareText: string;
  wallet: ReferralWallet;
  claims: ReferralClaim[];
  rewards: {
    referrerBuzz: number;
    referredBuzz: number;
    referrerDiscountPer: number;
    referrerDiscountCap: number;
    referredWelcomeDiscount: number;
  };
};

export function getReferralMe(userId: string, displayName?: string): ReferralMe {
  const row = ensureReferralCode(userId);
  const wallet = getWallet(userId);
  const claims = listClaimsForReferrer(userId);
  const who = displayName || "our family";
  return {
    code: row.code,
    shareText: `Join BritBee with my code ${row.code} — ${who} loves the English hive! You get ${REFERRED_WELCOME_DISCOUNT}% off your first plan and Buzz Points. Open BritBee and enter the code when you sign up.`,
    wallet,
    claims,
    rewards: {
      referrerBuzz: REFERRER_BUZZ,
      referredBuzz: REFERRED_BUZZ,
      referrerDiscountPer: REFERRER_DISCOUNT_PER,
      referrerDiscountCap: REFERRER_DISCOUNT_CAP,
      referredWelcomeDiscount: REFERRED_WELCOME_DISCOUNT,
    },
  };
}

export function rewardClaim(claimId: string) {
  const disk = load();
  const claim = disk.claims.find((c) => c.id === claimId);
  if (!claim) throw new Error("Referral not found.");
  if (claim.status === "rewarded") return claim;
  if (claim.status === "void") throw new Error("This referral was voided.");

  creditReferralBuzz(claim.referrerId, claim.referrerBuzz);
  creditReferralBuzz(claim.referredId, claim.referredBuzz);

  const referrerWallet = ensureWallet(claim.referrerId);
  referrerWallet.stackDiscountPct = Math.min(
    REFERRER_DISCOUNT_CAP,
    referrerWallet.stackDiscountPct + claim.referrerDiscountPct
  );
  referrerWallet.nextDiscountPct = Math.max(referrerWallet.nextDiscountPct, referrerWallet.stackDiscountPct);
  referrerWallet.rewardedReferrals += 1;
  referrerWallet.buzzEarned += claim.referrerBuzz;
  referrerWallet.updatedAt = new Date().toISOString();

  const referredWallet = ensureWallet(claim.referredId);
  referredWallet.buzzEarned += claim.referredBuzz;
  referredWallet.updatedAt = new Date().toISOString();

  claim.status = "rewarded";
  claim.rewardedAt = new Date().toISOString();
  save();

  try {
    logActivity(claim.referrerId, {
      type: "achievement",
      title: "Referral reward",
      detail: `${claim.referredName} joined with your code · +${claim.referrerBuzz} Buzz · +${claim.referrerDiscountPct}% plan discount`,
      meta: { claimId: claim.id, referredId: claim.referredId },
    });
    logActivity(claim.referredId, {
      type: "achievement",
      title: "Welcome referral bonus",
      detail: `+${claim.referredBuzz} Buzz Points · ${claim.referredDiscountPct}% off your first paid plan`,
      meta: { claimId: claim.id, referrerId: claim.referrerId },
    });
  } catch {
    /* best-effort */
  }

  return claim;
}

export function claimReferral(input: {
  code: string;
  referredId: string;
  referredName: string;
  referredChild?: string;
}): { ok: true; claim: ReferralClaim } | { ok: false; error: string } {
  const codeRow = findReferralCode(input.code);
  if (!codeRow) return { ok: false, error: "That referral code was not found." };
  if (codeRow.userId === input.referredId) {
    return { ok: false, error: "You can’t use your own referral code." };
  }
  if (claimByReferred(input.referredId)) {
    return { ok: false, error: "This family already used a referral code." };
  }

  const disk = load();
  const claim: ReferralClaim = {
    id: nextId(disk),
    code: codeRow.code,
    referrerId: codeRow.userId,
    referredId: input.referredId,
    referredName: input.referredName,
    referredChild: input.referredChild,
    status: "pending",
    referrerBuzz: REFERRER_BUZZ,
    referredBuzz: REFERRED_BUZZ,
    referrerDiscountPct: REFERRER_DISCOUNT_PER,
    referredDiscountPct: REFERRED_WELCOME_DISCOUNT,
    createdAt: new Date().toISOString(),
  };
  disk.claims.push(claim);

  const referrerWallet = ensureWallet(codeRow.userId);
  referrerWallet.totalReferrals += 1;
  referrerWallet.updatedAt = new Date().toISOString();

  const referredWallet = ensureWallet(input.referredId);
  referredWallet.welcomeDiscountPct = REFERRED_WELCOME_DISCOUNT;
  referredWallet.welcomeUsed = false;
  referredWallet.updatedAt = new Date().toISOString();

  save();
  return { ok: true, claim: rewardClaim(claim.id) };
}

export function peekCheckoutDiscount(userId: string) {
  const w = getWallet(userId);
  const welcome = !w.welcomeUsed ? w.welcomeDiscountPct || 0 : 0;
  const pct = Math.max(w.nextDiscountPct || 0, welcome);
  return Math.min(50, Math.max(0, pct));
}

export function consumeCheckoutDiscount(userId: string, amountPaise: number) {
  ensureWallet(userId);
  const disk = load();
  const w = disk.wallets.find((x) => x.userId === userId)!;
  let pct = 0;
  let source: "welcome" | "stack" | "none" = "none";

  if (!w.welcomeUsed && w.welcomeDiscountPct > 0) {
    pct = w.welcomeDiscountPct;
    source = "welcome";
    w.welcomeUsed = true;
  } else if (w.nextDiscountPct > 0) {
    pct = w.nextDiscountPct;
    source = "stack";
    w.nextDiscountPct = Math.max(0, w.nextDiscountPct - REFERRER_DISCOUNT_PER);
    w.stackDiscountPct = Math.max(0, Math.min(w.stackDiscountPct, w.nextDiscountPct));
  }

  w.updatedAt = new Date().toISOString();
  save();

  const discountPaise = Math.round((amountPaise * pct) / 100);
  return {
    pct,
    source,
    discountPaise,
    finalAmount: Math.max(0, amountPaise - discountPaise),
    label: pct > 0 ? `${pct}% referral discount` : undefined,
  };
}

export function guideReferralOverview() {
  const disk = load();
  const claims = listAllClaims();
  const byReferrer = new Map<string, ReferralClaim[]>();
  for (const c of claims) {
    const list = byReferrer.get(c.referrerId) || [];
    list.push(c);
    byReferrer.set(c.referrerId, list);
  }
  const leaders = [...byReferrer.entries()]
    .map(([referrerId, list]) => ({
      referrerId,
      code: disk.codes.find((c) => c.userId === referrerId)?.code || "",
      total: list.length,
      rewarded: list.filter((c) => c.status === "rewarded").length,
      latestAt: list[0]?.createdAt,
    }))
    .sort((a, b) => b.total - a.total || (b.latestAt || "").localeCompare(a.latestAt || ""));

  return {
    totals: {
      codes: disk.codes.length,
      claims: claims.length,
      rewarded: claims.filter((c) => c.status === "rewarded").length,
      pending: claims.filter((c) => c.status === "pending").length,
    },
    leaders,
    claims,
  };
}

export function seedDemoReferrals(parentId: string, parentName: string) {
  ensureReferralCode(parentId);
  const disk = load();
  if (disk.claims.some((c) => c.referrerId === parentId && c.note === "Demo sample")) {
    return getReferralMe(parentId, parentName);
  }
  const samples = [
    { referredId: `demo_ref_a_${parentId}`, referredName: "Priya N.", referredChild: "Anaya" },
    { referredId: `demo_ref_b_${parentId}`, referredName: "Rahul K.", referredChild: "Kabir" },
  ];
  for (const s of samples) {
    if (disk.claims.some((c) => c.referredId === s.referredId)) continue;
    const code = ensureReferralCode(parentId).code;
    disk.claims.push({
      id: nextId(disk),
      code,
      referrerId: parentId,
      referredId: s.referredId,
      referredName: s.referredName,
      referredChild: s.referredChild,
      status: "rewarded",
      referrerBuzz: REFERRER_BUZZ,
      referredBuzz: REFERRED_BUZZ,
      referrerDiscountPct: REFERRER_DISCOUNT_PER,
      referredDiscountPct: REFERRED_WELCOME_DISCOUNT,
      note: "Demo sample",
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      rewardedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    });
  }
  const w = ensureWallet(parentId);
  w.totalReferrals = Math.max(w.totalReferrals, 2);
  w.rewardedReferrals = Math.max(w.rewardedReferrals, 2);
  w.stackDiscountPct = Math.min(REFERRER_DISCOUNT_CAP, Math.max(w.stackDiscountPct, 20));
  w.nextDiscountPct = Math.max(w.nextDiscountPct, w.stackDiscountPct);
  w.buzzEarned = Math.max(w.buzzEarned, REFERRER_BUZZ * 2);
  w.updatedAt = new Date().toISOString();
  save();
  return getReferralMe(parentId, parentName);
}
