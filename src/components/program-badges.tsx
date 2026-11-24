import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL } from "@/lib/deadlines";
import { PROGRAM_TYPE_LABEL, PROGRAM_TYPE_SHORT, type DeadlineStatus, type Program, type ProgramType, type Provenance } from "@/lib/types";

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
