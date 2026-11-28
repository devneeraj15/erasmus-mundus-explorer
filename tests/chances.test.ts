import { describe, expect, it } from "vitest";
import { PROGRAMS, PROGRAM_BY_ID } from "../src/lib/data";
import { computeChances } from "../src/lib/chances";

const TODAY = "2026-11-27";

describe("My chances", () => {
  it("gives every programme a result", () => {
    for (const p of PROGRAMS) expect(computeChances(p, null, TODAY).reasons.length).toBeGreaterThan(0);
  });

  it("labels programmes with no scholarship instead of scoring them", () => {
    const c = computeChances(PROGRAM_BY_ID.get("imete")!, 90, TODAY);
    expect(c.tier).toBe("NO_SCHOLARSHIP");
    expect(c.index).toBeNull();
  });

  it("labels passed deadlines as closed", () => {
    const c = computeChances(PROGRAM_BY_ID.get("deai")!, 90, "2027-02-01");
    expect(c.tier).toBe("CLOSED");
  });

  it("does not score doctoral networks or traineeships", () => {
    expect(computeChances(PROGRAM_BY_ID.get("msca-dn")!, 90, TODAY).tier).toBe("NOT_APPLICABLE");
  });

  it("rises with CV fit and says when fit was not measured", () => {
    const p = PROGRAM_BY_ID.get("deai")!;
    const none = computeChances(p, null, TODAY);
    const low = computeChances(p, 10, TODAY);
    const high = computeChances(p, 95, TODAY);
    expect(none.fitMeasured).toBe(false);
    expect(high.fitMeasured).toBe(true);
    expect(high.index!).toBeGreaterThan(none.index!);
    expect(none.index!).toBeGreaterThan(low.index!);
  });

  it("uses published applicant numbers when available", () => {
    const c = computeChances(PROGRAM_BY_ID.get("ipcvai")!, null, TODAY);
    expect(c.reasons[0]).toMatch(/1 in 64/);
  });

  it("penalises an unconfirmed call", () => {
    const deai = PROGRAM_BY_ID.get("deai")!;
    const unconfirmed = { ...deai, deadlines: { ...deai.deadlines, check: { ...deai.deadlines.check!, status: "NOT_FOUND" as const } } };
    expect(computeChances(unconfirmed, 50, TODAY).index).toBe(computeChances(deai, 50, TODAY).index! - 5);
  });
});
