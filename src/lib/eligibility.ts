/**
 * Eligibility & alternative-pathway evaluator.
 *
 * Pure and deterministic: the same profile + programme always gives the same
 * result. When a programme's rule is unknown (null), the check is "unknown",
 * never a pass. The evaluator never invents requirements.
 */
import type { DisciplineCluster, Program, Provenance } from "./types";

export type DegreeLevel = "bachelor_final_year" | "bachelor" | "master" | "phd" | "other";
export type EnglishStatus = "native" | "ielts" | "toefl" | "moi" | "none";

export interface Profile {
  degreeLevel: DegreeLevel;
  degreeEcts: number | null;
  graduationCountry: string; // ISO alpha-2
  nationality: string; // ISO alpha-2
  major: string;
  gradeBand: "top" | "upper" | "middle" | "lower" | "unknown";
  english: EnglishStatus;
  englishScore: number | null;
  workYears: number;
  priorEmjmScholarship: boolean;
}

export const DEFAULT_PROFILE: Profile = {
  degreeLevel: "bachelor_final_year",
  degreeEcts: 180,
  graduationCountry: "",
  nationality: "",
  major: "Computer Science",
  gradeBand: "unknown",
  english: "none",
  englishScore: null,
  workYears: 0,
  priorEmjmScholarship: false,
};

/** Majors offered in the wizard, with the catalogue cluster they belong to. */
export const MAJORS: Record<string, DisciplineCluster> = {
  "Computer Science": "Computer Science",
  "Data Science": "Computer Science",
  "Software Engineering": "Computer Science",
  Mathematics: "Natural Sciences",
  Statistics: "Natural Sciences",
  Physics: "Natural Sciences",
  Chemistry: "Natural Sciences",
  "Earth Sciences": "Natural Sciences",
  Geology: "Natural Sciences",
  Biology: "Life Sciences",
  Biotechnology: "Life Sciences",
  Pharmacy: "Life Sciences",
  Medicine: "Life Sciences",
  "Public Health": "Life Sciences",
  Toxicology: "Life Sciences",
  "Electrical Engineering": "Engineering",
  "Mechanical Engineering": "Engineering",
  "Civil Engineering": "Engineering",
  "Chemical Engineering": "Engineering",
  "Energy Engineering": "Engineering",
  Robotics: "Engineering",
  "Materials Science": "Engineering",
  "Environmental Engineering": "Environmental Sciences",
  "Environmental Science": "Environmental Sciences",
  Geography: "Environmental Sciences",
  Geoinformatics: "Environmental Sciences",
  Economics: "Social Sciences",
  "Political Science": "Social Sciences",
  "International Relations": "Social Sciences",
  Sociology: "Social Sciences",
  "European Studies": "Social Sciences",
  Law: "Social Sciences",
  Anthropology: "Social Sciences",
  History: "Humanities",
  "History of Art": "Humanities",
  Archaeology: "Humanities",
  Conservation: "Humanities",
  Philosophy: "Humanities",
  Languages: "Humanities",
};

export type CheckStatus = "pass" | "alt" | "fail" | "unknown";
export type Verdict = "green" | "amber" | "red" | "unverified";

export interface Check {
  key: "level" | "ects" | "discipline" | "language" | "experience" | "scholarship";
  label: string;
  status: CheckStatus;
  detail: string;
  /** Provenance of the rule used for this check. */
  source: Provenance | "programme_rule";
}

export interface Advisory {
  kind: "nationality_cap" | "pipeline" | "funding" | "data" | "related";
  text: string;
  relatedIds?: string[];
}

export interface Evaluation {
  programId: string;
  verdict: Verdict;
  checks: Check[];
  pathways: string[];
  advisories: Advisory[];
}

const norm = (s: string) => s.trim().toLowerCase();

function listHas(list: string[] | null, major: string): boolean {
  if (!list) return false;
  const m = norm(major);
  return list.some((d) => norm(d) === m || norm(d) === "any");
}

