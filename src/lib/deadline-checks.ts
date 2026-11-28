/**
 * Pure logic for turning the hand-check log into enrichment entries.
 * Used by scripts/verify/build-deadline-enrichment.ts and the tests.
 */
import { slugify, type CsvRow } from "./build-data";
import type { Competition, DeadlineCheck, DeadlineCheckStatus, Enrichment, Program } from "./types";

const STATUS_MAP: Record<string, DeadlineCheckStatus> = {
  FOUND: "CONFIRMED",
  NO_SCHOLARSHIP: "NO_SCHOLARSHIP",
  NOT_PUBLISHED: "NOT_PUBLISHED",
  MONTH_ONLY: "NOT_PUBLISHED",
  ANNUAL_RULE: "ANNUAL_RULE",
  OLD: "PREVIOUS_CYCLE",
  UNCONFIRMED: "UNCONFIRMED",
  NOT_FOUND: "NOT_FOUND",
  UNREACHABLE: "UNREACHABLE",
  NOT_APPLICABLE: "NOT_APPLICABLE",
};

/**
 * What a confirmed date is for, where the quote shows it is not the scholarship
 * deadline. Default: CONFIRMED = scholarship, NO_SCHOLARSHIP = self-funded.
 */
const KIND_OVERRIDE: Record<string, DeadlineCheck["kind"]> = {
  JEMARO: "general",
  EMAI: "general", // tuition-fee-waiver round
  FAMEAIS: "self_funded",
  "AMIR-EM": "general", // EIT scholarships, not Erasmus Mundus
  IMATEC: "general",
  NeuroData: "general",
  IMBRSea: "general",
  QUARMEN: "general",
  ChIR: "general",
  ChEMoinformaticsplus: "general",
};

type Numbers = Pick<Competition, "scholarships" | "places" | "applicants">;
/** Intake numbers read from the STATS column, as integers. Ranges use the lower bound. */
const COMPETITION: Record<string, Numbers> = {
  InterMaths: { scholarships: 18, places: null, applicants: null },
  CLIDE: { scholarships: 12, places: 30, applicants: null },
  Neurasmus: { scholarships: null, places: 20, applicants: 800 },
  EDU_MIG: { scholarships: null, places: 25, applicants: null },
  NOHA: { scholarships: 16, places: null, applicants: null },
  "NavigAIte EU": { scholarships: 8, places: null, applicants: null }, // 50 over six intakes
  ChEMoinformaticsplus: { scholarships: 20, places: 25, applicants: null },
  IPCVai: { scholarships: null, places: 25, applicants: 1600 },
  EGEI: { scholarships: 10, places: null, applicants: null },
  LAWGID: { scholarships: 12, places: null, applicants: null },
  EMMA: { scholarships: 10, places: null, applicants: 700 },
  CYBERUS: { scholarships: 0, places: 20, applicants: null },
  "QuanTEEM plus": { scholarships: 20, places: null, applicants: null },
  CYBER: { scholarships: null, places: 19, applicants: null },
  EPS: { scholarships: 6, places: null, applicants: null },
};

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const ISO_MONTH = /^\d{4}-\d{2}$/;
const dash = (v: string | undefined) => (!v || v.trim() === "-" ? null : v.trim());

export interface CheckRow {
  acronym: string;
  status: string;
  date: string | null;
  intake: string | null;
  source: string | null;
  quote: string | null;
  stats: string | null;
}

export function parseCheckLine(line: string): CheckRow {
  const f = line.split("\t");
  if (f.length !== 7) throw new Error(`Expected 7 tab-separated columns, got ${f.length}: ${line.slice(0, 80)}`);
  return {
    acronym: f[0].trim(),
    status: f[1].trim(),
    date: dash(f[2]),
    intake: dash(f[3]),
    source: dash(f[4]),
    quote: dash(f[5]),
    stats: dash(f[6]),
  };
}

