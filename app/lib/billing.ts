export function formatInr(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function subscriptionLabel(status: string) {
  switch (status) {
    case "active":
      return "Active";
    case "trialing":
      return "Trial";
    case "past_due":
      return "Payment due";
    case "cancelled":
      return "Cancelled";
    case "expired":
      return "Expired";
    default:
      return status;
  }
}

export function activityIcon(type: string): keyof typeof import("@expo/vector-icons").Ionicons.glyphMap {
  switch (type) {
    case "payment":
      return "card-outline";
    case "subscription":
      return "refresh-outline";
    case "practice":
      return "fitness-outline";
    case "settings":
      return "settings-outline";
    case "class":
      return "videocam-outline";
    case "achievement":
      return "trophy-outline";
    default:
      return "ellipse-outline";
  }
}

export function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
