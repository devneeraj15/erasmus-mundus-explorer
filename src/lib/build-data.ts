/**
 * Pure functions that turn the catalogue CSV (+ optional enrichment files) into
 * the unified Program schema. Used by scripts/build-data.ts and by the tests.
 *
 * Rule: only values present in the CSV, or in an enrichment file with explicit
 * provenance, are filled in. Everything else stays null ("unknown").
 */
import type {
  DisciplineCluster,
  EnrichableSection,
  Enrichment,
  Program,
  ProgramType,
  Provenance,
  ScholarshipStatus,
} from "./types";

export interface CsvRow {
  Acronym: string;
  Programme: string;
  Type: string;
  Field: string;
  "New for 2027": string;
  "Next deadline": string;
  Scholarship: string;
  "Rules in app": string;
  Website: string;
}

const PROGRAM_TYPES: ProgramType[] = ["EMJM", "MSCA", "EIT", "EMDM", "SHORT_TERM"];
const CLUSTERS: DisciplineCluster[] = [
  "Engineering",
  "Computer Science",
  "Humanities",
  "Life Sciences",
  "Social Sciences",
  "Environmental Sciences",
  "Natural Sciences",
  "Multidisciplinary",
];
const SECTIONS: EnrichableSection[] = [
  "funding_detail",
  "deadlines",
  "institutions",
  "mobility",
  "eligibility",
  "documents",
  "pathways",
];

