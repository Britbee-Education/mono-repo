import { users } from "./users";
import { ensureSubscription, type PlanId } from "./billingStore";
import { toPublicUser } from "./middleware/auth";

export async function syncUserPlan(userId: string) {
  const sub = ensureSubscription(userId);
  const user = await users.findById(userId);
  if (!user) return null;
  const parentSettings = {
    paused: Boolean(user.parentSettings?.paused),
    planId: sub.planId as PlanId,
    planSince: sub.currentPeriodStart,
    subscriptionStatus: sub.status,
    renewsAt: sub.currentPeriodEnd,
    cancelAtPeriodEnd: Boolean(sub.cancelAtPeriodEnd),
  };
  await users.update(userId, { parentSettings: parentSettings as any });
  const updated = await users.findById(userId);
  return updated ? toPublicUser(updated) : null;
}
