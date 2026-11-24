import { describe, expect, it } from "vitest";
import { extractDeadlines, extractLanguage, findDates, pageText, parseCatalogue, robotsAllows } from "../src/lib/crawl-extract";

describe("date parsing", () => {
  it("handles common formats", () => {
    const t = "15 January 2027, March 3rd, 2027, 2027-02-11 and 01.04.2027";
    expect(findDates(t).map((d) => d.date)).toEqual(["2027-01-15", "2027-03-03", "2027-02-11", "2027-04-01"]);
  });
  it("rejects impossible dates", () => {
    expect(findDates("31.02.2027")).toEqual([]);
  });
});

describe("deadline extraction", () => {
  const html = `<html><body><nav>Menu 1 Jan 2020</nav>
    <p>Application deadline for scholarship applicants: 15 January 2027.</p>
    <p>Self-funded applicants deadline: 30 April 2027</p>
    <p>Old news: deadline 10 January 2025</p></body></html>`;
  it("classifies scholarship vs self-funded and drops past dates", () => {
    const d = extractDeadlines(pageText(html), "2026-11-24");
    expect(d.map((x) => [x.date, x.kind])).toEqual([
      ["2027-01-15", "scholarship"],
      ["2027-04-30", "self_funded"],
    ]);
  });
});

describe("language extraction", () => {
  it("finds IELTS/TOEFL minimums and MOI mentions", () => {
    const l = extractLanguage("Minimum IELTS overall 6.5 or TOEFL iBT 90. Medium of instruction letters accepted.");
    expect(l).toEqual({ ielts: 6.5, toefl: 90, moiMentioned: true });
  });
  it("ignores out-of-range numbers", () => {
    expect(extractLanguage("TOEFL code 3456").toefl).toBeNull();
  });
});

describe("catalogue parsing", () => {
  it("parses table and 'ACRONYM - Title' layouts", () => {
    const html = `<table><tr><td>DEAI</td><td>Data Engineering and Artificial Intelligence</td><td><a href="https://deai.ulb.be">site</a></td></tr></table>
      <ul><li><a href="https://example.org/x">NEWPROG - A New Joint Master in Something</a></li>
      <li>Ocean Science Master (OSM)</li></ul>`;
    const e = parseCatalogue(html, "https://www.eacea.ec.europa.eu/");
    expect(e.map((x) => x.acronym)).toEqual(["DEAI", "NEWPROG", "OSM"]);
    expect(e[0].url).toBe("https://deai.ulb.be/");
  });
});

describe("robots.txt", () => {
  it("respects disallow and longer allow", () => {
    const r = "User-agent: *\nDisallow: /private\nAllow: /private/ok\n";
    expect(robotsAllows(r, "/private/x")).toBe(false);
    expect(robotsAllows(r, "/private/ok/page")).toBe(true);
    expect(robotsAllows(r, "/")).toBe(true);
  });
});