function levelCheck(p: Program, prof: Profile): Check {
  const src = p.data_quality.sections.eligibility;
  const req = p.eligibility_criteria.min_degree_level;
  const hasMaster = prof.degreeLevel === "master" || prof.degreeLevel === "phd";
  if (!req) {
    return { key: "level", label: "Degree level", status: "unknown", detail: "Entry level not recorded for this programme yet.", source: "unknown" };
  }
  const needsMaster = /master/i.test(req);
  if (needsMaster && !hasMaster) {
    return { key: "level", label: "Degree level", status: "fail", detail: `Requires ${req}.`, source: src };
  }
  if (prof.degreeLevel === "bachelor_final_year") {
    const fy = p.eligibility_criteria.final_year_students_allowed;
    if (fy === false) return { key: "level", label: "Degree level", status: "fail", detail: "Final-year students cannot apply: degree must be completed first.", source: src };
    if (fy === null) return { key: "level", label: "Degree level", status: "unknown", detail: `Requires ${req}. Not recorded whether final-year students may apply.`, source: src };
    const by = p.eligibility_criteria.proof_of_expected_graduation_deadline;
    return { key: "level", label: "Degree level", status: "pass", detail: `Final-year applicants accepted${by ? ` (proof of graduation: ${by.toLowerCase()})` : ""}.`, source: src };
  }
  if (prof.degreeLevel === "other") {
    return { key: "level", label: "Degree level", status: "alt", detail: `Requires ${req}. Ask the consortium whether your qualification is recognised as equivalent.`, source: src };
  }
  return { key: "level", label: "Degree level", status: "pass", detail: `Meets ${req}.`, source: src };
}

function ectsCheck(p: Program, prof: Profile): Check {
  const src = p.data_quality.sections.eligibility;
  const min = p.eligibility_criteria.min_ects;
  if (min == null) return { key: "ects", label: "Credits (ECTS)", status: "unknown", detail: "Minimum credits not recorded.", source: "unknown" };
  if (prof.degreeEcts == null) return { key: "ects", label: "Credits (ECTS)", status: "unknown", detail: `Programme asks for ${min} ECTS. Add your degree's credit total.`, source: src };
  if (prof.degreeEcts >= min) return { key: "ects", label: "Credits (ECTS)", status: "pass", detail: `${prof.degreeEcts} ≥ ${min} ECTS.`, source: src };
  const route = p.alternative_pathways.non_direct_degree_admission;
  return {
    key: "ects",
    label: "Credits (ECTS)",
    status: route ? "alt" : "fail",
    detail: `ECTS deficit: ${prof.degreeEcts} < ${min}.${route ? ` Possible route: ${route}` : " No alternative route recorded."}`,
    source: src,
  };
}

function disciplineCheck(p: Program, prof: Profile): Check {
  const src = p.data_quality.sections.eligibility;
  const e = p.eligibility_criteria;
  if (listHas(e.allowed_disciplines, prof.major)) {
    return { key: "discipline", label: "Academic background", status: "pass", detail: `${prof.major} is a listed entry discipline.`, source: src };
  }
  if (listHas(e.adjacent_disciplines, prof.major)) {
    const route = p.alternative_pathways.non_direct_degree_admission;
    return {
      key: "discipline",
      label: "Academic background",
      status: "alt",
      detail: `${prof.major} is an adjacent discipline. Show relevant credits (e.g. maths, programming, lab work) in your transcript and letter.${route ? ` ${route}` : ""}`,
      source: src,
    };
  }
  if (!e.allowed_disciplines) {
    const cluster = MAJORS[prof.major];
    const sameCluster = cluster === p.discipline_cluster || p.discipline_cluster === "Multidisciplinary";
    return {
      key: "discipline",
      label: "Academic background",
      status: "unknown",
      detail: sameCluster
        ? `Entry disciplines not recorded. The programme's field (${p.discipline_cluster}) matches your major's area, so check the official site.`
        : `Entry disciplines not recorded. The programme's field (${p.discipline_cluster}) differs from your major's area (${cluster ?? "unknown"}).`,
      source: "unknown",
    };
  }
  return { key: "discipline", label: "Academic background", status: "fail", detail: `${prof.major} is not among the listed or adjacent disciplines.`, source: src };
}

