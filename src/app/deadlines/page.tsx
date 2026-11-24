import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProvenanceBadge, ScholarshipBadge, TypeBadge } from "@/components/program-badges";
import { DeadlineCountdown } from "@/components/deadline-countdown";
import { PROGRAMS } from "@/lib/data";
import { primaryDeadline } from "@/lib/deadlines";

export const metadata = { title: "Deadlines · Mobility Explorer" };

export default function DeadlinesPage() {
  const dated = PROGRAMS.map((p) => ({ p, d: primaryDeadline(p) }))
    .filter((x): x is { p: (typeof PROGRAMS)[number]; d: string } => !!x.d)
    .sort((a, b) => a.d.localeCompare(b.d));
  const undated = PROGRAMS.length - dated.length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Application deadlines</h1>
        <p className="text-sm text-muted-foreground">
          {dated.length} programmes have a known next deadline. {undated} have none recorded yet: check their websites. The catalogue gives one “next deadline” per
          programme and does not say whether it is the scholarship or the self-funded round.
        </p>
      </div>
      <div className="space-y-3">
        {dated.map(({ p, d }) => (
          <Card key={p.id}>
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 pb-2">
              <CardTitle className="text-base">
                <Link href={`/programs/${p.id}`} className="hover:underline">
                  {p.acronym}
                </Link>
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <TypeBadge type={p.program_type} />
                <ScholarshipBadge p={p} />
                <ProvenanceBadge source={p.data_quality.sections.deadlines} />
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">{p.name}</span>
              <span className="inline-flex items-center gap-2 text-sm font-medium tabular-nums">
                <CalendarClock className="size-4 text-primary" /> {d} <DeadlineCountdown date={d} />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
