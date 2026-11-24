import raw from "../../data/programs.json";
import type { Program } from "./types";

const data = raw as unknown as { imported_on: string; generated_from: string; programs: Program[] };

export const PROGRAMS: Program[] = data.programs;
export const IMPORTED_ON = data.imported_on;
export const PROGRAM_BY_ID = new Map(PROGRAMS.map((p) => [p.id, p]));

export function getProgram(id: string): Program | undefined {
  return PROGRAM_BY_ID.get(id);
}

/** Programmes with sample enrichment: the demo set used by the matrix and wizard. */
export const DEMO_IDS = PROGRAMS.filter((p) => Object.values(p.data_quality.sections).includes("sample")).map((p) => p.id);