function languageCheck(p: Program, prof: Profile): Check {
  const lp = p.document_checklist.language_proficiency;
  const src = p.data_quality.sections.documents;
  const label = "English proficiency";
  if (prof.english === "native") return { key: "language", label, status: "pass", detail: "Native speakers are normally exempt. Confirm the exact wording on the programme site.", source: lp ? src : "unknown" };
  if (!lp || (!lp.minimum_scores && lp.moi_waiver_accepted == null)) {
    return { key: "language", label, status: "unknown", detail: "Language requirements not recorded for this programme.", source: "unknown" };
  }
  const min = prof.english === "ielts" ? lp.minimum_scores?.ielts : prof.english === "toefl" ? lp.minimum_scores?.toefl : null;
  if (prof.english === "ielts" || prof.english === "toefl") {
    const test = prof.english === "ielts" ? "IELTS" : "TOEFL iBT";
    if (min == null) return { key: "language", label, status: "unknown", detail: `No ${test} minimum recorded.`, source: src };
    if (prof.englishScore == null) return { key: "language", label, status: "unknown", detail: `${test} minimum is ${min}. Enter your score.`, source: src };
    if (prof.englishScore >= min) return { key: "language", label, status: "pass", detail: `${test} ${prof.englishScore} ≥ ${min}.`, source: src };
    return { key: "language", label, status: "fail", detail: `${test} ${prof.englishScore} is below the ${min} minimum. Retake before the deadline.`, source: src };
  }
  // moi or none
  if (lp.moi_waiver_accepted === true && prof.english === "moi") {
    return { key: "language", label, status: "alt", detail: "No test, but an English-medium-of-instruction (MOI) letter is accepted as a waiver. Get it from your university registrar.", source: src };
  }
  if (lp.moi_waiver_accepted === false && prof.english === "moi") {
    return { key: "language", label, status: "fail", detail: "MOI letters are not accepted here: a test score is required.", source: src };
  }
  if (lp.moi_waiver_accepted == null && prof.english === "moi") {
    return { key: "language", label, status: "unknown", detail: "Not recorded whether an MOI letter is accepted.", source: src };
  }
  const ielts = lp.minimum_scores?.ielts;
  return { key: "language", label, status: "fail", detail: `A test is required${ielts ? ` (IELTS ${ielts} or equivalent)` : ""}.`, source: src };
}

function experienceCheck(p: Program, prof: Profile): Check {
  const src = p.data_quality.sections.eligibility;
  const req = p.eligibility_criteria.work_experience_requirement;
  const years = p.eligibility_criteria.min_work_experience_years ?? 0;
  const label = "Work / research experience";
  if (req == null) return { key: "experience", label, status: "unknown", detail: "Experience requirement not recorded.", source: "unknown" };
  if (req === "Mandatory" && prof.workYears < years) return { key: "experience", label, status: "fail", detail: `Requires at least ${years} year(s).`, source: src };
  if (req === "Preferred" && prof.workYears === 0) return { key: "experience", label, status: "alt", detail: "Experience is preferred. Emphasise internships, research projects or volunteering.", source: src };
  return { key: "experience", label, status: "pass", detail: req === "None" ? "No experience required." : `${req}: you have ${prof.workYears} year(s).`, source: src };
}

