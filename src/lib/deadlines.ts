import type { DeadlineStatus, Program } from "./types";

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** The earliest known future deadline (scholarship first, then the catalogue's single "next deadline"). */
export function primaryDeadline(p: Program): string | null {
  const d = p.deadlines;
  return d.scholarship_deadline ?? d.next_deadline ?? d.self_funded_deadline ?? null;
}

export function deadlineStatus(p: Program, today: string = todayIso()): DeadlineStatus {
  const d = p.deadlines;
  const deadline = primaryDeadline(p);
  const lastDeadline = [d.scholarship_deadline, d.self_funded_deadline, d.next_deadline]
    .filter((x): x is string => !!x)
    .sort()
    .pop();
  if (!deadline) return "UNKNOWN";
  if (lastDeadline && lastDeadline < today) return "CLOSED";
  if (d.applications_open_date) {
    return d.applications_open_date > today ? "OPENING_SOON" : "OPEN";
  }
  return "DEADLINE_AHEAD";
}

export function daysUntil(date: string, today: string = todayIso()): number {
  return Math.round((Date.parse(date) - Date.parse(today)) / 86_400_000);
}

export const STATUS_LABEL: Record<DeadlineStatus, string> = {
  OPEN: "Open",
  OPENING_SOON: "Opening soon",
  DEADLINE_AHEAD: "Deadline ahead",
  CLOSED: "Closed",
  IN_REVIEW: "In review",
  UNKNOWN: "Deadline unknown",
};
