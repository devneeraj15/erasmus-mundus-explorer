/**
 * "My chances": a transparent, rule-based estimate of how promising a
 * scholarship application to a programme looks. It is a relative index for
 * sorting a shortlist, NOT a probability of admission or of a scholarship.
 *
 * Inputs, all visible in the UI:
 *  1. Gates: not a degree call, no scholarship this intake, deadline passed.
 *  2. Competition (0-40 points): from published intake numbers when the
 *     programme states them, otherwise a cautious default.
 *  3. Fit (0-60 points): the CV Match score for this programme (0-100) x 0.6.
 *     Without a CV, fit is unknown and the index uses a neutral 30.
 */
import { deadlineStatus, todayIso } from "./deadlines";
import type { Program } from "./types";

export type ChanceTier = "GOOD" | "POSSIBLE" | "LONG_SHOT" | "NO_SCHOLARSHIP" | "CLOSED" | "NOT_APPLICABLE";

export interface Chances {
  tier: ChanceTier;
  /** 0-100 relative index; null when a gate applies. */
  index: number | null;
  /** True when fit came from the user's CV, false when the neutral default was used. */
  fitMeasured: boolean;
  reasons: string[];
}

export const TIER_LABEL: Record<ChanceTier, string> = {
  GOOD: "Good shot",
  POSSIBLE: "Possible",
  LONG_SHOT: "Long shot",
  NO_SCHOLARSHIP: "No scholarship",
  CLOSED: "Closed",
  NOT_APPLICABLE: "n/a",
};

export const NEUTRAL_FIT = 50;
const GOOD_AT = 55;
const POSSIBLE_AT = 35;

/** Successful places per application, when the programme publishes both numbers. */
export function acceptanceRatio(p: Program): number | null {
  const c = p.competition;
  if (!c?.applicants) return null;
  const awarded = c.scholarships || c.places;
  return awarded ? awarded / c.applicants : null;
}

export function competitionPoints(p: Program): { points: number; reason: string } {
  const c = p.competition;
  const ratio = acceptanceRatio(p);
  if (ratio !== null) {
    const oneIn = Math.round(1 / ratio);
    const points = ratio >= 0.1 ? 32 : ratio >= 0.05 ? 22 : ratio >= 0.02 ? 12 : 5;
    return { points, reason: `About 1 in ${oneIn} applicants is selected (programme's own figures)` };
  }
  if (c?.scholarships != null) {
    if (c.scholarships >= 15) return { points: 16, reason: `${c.scholarships} scholarships per intake, more than many programmes` };
    if (c.scholarships <= 8) return { points: 7, reason: `Only about ${c.scholarships} scholarships per intake` };
    return { points: 12, reason: `${c.scholarships} scholarships per intake; applicant numbers not published` };
  }
  return { points: 12, reason: "Applicant numbers not published; assumed as competitive as a typical Erasmus Mundus call" };
}

export function computeChances(p: Program, fitScore: number | null, today: string = todayIso()): Chances {
  const check = p.deadlines.check;
  const reasons: string[] = [];

  if (check?.status === "NOT_APPLICABLE" || p.program_type === "MSCA" || p.program_type === "SHORT_TERM" || p.program_type === "EMDM") {
    return { tier: "NOT_APPLICABLE", index: null, fitMeasured: false, reasons: ["Not a single degree programme with a scholarship call"] };
  }
  if (check?.status === "NO_SCHOLARSHIP") {
    return {
      tier: "NO_SCHOLARSHIP",
      index: null,
      fitMeasured: false,
      reasons: ["The official site says there are no Erasmus Mundus scholarships for the coming intake. Self-funded entry may still be possible."],
    };
  }
  if (p.funding.scholarship_status === "SELF_FUNDED" && check?.kind !== "scholarship") {
    return { tier: "NO_SCHOLARSHIP", index: null, fitMeasured: false, reasons: ["Catalogue lists this programme as self-funded only"] };
  }
  if (deadlineStatus(p, today) === "CLOSED") {
    return { tier: "CLOSED", index: null, fitMeasured: false, reasons: ["The deadline for the coming intake has passed"] };
  }

  const comp = competitionPoints(p);
  reasons.push(comp.reason);

  const fitMeasured = fitScore !== null;
  const fit = fitMeasured ? Math.max(0, Math.min(100, fitScore)) : NEUTRAL_FIT;
  reasons.push(fitMeasured ? `CV fit ${fit}/100 from CV Match` : "CV fit not measured: run CV Match to personalise");

  let index = comp.points + Math.round(fit * 0.6);

  if (check?.status !== "CONFIRMED" && check?.status !== "ANNUAL_RULE") {
    index -= 5;
    reasons.push("Scholarship call for the coming intake not confirmed on the official site (-5)");
  }
  index = Math.max(0, Math.min(100, index));
  const tier: ChanceTier = index >= GOOD_AT ? "GOOD" : index >= POSSIBLE_AT ? "POSSIBLE" : "LONG_SHOT";
  return { tier, index, fitMeasured, reasons };
}

/** localStorage key for per-programme fit scores saved from CV Match. Holds numbers only, never CV text. */
export const FIT_STORE_KEY = "em:cv-fit:v1";
export interface FitStore {
  saved_on: string | null;
  scores: Record<string, number>;
}
export const EMPTY_FIT: FitStore = { saved_on: null, scores: {} };
