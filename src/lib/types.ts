/**
 * Unified programme schema.
 *
 * Every field that the seed catalogue does not carry is nullable. `null` always
 * means "unknown / not yet verified", never "no". The UI must render nulls as
 * "Unknown" and must never fill them with a guess.
 *
 * Each enrichable section records where its values came from in
 * `data_quality.sections`, so the UI can badge sample or unverified data.
 */

export type ProgramType = "EMJM" | "MSCA" | "EIT" | "EMDM" | "SHORT_TERM";

export const PROGRAM_TYPE_LABEL: Record<ProgramType, string> = {
  EMJM: "Erasmus Mundus Joint Master",
  MSCA: "MSCA Doctoral Network",
  EIT: "EIT Master School",
  EMDM: "Design Measure (pipeline)",
  SHORT_TERM: "Traineeship / short-term",
};

export const PROGRAM_TYPE_SHORT: Record<ProgramType, string> = {
  EMJM: "EMJM",
  MSCA: "MSCA PhD",
  EIT: "EIT",
  EMDM: "EMDM",
  SHORT_TERM: "Short-term",
};

export type DisciplineCluster =
  | "Engineering"
  | "Computer Science"
  | "Humanities"
  | "Life Sciences"
  | "Social Sciences"
  | "Environmental Sciences"
  | "Natural Sciences"
  | "Multidisciplinary";

/**
 * Where a section's values came from.
 * - catalogue: the exported catalogue CSV (only basic metadata)
 * - hand_checked: a person checked the official site (CSV "Rules in app" = Hand-checked)
 * - sample: illustrative demo data. NOT verified. Must be badged in the UI.
 * - crawler: extracted automatically, awaiting human review
 * - unknown: nothing known yet
 */
export type Provenance = "catalogue" | "hand_checked" | "sample" | "crawler" | "unknown";

export type ScholarshipStatus =
  | "EU_SCHOLARSHIP" // "EU scholarship (€1,400/mo)"
  | "YES" // funding exists, type not specified in the catalogue (EIT, MSCA, traineeship grants)
  | "OLDER_GRANT" // "Check — older grant": funded under an earlier call, current intake unclear
  | "SELF_FUNDED"; // "Self-funded only"

/**
 * OPEN / OPENING_SOON need a known open date. When only the deadline is known,
 * the status is DEADLINE_AHEAD (we do not claim applications are open).
 */
export type DeadlineStatus = "OPEN" | "OPENING_SOON" | "DEADLINE_AHEAD" | "CLOSED" | "IN_REVIEW" | "UNKNOWN";

export interface Institution {
  name: string;
  country: string; // ISO alpha-2
  role?: "Coordinator" | "Full Partner" | "Associated";
}

export interface MobilityStep {
  period: string; // e.g. "Semester 1-2"
  countries: string[]; // ISO alpha-2 options
  note?: string;
}

export interface Funding {
  scholarship_status: ScholarshipStatus;
  scholarship_label: string; // raw catalogue text
  emjm_monthly_stipend_eur: number | null;
  travel_installation_allowance: string | null;
  tuition_waiver: boolean | null;
  consortium_scholarships: string | null;
  application_fee_eur: number | null; // 0 = free, null = unknown
}

export interface Deadlines {
  academic_year: string | null;
  applications_open_date: string | null; // YYYY-MM-DD
  scholarship_deadline: string | null;
  self_funded_deadline: string | null;
  /** The single "Next deadline" from the catalogue, or the verified date when a check confirmed one. */
  next_deadline: string | null;
  /** Result of checking the official programme site. null = never checked. */
  check?: DeadlineCheck | null;
}

/**
 * Outcome of checking a programme's official site for its next scholarship deadline.
 * - CONFIRMED: the site states the date for the coming intake
 * - NO_SCHOLARSHIP: the site says no Erasmus Mundus scholarships for the coming intake
 * - NOT_PUBLISHED: the coming call is announced but its closing date is not shown yet
 * - ANNUAL_RULE: the site gives a recurring date without a year
 * - PREVIOUS_CYCLE: the site still shows an older intake only
 * - UNCONFIRMED: conflicting or partial information
 * - NOT_FOUND: the site loaded but no deadline was found
 * - UNREACHABLE: the site could not be read (blocked, error, bot check)
 * - NOT_APPLICABLE: not a programme with a single scholarship call
 */