export function slugify(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function parseScholarship(raw: string): ScholarshipStatus {
  const s = raw.trim().toLowerCase();
  if (s.startsWith("eu scholarship")) return "EU_SCHOLARSHIP";
  if (s.startsWith("self-funded")) return "SELF_FUNDED";
  if (s.startsWith("check")) return "OLDER_GRANT";
  if (s === "yes") return "YES";
  throw new Error(`Unrecognised Scholarship value: "${raw}"`);
}

function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

/** Small keyword list from the title, for search. No external knowledge. */
export function titleKeywords(title: string): string[] {
  const stop = new Set([
    "erasmus", "mundus", "joint", "master", "masters", "master's", "programme", "program",
    "in", "of", "and", "the", "on", "for", "a", "an", "to", "from", "with", "design",
    "european", "international", "msc", "science", "sciences", "degree", "eit", "school",
  ]);
  const words = title
    .replace(/[—–:,()+/]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && !stop.has(w.toLowerCase()));
  return Array.from(new Set(words)).slice(0, 8);
}

function emptySections(p: Provenance): Record<EnrichableSection, Provenance> {
  return Object.fromEntries(SECTIONS.map((s) => [s, p])) as Record<EnrichableSection, Provenance>;
}

export function rowToProgram(row: CsvRow, importedOn: string): Program {
  const acronym = row.Acronym.trim();
  const type = row.Type.trim() as ProgramType;
  if (!PROGRAM_TYPES.includes(type)) throw new Error(`Unknown Type "${row.Type}" for ${acronym}`);
  const cluster = row.Field.trim() as DisciplineCluster;
  if (!CLUSTERS.includes(cluster)) throw new Error(`Unknown Field "${row.Field}" for ${acronym}`);

  const scholarship = parseScholarship(row.Scholarship);
  const nextDeadline = row["Next deadline"].trim();
  if (nextDeadline && !isIsoDate(nextDeadline)) {
    throw new Error(`Bad Next deadline "${nextDeadline}" for ${acronym}`);
  }
  const handChecked = row["Rules in app"].trim().toLowerCase() === "hand-checked";

  const sections = emptySections("unknown");
  sections.funding_detail = "catalogue";
  if (nextDeadline) sections.deadlines = handChecked ? "hand_checked" : "catalogue";

  // The €1,400/month figure is stated in the catalogue row itself.
  const stipend = scholarship === "EU_SCHOLARSHIP" ? 1400 : null;

  return {
    id: slugify(acronym),
    name: row.Programme.trim(),
    acronym,
    program_type: type,
    degree_awarded: null,
    website_url: row.Website.trim() || null,
    eacea_catalogue_url:
      type === "EMJM" ? "https://www.eacea.ec.europa.eu/scholarships/erasmus-mundus-catalogue_en" : null,
    coordinating_institution: null,
    partner_institutions: null,
    mobility_tracks: null,
    discipline_cluster: cluster,
    keywords: titleKeywords(row.Programme),
    research_pillars: null,
    duration_months: null,
    ects_credits: null,
    new_for_2027: row["New for 2027"].trim().toLowerCase() === "yes",
    funding: {
      scholarship_status: scholarship,
      scholarship_label: row.Scholarship.trim(),
      emjm_monthly_stipend_eur: stipend,
      travel_installation_allowance: null,
      tuition_waiver: null,
      consortium_scholarships: null,
      application_fee_eur: null,
    },
    deadlines: {
      academic_year: null,
      applications_open_date: null,
      scholarship_deadline: null,
      self_funded_deadline: null,
      next_deadline: nextDeadline || null,
    },
    eligibility_criteria: {
      min_degree_level: null,
      min_ects: null,
      allowed_disciplines: null,
      adjacent_disciplines: null,
      final_year_students_allowed: null,
      proof_of_expected_graduation_deadline: null,
      work_experience_requirement: null,
      min_work_experience_years: null,
      prior_erasmus_scholarship_allowed: null,
      nationality_considerations: null,
    },
    document_checklist: {
      academic_transcripts: null,
      degree_certificate: null,
      cv_format: null,
      motivation_letter: null,
      recommendation_letters: null,
      language_proficiency: null,
      additional_documents: null,
    },
    alternative_pathways: {
      non_direct_degree_admission: null,
      language_waiver_feasibility: null,
      self_funded_fee_tier_eur: null,
      partner_country_scholarship_odds: null,
    },
    data_quality: {
      rules: handChecked ? "hand_checked" : "catalogue_only",
      sections,
      sources: ["Erasmus Mundus catalogue export (CSV)"],
      last_imported: importedOn,
      notes: [],
    },
  };
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Deep merge where arrays and scalars replace, objects merge, and `undefined` is ignored. */
export function deepMerge<T>(base: T, patch: unknown): T {
  if (!isPlainObject(patch) || !isPlainObject(base)) return (patch === undefined ? base : patch) as T;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    out[k] = isPlainObject(v) && isPlainObject(out[k]) ? deepMerge(out[k], v) : v;
  }
  return out as T;
}

export function applyEnrichment(p: Program, e: Enrichment): Program {
  if (e.id !== p.id) throw new Error(`Enrichment ${e.id} applied to ${p.id}`);
  // Never let an enrichment file overwrite provenance or identity.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data_quality: _dq, id: _id, ...patch } = e.patch as Record<string, unknown>;
  const merged = deepMerge(p, patch);
  const sections = { ...p.data_quality.sections };
  for (const s of e.sections) sections[s] = e.provenance;
  merged.data_quality = {
    ...p.data_quality,
    sections,
    sources: Array.from(new Set([...p.data_quality.sources, ...(e.sources ?? [])])),
    notes: [...p.data_quality.notes, ...(e.notes ?? [])],
  };
  return merged;
}

export function buildPrograms(rows: CsvRow[], enrichments: Enrichment[], importedOn: string): Program[] {
  const programs = rows.map((r) => rowToProgram(r, importedOn));
  const ids = new Set<string>();
  for (const p of programs) {
    if (ids.has(p.id)) throw new Error(`Duplicate id ${p.id}`);
    ids.add(p.id);
  }
  const byId = new Map(programs.map((p) => [p.id, p]));
  for (const e of enrichments) {
    const p = byId.get(e.id);
    if (!p) throw new Error(`Enrichment for unknown programme id "${e.id}"`);
    byId.set(e.id, applyEnrichment(p, e));
  }
  return programs.map((p) => byId.get(p.id)!);
}
