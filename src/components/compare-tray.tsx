"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Scale, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompare } from "@/hooks/use-compare";
import { MAX_COMPARE } from "@/hooks/use-local-store";
import { PROGRAM_BY_ID } from "@/lib/data";

export function CompareTray() {
  const { ids, toggle, clear } = useCompare();
  const pathname = usePathname();
  if (!ids.length || pathname === "/compare") return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 shadow-lg backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3">
        <Scale className="size-4 text-primary" />
        <span className="text-sm font-medium">
          Compare ({ids.length}/{MAX_COMPARE})
        </span>
        <div className="flex flex-1 flex-wrap gap-1.5">
          {ids.map((id) => (
            <span key={id} className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs">
              {PROGRAM_BY_ID.get(id)?.acronym ?? id}
              <button aria-label={`Remove ${id}`} onClick={() => toggle(id)} className="text-muted-foreground hover:text-foreground">
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={clear}>
          Clear
        </Button>
        <Button asChild size="sm" disabled={ids.length < 2}>
          <Link href={`/compare?ids=${ids.join(",")}`} aria-disabled={ids.length < 2} className={ids.length < 2 ? "pointer-events-none opacity-50" : ""}>
            {ids.length < 2 ? "Pin at least 2" : "Open comparison"}
          </Link>
        </Button>
      </div>
    </div>
  );
}
