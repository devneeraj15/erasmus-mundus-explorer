import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL } from "@/lib/deadlines";
import { TIER_LABEL, type Chances, type ChanceTier } from "@/lib/chances";
import {
  PROGRAM_TYPE_LABEL,
  PROGRAM_TYPE_SHORT,
  type DeadlineCheckStatus,
  type DeadlineStatus,
  type Program,
  type ProgramType,
  type Provenance,
} from "@/lib/types";

const TYPE_VARIANT: Record<ProgramType, "blue" | "violet" | "green" | "amber" | "secondary"> = {
  EMJM: "blue",
  MSCA: "violet",
  EIT: "green",
  EMDM: "amber",
  SHORT_TERM: "secondary",
};

export function TypeBadge({ type }: { type: ProgramType }) {
  return (
    <Badge variant={TYPE_VARIANT[type]} title={PROGRAM_TYPE_LABEL[type]}>
      {PROGRAM_TYPE_SHORT[type]}
    </Badge>
  );
}

export function ScholarshipBadge({ p }: { p: Program }) {
  const s = p.funding.scholarship_status;
  const check = p.deadlines.check;
  if (check?.status === "NO_SCHOLARSHIP")
    return (
      <Badge variant="red" title={`Official site, checked ${check.checked_on}. Catalogue said: ${p.funding.scholarship_label}`}>
        No EM scholarship 2027
      </Badge>
    );
  if (s === "EU_SCHOLARSHIP") return <Badge variant="green">EU €1,400/mo</Badge>;
  if (s === "YES") return <Badge variant="blue">Funding available</Badge>;
  if (s === "OLDER_GRANT") return <Badge variant="muted" title="Funded under an older call; current intake unclear">Check: older grant</Badge>;
  return <Badge variant="secondary">Self-funded only</Badge>;
}

const STATUS_VARIANT: Record<DeadlineStatus, "green" | "amber" | "red" | "blue" | "muted" | "secondary"> = {
  OPEN: "green",
  OPENING_SOON: "amber",
  DEADLINE_AHEAD: "blue",
  CLOSED: "red",
  IN_REVIEW: "secondary",
  UNKNOWN: "muted",
};

export function StatusBadge({ status }: { status: DeadlineStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}

export function ProvenanceBadge({ source }: { source: Provenance | "programme_rule" }) {
  switch (source) {
    case "sample":
      return <Badge variant="sample" title="Illustrative demo data. Not verified.">Sample data</Badge>;
    case "hand_checked":
      return <Badge variant="green">Hand-checked</Badge>;
    case "crawler":
      return <Badge variant="amber" title="Extracted automatically, awaiting review">Crawled, unreviewed</Badge>;
    case "catalogue":
      return <Badge variant="outline">Catalogue</Badge>;
    case "programme_rule":
      return <Badge variant="outline" title="General programme rule, not programme-specific">Programme rule</Badge>;
    default:
      return <Badge variant="muted">Unverified</Badge>;
  }
}

/** Renders a value, or an explicit "Unknown" marker when it is null. */
export function Val({ v, suffix }: { v: string | number | boolean | null | undefined; suffix?: string }) {
  if (v === null || v === undefined || v === "") return <span className="text-muted-foreground italic">Unknown</span>;
  if (typeof v === "boolean") return <span>{v ? "Yes" : "No"}</span>;
  return (
    <span>
      {v}
      {suffix}
    </span>
  );
}

export const CHECK_LABEL: Record<DeadlineCheckStatus, string> = {
  CONFIRMED: "Verified",
  NO_SCHOLARSHIP: "No scholarship",
  NOT_PUBLISHED: "Date not published yet",
  ANNUAL_RULE: "Annual rule, no year",
  PREVIOUS_CYCLE: "Site shows old intake",
  UNCONFIRMED: "Unconfirmed",
  NOT_FOUND: "Not found on site",
  UNREACHABLE: "Site unreachable",
  NOT_APPLICABLE: "Not applicable",
};

const CHECK_VARIANT: Record<DeadlineCheckStatus, "green" | "amber" | "red" | "muted" | "secondary"> = {
  CONFIRMED: "green",
  NO_SCHOLARSHIP: "red",
  NOT_PUBLISHED: "amber",
  ANNUAL_RULE: "amber",
  PREVIOUS_CYCLE: "amber",
  UNCONFIRMED: "amber",
  NOT_FOUND: "muted",
  UNREACHABLE: "muted",
  NOT_APPLICABLE: "secondary",
};

/** Verification result for the deadline, with source link and check date. */
export function DeadlineCheckBadge({ p }: { p: Program }) {
  const c = p.deadlines.check;
  if (!c) return <Badge variant="muted">Not checked</Badge>;
  const title = [c.quote ? `“${c.quote}”` : null, c.date && c.status !== "CONFIRMED" ? `Date seen: ${c.date}` : null, `Checked ${c.checked_on}`]
    .filter(Boolean)
    .join("\n");
  const badge = (
    <Badge variant={CHECK_VARIANT[c.status]} title={title}>
      {CHECK_LABEL[c.status]}
    </Badge>
  );
  return (
    <span className="flex flex-col items-start gap-0.5">
      {c.source_url ? (
        <a href={c.source_url} target="_blank" rel="noreferrer" className="hover:opacity-80">
          {badge}
        </a>
      ) : (
        badge
      )}
      {c.catalogue_deadline && <span className="text-[11px] text-muted-foreground">Catalogue said {c.catalogue_deadline}</span>}
      <span className="text-[11px] text-muted-foreground">Checked {c.checked_on}</span>
    </span>
  );
}

const TIER_VARIANT: Record<ChanceTier, "green" | "blue" | "amber" | "red" | "muted" | "secondary"> = {
  GOOD: "green",
  POSSIBLE: "blue",
  LONG_SHOT: "amber",
  NO_SCHOLARSHIP: "red",
  CLOSED: "muted",
  NOT_APPLICABLE: "secondary",
};

export function ChancesBadge({ c }: { c: Chances }) {
  return (
    <span className="flex flex-col items-start gap-0.5" title={c.reasons.join("\n")}>
      <Badge variant={TIER_VARIANT[c.tier]}>
        {TIER_LABEL[c.tier]}
        {c.index !== null && <span className="tabular-nums opacity-70">· {c.index}</span>}
      </Badge>
      {c.index !== null && !c.fitMeasured && <span className="text-[11px] text-muted-foreground">CV fit not measured</span>}
    </span>
  );
}
