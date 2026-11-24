import { describe, expect, it } from "vitest";
import { PROGRAM_BY_ID, PROGRAMS } from "../src/lib/data";
import { DEFAULT_PROFILE, evaluate, type Profile } from "../src/lib/eligibility";

const P = (id: string) => PROGRAM_BY_ID.get(id)!;
const prof = (o: Partial<Profile>): Profile => ({ ...DEFAULT_PROFILE, ...o });

describe("eligibility engine", () => {
  it("gives a direct match for a CS graduate with enough IELTS on DEAI (sample data)", () => {
    const r = evaluate(P("deai"), prof({ major: "Computer Science", english: "ielts", englishScore: 7 }));
    expect(r.verdict).toBe("green");
  });

  it("finds an alternative route for a Physics graduate with an MOI letter", () => {
    const r = evaluate(P("deai"), prof({ major: "Physics", english: "moi" }));
    expect(r.verdict).toBe("amber");
    expect(r.checks.find((c) => c.key === "discipline")!.status).toBe("alt");
    expect(r.checks.find((c) => c.key === "language")!.status).toBe("alt");
  });

  it("fails when IELTS is below the minimum", () => {
    const r = evaluate(P("deai"), prof({ english: "ielts", englishScore: 5.5 }));
    expect(r.verdict).toBe("red");
  });

  it("fails MOI where the waiver is not accepted", () => {
    const r = evaluate(P("cde"), prof({ major: "Geography", english: "moi" }));
    expect(r.checks.find((c) => c.key === "language")!.status).toBe("fail");
  });

  it("flags a 180-ECTS degree against a 240-ECTS programme, with a route when one exists", () => {
    const r = evaluate(P("imete"), prof({ degreeLevel: "bachelor", degreeEcts: 180, major: "Environmental Engineering", english: "native" }));
    expect(r.checks.find((c) => c.key === "ects")!.status).toBe("alt");
  });

  it("rejects final-year students where not allowed", () => {
    const r = evaluate(P("imete"), prof({ degreeLevel: "bachelor_final_year", degreeEcts: 240, major: "Environmental Engineering", english: "native" }));
    expect(r.checks.find((c) => c.key === "level")!.status).toBe("fail");
  });

  it("requires a master's for MSCA doctoral positions", () => {
    expect(evaluate(P("msca-dn"), prof({ degreeLevel: "bachelor" })).checks.find((c) => c.key === "level")!.status).toBe("fail");
    expect(evaluate(P("msca-dn"), prof({ degreeLevel: "master" })).checks.find((c) => c.key === "level")!.status).toBe("pass");
  });

  it("never passes a catalogue-only programme on unknown rules", () => {
    const r = evaluate(P("codas"), prof({ english: "ielts", englishScore: 8 }));
    expect(r.verdict).toBe("unverified");
    expect(r.checks.find((c) => c.key === "language")!.status).toBe("unknown");
  });

  it("applies the prior-EMJM-scholarship rule and the 10% nationality advisory", () => {
    const r = evaluate(P("deai"), prof({ priorEmjmScholarship: true, english: "native" }), PROGRAMS);
    expect(r.checks.find((c) => c.key === "scholarship")!.status).toBe("alt");
    const adv = r.advisories.find((a) => a.kind === "nationality_cap")!;
    expect(adv).toBeTruthy();
    expect(adv.relatedIds!.every((id) => PROGRAM_BY_ID.get(id)!.discipline_cluster === "Computer Science")).toBe(true);
  });

  it("labels results that rely on sample data", () => {
    const r = evaluate(P("deai"), prof({}));
    expect(r.advisories.some((a) => a.kind === "data")).toBe(true);
  });
});
