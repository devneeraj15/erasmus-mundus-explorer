import { describe, expect, it } from "vitest";
import { PROGRAM_BY_ID } from "../src/lib/data";
import { deadlineStatus } from "../src/lib/deadlines";

describe("deadline status", () => {
  const deai = PROGRAM_BY_ID.get("deai")!;
  it("is DEADLINE_AHEAD (not OPEN) when only the deadline is known", () => {
    expect(deadlineStatus(deai, "2026-11-24")).toBe("DEADLINE_AHEAD");
  });
  it("is CLOSED after the deadline", () => {
    expect(deadlineStatus(deai, "2027-02-01")).toBe("CLOSED");
  });
  it("uses the open date when known", () => {
    const p = { ...deai, deadlines: { ...deai.deadlines, applications_open_date: "2026-12-01" } };
    expect(deadlineStatus(p, "2026-11-24")).toBe("OPENING_SOON");
    expect(deadlineStatus(p, "2026-12-05")).toBe("OPEN");
  });
  it("is UNKNOWN without any deadline", () => {
    expect(deadlineStatus(PROGRAM_BY_ID.get("emecs")!, "2026-11-24")).toBe("UNKNOWN");
  });
});
