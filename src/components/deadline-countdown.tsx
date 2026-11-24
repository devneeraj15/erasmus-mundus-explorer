"use client";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { daysUntil } from "@/lib/deadlines";

/** Client-side so the countdown uses the viewer's date, not the build date. */
export function DeadlineCountdown({ date }: { date: string }) {
  const [days, setDays] = useState<number | null>(null);
  useEffect(() => setDays(daysUntil(date)), [date]);
  if (days === null) return null;
  if (days < 0) return <Badge variant="red">Passed</Badge>;
  if (days === 0) return <Badge variant="red">Today</Badge>;
  return <Badge variant={days <= 21 ? "amber" : "blue"}>{days} days left</Badge>;
}
