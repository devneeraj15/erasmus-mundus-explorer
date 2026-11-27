import { describe, expect, it } from "vitest";
import raw from "../data/programs.json";
import { matchCv, profileCv, tokenize } from "../src/lib/cv-match";
import type { Program } from "../src/lib/types";

const PROGRAMS = (raw as unknown as { programs: Program[] }).programs;
const EMJM = (p: Program) => p.program_type === "EMJM";

const CVS = {
  ml: `Software engineer with 3 years experience. B.Tech Computer Science. Skills: Python, PyTorch, TensorFlow, scikit-learn, SQL, pandas, Spark.
       Built deep learning models for NLP and computer vision. Machine learning intern at a startup.`,
  gis: `BSc Geography. GIS analyst using ArcGIS, QGIS and remote sensing of satellite imagery for land cover mapping and flood risk. Climate change adaptation projects.`,
  health: `MBBS graduate. Clinical rotations in hospital. Research in epidemiology and public health, vaccine coverage surveys, infectious diseases.`,
  film: `Documentary filmmaker and video editor. Premiere Pro, After Effects. Journalism degree, media production, sound design for short films.`,
  energy: `Electrical engineering graduate. Power systems, solar photovoltaic plant design, wind energy, smart grid, battery storage, power electronics, MATLAB Simulink.`,
};

describe("cv matcher", () => {
  it("stems consistently", () => {
    expect(tokenize("Engineering engineer")).toEqual(tokenize("engineers engineering"));
  });

  it("returns at most 5 matches, best first, scores in 0..100", () => {
    const { matches } = matchCv(CVS.ml, PROGRAMS, { filter: EMJM });
    expect(matches.length).toBe(5);
    for (const m of matches) expect(m.score).toBeGreaterThanOrEqual(0);
    for (const m of matches) expect(m.score).toBeLessThanOrEqual(100);
    for (let i = 1; i < matches.length; i++) expect(matches[i - 1].score).toBeGreaterThanOrEqual(matches[i].score - 1);
    expect(matches.every((m) => m.program.program_type === "EMJM")).toBe(true);
  });

  const expectTopCluster = (cv: string, cluster: Program["discipline_cluster"], re: RegExp) => {
    const { matches } = matchCv(cv, PROGRAMS, { filter: EMJM });
    expect(matches[0].program.discipline_cluster).toBe(cluster);
    expect(matches.slice(0, 3).some((m) => re.test(m.program.name))).toBe(true);
  };

  it("ML CV → AI / data programmes", () => expectTopCluster(CVS.ml, "Computer Science", /artificial intelligence|data/i));
  it("GIS CV → geospatial programmes", () => expectTopCluster(CVS.gis, "Environmental Sciences", /geo|cartograph|earth|flood/i));
  it("health CV → public health programmes", () => expectTopCluster(CVS.health, "Life Sciences", /health|disease|vaccin/i));
  it("film CV → film / media programmes", () => expectTopCluster(CVS.film, "Humanities", /film|documentary|sound|journalism/i));
  it("energy CV → energy programmes", () => expectTopCluster(CVS.energy, "Engineering", /energy|power|renewable/i));

  it("an empty or irrelevant CV gives no matches", () => {
    expect(matchCv("", PROGRAMS).matches).toEqual([]);
    expect(profileCv("John Doe, phone 12345").concepts).toEqual([]);
  });

  it("is deterministic", () => {
    expect(matchCv(CVS.gis, PROGRAMS).matches.map((m) => m.program.id)).toEqual(matchCv(CVS.gis, PROGRAMS).matches.map((m) => m.program.id));
  });
});
