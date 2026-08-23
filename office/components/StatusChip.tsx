import { STATUS_OPTIONS, type CoachStatus } from "@/lib/activities";

export function StatusChip({ status }: { status: CoachStatus }) {
  const label = STATUS_OPTIONS.find((s) => s.id === status)?.label || status;
  return <span className={`status st-${status}`}>{label}</span>;
}
