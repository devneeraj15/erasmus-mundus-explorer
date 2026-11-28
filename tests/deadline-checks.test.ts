import { describe, expect, it } from "vitest";
import { PROGRAMS, PROGRAM_BY_ID } from "../src/lib/data";
import { deadlinePatch, parseCheckLine, toCheck } from "../src/lib/deadline-checks";

const line = (...f: string[]) => f.join("\t");

describe("deadline check log", () => {
  it("maps a confirmed row to the scholarship deadline and records a corrected catalogue date", () => {
    const row = parseCheckLine(line("EIT Digital DS", "FOUND", "2027-01-31", "2027", "https://example.org", "Period one ... 31 January 2027", "-"));
    const check = toCheck(row, "2026-11-27", "2027-02-11");
    expect(check).toMatchObject({ status: "CONFIRMED", kind: "scholarship", catalogue_deadline: "2027-02-11" });
    expect(deadlinePatch(check)).toMatchObject({ scholarship_deadline: "2027-01-31", next_deadline: "2027-01-31" });
  });

  it("never writes dates from an old intake, a month-only date or an annual rule", () => {
    for (const [status, date] of [["OLD", "2026-02-27"], ["MONTH_ONLY", "2027-02"], ["ANNUAL_RULE", "2027-01-31"]]) {
      const check = toCheck(parseCheckLine(line("X", status, date, "-", "-", "-", "-")), "2026-11-27", null);
      const patch = deadlinePatch(check);
      expect(patch.scholarship_deadline).toBeUndefined();
      expect(patch.next_deadline).toBeUndefined();
      expect(check.date).toBe(date);
    }
  });

  it("puts a self-funded-only date in the self-funded field", () => {
    const check = toCheck(parseCheckLine(line("MBUILD", "NO_SCHOLARSHIP", "2027-01-31", "2027", "-", "-", "-")), "2026-11-27", null);
    expect(deadlinePatch(check)).toMatchObject({ self_funded_deadline: "2027-01-31" });
    expect(deadlinePatch(check).scholarship_deadline).toBeUndefined();
  });

  it("rejects malformed rows", () => {
    expect(() => parseCheckLine("A\tFOUND")).toThrow();
    expect(() => toCheck(parseCheckLine(line("A", "FOUND", "31 Jan", "-", "-", "-", "-")), "2026-11-27", null)).toThrow();
  });
});

describe("built data", () => {
  it("records a check for every programme", () => {
    expect(PROGRAMS.every((p) => p.deadlines.check?.checked_on === "2026-11-27")).toBe(true);
  });
  it("applies corrections found on official sites", () => {
    expect(PROGRAM_BY_ID.get("eit-digital-ds")!.deadlines.scholarship_deadline).toBe("2027-01-31");
    expect(PROGRAM_BY_ID.get("imete")!.deadlines.check?.status).toBe("NO_SCHOLARSHIP");
  });
  it("keeps sample data badged as sample", () => {
    expect(PROGRAM_BY_ID.get("deai")!.data_quality.sections.institutions).toBe("sample");
  });
  it("only sets deadline dates backed by a confirmed check or the catalogue", () => {
    for (const p of PROGRAMS) {
      const d = p.deadlines;
      if (d.scholarship_deadline) expect(d.check?.status).toBe("CONFIRMED");
    }
  });
});
