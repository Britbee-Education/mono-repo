import type { AppUser } from "./users";

/** Stable progress row id — parents get one row per active child. */
export function progressLearnerId(user: Pick<AppUser, "_id" | "role"> & { activeChildIndex?: number }) {
  const id = String(user._id);
  if (user.role === "parent") {
    return `${id}:child:${Number(user.activeChildIndex) || 0}`;
  }
  return id;
}
