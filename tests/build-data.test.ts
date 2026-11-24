import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { describe, expect, it } from "vitest";
import { applyEnrichment, buildPrograms, parseScholarship, rowToProgram, slugify, type CsvRow } from "../src/lib/build-data";
import sample from "../data/enrichment/sample-demo-programs.json";
import type { Enrichment } from "../src/lib/types";

const rows = parse(readFileSync("data/seed/erasmus-mundus-programmes-2026-11-24.csv", "utf8"), { columns: true, bom: true, trim: true }) as CsvRow[];

describe("CSV import", () => {
  it("imports all 199 rows with unique ids", () => {
    const ps = buildPrograms(rows, [], "2026-11-24");
    expect(ps).toHaveLength(199);
    expect(new Set(ps.map((p) => p.id)).size).toBe(199);
  });

  it("keeps the 11 hand-checked rows and their deadlines", () => {
    const ps = buildPrograms(rows, [], "2026-11-24");
    const hc = ps.filter((p) => p.data_quality.rules === "hand_checked");
    expect(hc).toHaveLength(11);
    expect(ps.find((p) => p.id === "deai")!.deadlines.next_deadline).toBe("2027-01-11");
  });

  it("leaves non-catalogue fields unknown (null)", () => {
    const p = rowToProgram(rows.find((r) => r.Acronym === "CoDaS")!, "2026-11-24");
    expect(p.document_checklist.language_proficiency).toBeNull();
    expect(p.eligibility_criteria.allowed_disciplines).toBeNull();
    expect(p.data_quality.sections.documents).toBe("unknown");
  });

  it("parses scholarship labels", () => {
    expect(parseScholarship("EU scholarship (€1,400/mo)")).toBe("EU_SCHOLARSHIP");
    expect(parseScholarship("Check — older grant")).toBe("OLDER_GRANT");
    expect(parseScholarship("Self-funded only")).toBe("SELF_FUNDED");
    expect(parseScholarship("Yes")).toBe("YES");
    expect(() => parseScholarship("maybe")).toThrow();
  });

  it("slugifies acronyms", () => {
    expect(slugify("E+ Traineeship")).toBe("e-traineeship");
    expect(slugify("EIT Digital DS")).toBe("eit-digital-ds");
  });
});

describe("enrichment", () => {
  const entries = (sample as { entries: Enrichment[] }).entries;

  it("applies every sample entry to an existing programme and marks provenance as sample", () => {
    const ps = buildPrograms(rows, entries, "2026-11-24");
    for (const e of entries) {
      const p = ps.find((x) => x.id === e.id)!;
      for (const s of e.sections) expect(p.data_quality.sections[s]).toBe("sample");
    }
  });

  it("never changes catalogue facts or provenance via patch", () => {
    const base = rowToProgram(rows[0], "2026-11-24");
    const evil: Enrichment = {
      id: base.id,
      provenance: "sample",
      sections: [],
      patch: { data_quality: { rules: "hand_checked" }, id: "other" } as Enrichment["patch"],
    };
    const out = applyEnrichment(base, evil);
    expect(out.id).toBe(base.id);
    expect(out.data_quality.rules).toBe(base.data_quality.rules);
  });

  it("rejects enrichment for unknown ids", () => {
    expect(() => buildPrograms(rows, [{ id: "nope", provenance: "sample", sections: [], patch: {} }], "2026-11-24")).toThrow();
  });
});
