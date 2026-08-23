import { redirect } from "next/navigation";

export default function RosterRedirectPage() {
  redirect("/dashboard/activities?tab=roster");
}