export type DeadlineCheckStatus =
  | "CONFIRMED"
  | "NO_SCHOLARSHIP"
  | "NOT_PUBLISHED"
  | "ANNUAL_RULE"
  | "PREVIOUS_CYCLE"
  | "UNCONFIRMED"
  | "NOT_FOUND"
  | "UNREACHABLE"
  | "NOT_APPLICABLE";

export interface DeadlineCheck {
  status: DeadlineCheckStatus;
  /** Date seen on the site: YYYY-MM-DD, or YYYY-MM when only the month is given. */
  date: string | null;
  /** What the date is for. */
  kind: "scholarship" | "general" | "self_funded" | null;
  intake: string | null;
  source_url: string | null;
  /** Short quote from the source supporting the status. */
  quote: string | null;
  checked_on: string; // YYYY-MM-DD
  /** The catalogue's date when the check found a different one. */
  catalogue_deadline?: string | null;
}

/** Published intake numbers, when the programme states them. null = not stated. */
export interface Competition {
  scholarships: number | null; // EM scholarships per intake
  places: number | null; // study places per intake
  applicants: number | null; // applications per year
  note: string;
  source_url: string;
  checked_on: string;
}

export type WorkExperienceRequirement = "None" | "Preferred" | "Mandatory";

export interface EligibilityCriteria {
  min_degree_level: string | null;
  min_ects: number | null;
  allowed_disciplines: string[] | null;
  adjacent_disciplines: string[] | null; // accepted with bridging / credit evidence
  final_year_students_allowed: boolean | null;
  proof_of_expected_graduation_deadline: string | null;
  work_experience_requirement: WorkExperienceRequirement | null;
  min_work_experience_years: number | null;
  prior_erasmus_scholarship_allowed: boolean | null;
  nationality_considerations: string | null;
}

export interface LanguageProficiency {
  accepted_tests: string[] | null;
  minimum_scores: { ielts: number | null; toefl: number | null } | null;
  waiver_conditions: string[] | null;
  moi_waiver_accepted: boolean | null;
}

export interface DocumentChecklist {
  academic_transcripts: { required: boolean; certified_translation: boolean | null } | null;
  degree_certificate: { required: boolean; conditional_provisional_allowed: boolean | null } | null;
  cv_format: string | null;
  motivation_letter: {
    required: boolean;
    max_words_or_pages: string | null;
    specific_prompts: string[] | null;
  } | null;
  recommendation_letters: {
    count: number | null;
    method: string | null;
    type: string | null;
  } | null;
  language_proficiency: LanguageProficiency | null;
  additional_documents: string[] | null;
}

export type Feasibility = "High" | "Medium" | "Strict";

export interface AlternativePathways {
  non_direct_degree_admission: string | null;
  language_waiver_feasibility: Feasibility | null;
  self_funded_fee_tier_eur: number | null;
  partner_country_scholarship_odds: string | null;
}

export type EnrichableSection =
  | "funding_detail"
  | "deadlines"
  | "institutions"
  | "mobility"
  | "eligibility"
  | "documents"
  | "pathways"
  | "competition";

export interface DataQuality {
  /** "Rules in app" column of the seed CSV. */
  rules: "hand_checked" | "catalogue_only";
  sections: Record<EnrichableSection, Provenance>;
  sources: string[];
  last_imported: string; // YYYY-MM-DD
  notes: string[];
}

export interface Program {
  id: string;
  name: string;
  acronym: string;
  program_type: ProgramType;
  degree_awarded: "Joint Degree" | "Multiple Degree" | "Double Degree" | null;
  website_url: string | null;
  eacea_catalogue_url: string | null;
  coordinating_institution: Institution | null;
  partner_institutions: Institution[] | null;
  mobility_tracks: MobilityStep[] | null;
  discipline_cluster: DisciplineCluster;
  keywords: string[];
  research_pillars: string[] | null;
  duration_months: number | null;
  ects_credits: number | null;
  new_for_2027: boolean;
  funding: Funding;
  deadlines: Deadlines;
  eligibility_criteria: EligibilityCriteria;
  document_checklist: DocumentChecklist;
  alternative_pathways: AlternativePathways;
  competition?: Competition | null;
  data_quality: DataQuality;
}

/** Shape of a file in data/enrichment/. Any subset of Program, plus required provenance. */
export interface Enrichment {
  id: string;
  provenance: Provenance;
  sources?: string[];
  notes?: string[];
  sections: EnrichableSection[];
  patch: DeepPartial<Program>;
}

export type DeepPartial<T> = T extends (infer U)[]
  ? DeepPartial<U>[]
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> | null }
    : T;