export function toCheck(row: CheckRow, checkedOn: string, catalogueDeadline: string | null): DeadlineCheck {
  const status = STATUS_MAP[row.status];
  if (!status) throw new Error(`Unknown status ${row.status} for ${row.acronym}`);
  const date = row.date && (ISO_DAY.test(row.date) || ISO_MONTH.test(row.date)) ? row.date : null;
  if (row.date && !date) throw new Error(`Bad date ${row.date} for ${row.acronym}`);
  let kind: DeadlineCheck["kind"] = null;
  if (date && status === "CONFIRMED") kind = KIND_OVERRIDE[row.acronym] ?? "scholarship";
  else if (date && status === "NO_SCHOLARSHIP") kind = KIND_OVERRIDE[row.acronym] ?? "self_funded";
  else if (date && status === "ANNUAL_RULE") kind = "scholarship";
  const check: DeadlineCheck = {
    status,
    date,
    kind,
    intake: row.intake,
    source_url: row.source,
    quote: row.quote,
    checked_on: checkedOn,
  };
  if (catalogueDeadline && status === "CONFIRMED" && date !== catalogueDeadline) check.catalogue_deadline = catalogueDeadline;
  return check;
}

/** Which deadline fields a check may set. Only full dates for the coming intake are written. */
export function deadlinePatch(check: DeadlineCheck): Partial<Program["deadlines"]> {
  const patch: Partial<Program["deadlines"]> = { check };
  const fullDate = check.date && ISO_DAY.test(check.date) ? check.date : null;
  if (!fullDate) return patch;
  if (check.status === "CONFIRMED" || check.status === "NO_SCHOLARSHIP") {
    if (check.kind === "scholarship") patch.scholarship_deadline = fullDate;
    if (check.kind === "self_funded") patch.self_funded_deadline = fullDate;
    patch.next_deadline = fullDate;
  }
  return patch;
}

/** Statuses that state something definite about the deadline section. */
const DEFINITE: DeadlineCheckStatus[] = ["CONFIRMED", "NO_SCHOLARSHIP", "NOT_PUBLISHED", "ANNUAL_RULE", "PREVIOUS_CYCLE"];

export function buildDeadlineEnrichment(lines: string[], catalogue: Map<string, CsvRow>, checkedOn: string): Enrichment[] {
  const rows = lines.map(parseCheckLine);
  const seen = new Set<string>();
  const statsByAcronym = new Map<string, { note: string; source: string }>();
  const entries: Enrichment[] = [];

  for (const r of rows) {
    if (r.stats && r.source && !statsByAcronym.has(r.acronym)) statsByAcronym.set(r.acronym, { note: r.stats, source: r.source });
  }

  for (const r of rows) {
    if (r.status === "STATS") continue;
    const id = slugify(r.acronym);
    const csv = catalogue.get(id);
    if (!csv) throw new Error(`No catalogue row for ${r.acronym} (${id})`);
    if (seen.has(id)) throw new Error(`Duplicate check for ${r.acronym}`);
    seen.add(id);

    const check = toCheck(r, checkedOn, csv["Next deadline"].trim() || null);
    const patch: Enrichment["patch"] = { deadlines: deadlinePatch(check) };
    const sections: Enrichment["sections"] = DEFINITE.includes(check.status) ? ["deadlines"] : [];

    const nums = COMPETITION[r.acronym];
    const stats = statsByAcronym.get(r.acronym);
    if (nums && stats) {
      patch.competition = { ...nums, note: stats.note, source_url: stats.source, checked_on: checkedOn };
      sections.push("competition");
    }

    entries.push({
      id,
      provenance: "hand_checked",
      sources: r.source ? [r.source] : [],
      sections,
      patch,
    });
  }

  const missing = [...catalogue.keys()].filter((id) => !seen.has(id));
  if (missing.length) throw new Error(`No check recorded for: ${missing.join(", ")}`);
  return entries;
}
