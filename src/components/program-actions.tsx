"use client";
import Link from "next/link";
import { ClipboardList, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompare } from "@/hooks/use-compare";
import { useTracker } from "@/hooks/use-tracker";

export function ProgramActions({ id }: { id: string }) {
  const { ids, toggle, full } = useCompare();
  const { state, addTarget } = useTracker();
  const pinned = ids.includes(id);
  const tracked = state.targets.includes(id);
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant={pinned ? "secondary" : "outline"} size="sm" onClick={() => toggle(id)} disabled={!pinned && full}>
        <Pin className={pinned ? "fill-current" : ""} /> {pinned ? "Pinned to compare" : "Pin to compare"}
      </Button>
      {tracked ? (
        <Button asChild variant="secondary" size="sm">
          <Link href="/tracker">
            <ClipboardList /> In your tracker
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" onClick={() => addTarget(id)}>
          <ClipboardList /> Track documents
        </Button>
      )}
    </div>
  );
}
