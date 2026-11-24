import { countryName } from "./countries";
import type { Program } from "./types";

export type DocStatus = "todo" | "in_progress" | "ready" | "submitted";

export interface DocItem {
  key: string;
  label: string;
  /** true when derived from programme data; false when it is the generic default list. */
  fromProgramData: boolean;
  note?: string;
}

/** Generic list used when a programme's checklist is unknown. Labelled as generic in the UI. */
const GENERIC: DocItem[] = [
  { key: "transcripts", label: "Academic transcripts", fromProgramData: false },
  { key: "degree", label: "Degree certificate (or expected-graduation letter)", fromProgramData: false },
  { key: "cv", label: "CV", fromProgramData: false },
  { key: "motivation", label: "Motivation letter / statement of purpose", fromProgramData: false },
  { key: "references", label: "Recommendation letters", fromProgramData: false },
  { key: "language", label: "English proficiency proof", fromProgramData: false },
  { key: "passport", label: "Passport scan", fromProgramData: false },
];

export function documentsFor(p: Program): DocItem[] {
  const d = p.document_checklist;
  const known =
    d.academic_transcripts || d.degree_certificate || d.cv_format || d.motivation_letter || d.recommendation_letters || d.language_proficiency;
  if (!known) return GENERIC;

  const items: DocItem[] = [];
  if (d.academic_transcripts?.required)
    items.push({ key: "transcripts", label: "Academic transcripts", fromProgramData: true, note: d.academic_transcripts.certified_translation ? "Certified translation needed" : undefined });
  if (d.degree_certificate?.required)
    items.push({ key: "degree", label: "Degree certificate", fromProgramData: true, note: d.degree_certificate.conditional_provisional_allowed ? "Provisional / expected-graduation letter accepted" : "Final certificate required" });
  if (d.cv_format) items.push({ key: "cv", label: "CV", fromProgramData: true, note: d.cv_format });
  if (d.motivation_letter?.required)
    items.push({ key: "motivation", label: "Motivation letter", fromProgramData: true, note: d.motivation_letter.max_words_or_pages ?? undefined });
  const refs = d.recommendation_letters?.count;
  if (refs) items.push({ key: "references", label: `Recommendation letters (${refs})`, fromProgramData: true, note: d.recommendation_letters?.method ?? undefined });
  const lp = d.language_proficiency;
  if (lp?.accepted_tests?.length)
    items.push({ key: "language", label: "English proficiency proof", fromProgramData: true, note: [lp.accepted_tests.join(", "), lp.moi_waiver_accepted ? "MOI waiver accepted" : null].filter(Boolean).join(" · ") });
  for (const extra of d.additional_documents ?? []) items.push({ key: `extra:${extra}`, label: extra, fromProgramData: true });
  return items;
}

export interface SopContext {
  major: string;
  experience: string; // free text from the user
  goal: string; // free text
}

/**
 * Tailored statement-of-purpose prompts built from the programme's own data
 * (pillars, mobility countries, partners, stated prompts). Template-based: no AI.
 */
export function sopPrompts(p: Program, ctx: SopContext): string[] {
  const out: string[] = [];
  const stated = p.document_checklist.motivation_letter?.specific_prompts ?? [];
  for (const s of stated) out.push(`Programme prompt: "${s}". Answer it directly in its own paragraph.`);

  const pillars = p.research_pillars ?? p.keywords;
  if (pillars.length) {
    out.push(
      `Pick one of ${p.acronym}'s focus areas (${pillars.slice(0, 3).join(", ")}) and connect it to a specific course, project or result from your ${ctx.major || "studies"}.`,
    );
  }
  const countries = Array.from(new Set((p.mobility_tracks ?? []).flatMap((m) => m.countries)));
  if (countries.length > 1) {
    out.push(
      `Explain your mobility choice: which of ${countries.map(countryName).join(", ")} you would pick for each period and what you would gain academically in each.`,
    );
  }
  const partners = (p.partner_institutions ?? []).filter((x) => !/^sample/i.test(x.name));
  if (partners.length) out.push(`Name a partner (${partners.map((x) => x.name).join(", ")}) and a research group or course there that matters for your plans.`);
  if (ctx.experience.trim()) out.push(`Turn your experience ("${ctx.experience.trim()}") into evidence: what problem you worked on, what you did, what changed.`);
  out.push(
    ctx.goal.trim()
      ? `Close with your goal ("${ctx.goal.trim()}") and why a ${p.program_type === "EMJM" ? "joint European degree" : "programme"} like ${p.acronym} is the step that gets you there.`
      : `Close with a concrete career goal and why ${p.acronym} specifically, rather than a single-university master, is the right step.`,
  );
  if (p.program_type === "EIT") out.push("EIT programmes weigh innovation and entrepreneurship: describe an idea you would like to take to market or an initiative you started.");
  if (p.program_type === "MSCA") out.push("For a doctoral position, address the specific project's research question and the methods you already master.");
  return out;
}