function scholarshipCheck(p: Program, prof: Profile): Check | null {
  if (p.program_type !== "EMJM" || p.funding.scholarship_status !== "EU_SCHOLARSHIP") return null;
  if (!prof.priorEmjmScholarship) {
    return { key: "scholarship", label: "EU scholarship", status: "pass", detail: "No previous EMJM scholarship.", source: "programme_rule" };
  }
  return {
    key: "scholarship",
    label: "EU scholarship",
    status: "alt",
    detail: "Previous EMJM scholarship holders cannot receive another one. You can still apply self-funded or for a consortium scholarship.",
    source: "programme_rule",
  };
}

export function verdictFrom(checks: Check[]): Verdict {
  if (checks.some((c) => c.status === "fail")) return "red";
  const core = checks.filter((c) => c.key === "level" || c.key === "discipline" || c.key === "language");
  if (core.some((c) => c.status === "unknown")) return "unverified";
  if (checks.some((c) => c.status === "alt")) return "amber";
  if (checks.some((c) => c.status === "unknown")) return "unverified";
  return "green";
}

export function relatedPrograms(p: Program, prof: Profile, all: Program[], limit = 3): Program[] {
  return all
    .filter((q) => q.id !== p.id && q.discipline_cluster === p.discipline_cluster && q.program_type === p.program_type)
    .filter((q) => q.funding.scholarship_status === "EU_SCHOLARSHIP" || q.funding.scholarship_status === "YES")
    .map((q) => ({
      q,
      score:
        (q.new_for_2027 ? 2 : 0) +
        (listHas(q.eligibility_criteria.allowed_disciplines, prof.major) ? 3 : 0) +
        (q.data_quality.rules === "hand_checked" ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.q.acronym.localeCompare(b.q.acronym))
    .slice(0, limit)
    .map((x) => x.q);
}

export function evaluate(p: Program, prof: Profile, all: Program[] = []): Evaluation {
  const checks: Check[] = [levelCheck(p, prof), ectsCheck(p, prof), disciplineCheck(p, prof), languageCheck(p, prof), experienceCheck(p, prof)];
  const sch = scholarshipCheck(p, prof);
  if (sch) checks.push(sch);

  const pathways = checks.filter((c) => c.status === "alt").map((c) => `${c.label}: ${c.detail}`);
  if (p.alternative_pathways.language_waiver_feasibility && checks.find((c) => c.key === "language")?.status !== "pass") {
    pathways.push(`Language waiver feasibility: ${p.alternative_pathways.language_waiver_feasibility}.`);
  }

  const advisories: Advisory[] = [];
  if (p.program_type === "EMJM" && p.funding.scholarship_status === "EU_SCHOLARSHIP") {
    const related = all.length ? relatedPrograms(p, prof, all) : [];
    advisories.push({
      kind: "nationality_cap",
      text:
        "EMJM rule: no more than 10% of a programme's EU scholarships in one intake may go to candidates of the same nationality. " +
        "If many applicants share your nationality, apply to several programmes. " +
        "This app has no applicant-volume data, so the related programmes below are suggestions in the same field, favouring new programmes (which tend to be less known), not measured admission rates.",
      relatedIds: related.map((r) => r.id),
    });
  }
  if (p.program_type === "EMDM") {
    advisories.push({ kind: "pipeline", text: "Design Measure: this master is still being designed and is not admitting students. Use the time to close gaps (credits, language test) before it launches." });
  }
  if (p.funding.scholarship_status === "OLDER_GRANT") {
    advisories.push({ kind: "funding", text: "Funded under an older call. Whether EU scholarships are offered for the next intake is unclear: check the official site." });
  }
  if (p.funding.scholarship_status === "SELF_FUNDED") {
    advisories.push({ kind: "funding", text: "Listed as self-funded only for the next intake." });
  }
  const sample = checks.some((c) => c.source === "sample");
  if (sample) {
    advisories.push({ kind: "data", text: "Some requirements used here are SAMPLE data for the demo and have not been verified. Confirm on the official website before relying on this result." });
  }
  return { programId: p.id, verdict: verdictFrom(checks), checks, pathways, advisories };
}
