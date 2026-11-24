/**
 * Pure extraction helpers for the crawler. No network here so they can be unit-tested
 * against saved HTML fixtures.
 */
import * as cheerio from "cheerio";

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8,
  september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

function iso(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) return null;
  const s = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const dt = new Date(s + "T00:00:00Z");
  return dt.getUTCDate() === d ? s : null;
}

/** Finds dates in free text. Returns ISO strings in order of appearance. */
export function findDates(text: string): { date: string; index: number }[] {
  const out: { date: string; index: number }[] = [];
  const mon = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
  const patterns: [RegExp, (m: RegExpExecArray) => string | null][] = [
    [/\b(20\d{2})-(\d{2})-(\d{2})\b/g, (m) => iso(+m[1], +m[2], +m[3])],
    [new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${mon}\\.?,?\\s+(20\\d{2})\\b`, "gi"), (m) => iso(+m[3], MONTHS[m[2].toLowerCase()], +m[1])],
    [new RegExp(`\\b${mon}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(20\\d{2})\\b`, "gi"), (m) => iso(+m[3], MONTHS[m[1].toLowerCase()], +m[2])],
    // European numeric dd.mm.yyyy or dd/mm/yyyy (day first)
    [/\b(\d{1,2})[./](\d{1,2})[./](20\d{2})\b/g, (m) => iso(+m[3], +m[2], +m[1])],
  ];
  for (const [re, fn] of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const d = fn(m);
      if (d) out.push({ date: d, index: m.index });
    }
  }
  return out.sort((a, b) => a.index - b.index);
}

export function pageText(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, nav, footer").remove();
  return $("body").text().replace(/\s+/g, " ").trim();
}

export interface DeadlineCandidate {
  date: string;
  kind: "scholarship" | "self_funded" | "unspecified";
  context: string;
}

/** Dates that appear within ~160 characters after a deadline keyword. */
export function extractDeadlines(text: string, today: string): DeadlineCandidate[] {
  const out: DeadlineCandidate[] = [];
  const kw = /(application\s+deadline|deadline|apply\s+by|applications?\s+close|closing\s+date)/gi;
  let m: RegExpExecArray | null;
  while ((m = kw.exec(text))) {
    const start = Math.max(0, m.index - 80);
    const window = text.slice(start, m.index + 160);
    for (const d of findDates(text.slice(m.index, m.index + 160))) {
      if (d.date < today) continue;
      // Classify on the sentence leading up to this date only, so a later
      // "self-funded" sentence does not relabel an earlier scholarship date.
      const lead = text.slice(start, m.index + d.index);
      const lw = lead.slice(Math.max(lead.lastIndexOf(". "), 0)).toLowerCase();
      const kind = /self[-\s]?fund|non[-\s]?scholarship|without\s+scholarship/.test(lw)
        ? "self_funded"
        : /scholarship|grant/.test(lw)
          ? "scholarship"
          : "unspecified";
      if (!out.some((o) => o.date === d.date && o.kind === kind)) out.push({ date: d.date, kind, context: window.trim() });
    }
  }
  return out;
}

export interface LanguageCandidate {
  ielts: number | null;
  toefl: number | null;
  moiMentioned: boolean;
}

export function extractLanguage(text: string): LanguageCandidate {
  const ielts = /IELTS[^0-9]{0,40}?([4-9](?:\.[05])?)\b/i.exec(text);
  const toefl = /TOEFL(?:\s*iBT)?[^0-9]{0,40}?(\d{2,3})\b/i.exec(text);
  const ieltsN = ielts ? Number(ielts[1]) : null;
  const toeflN = toefl ? Number(toefl[1]) : null;
  return {
    ielts: ieltsN != null && ieltsN >= 4 && ieltsN <= 9 ? ieltsN : null,
    toefl: toeflN != null && toeflN >= 40 && toeflN <= 120 ? toeflN : null,
    moiMentioned: /medium\s+of\s+instruction|\bMOI\b|taught\s+(?:entirely\s+)?in\s+English/i.test(text),
  };
}

export interface CatalogueEntry {
  acronym: string;
  title: string;
  url: string | null;
}

/**
 * Parses the EACEA Erasmus Mundus catalogue page. The page layout changes over time,
 * so this tries a few structures and falls back to "ACRONYM - Title" patterns in link text.
 */
export function parseCatalogue(html: string, baseUrl: string): CatalogueEntry[] {
  const $ = cheerio.load(html);
  const out = new Map<string, CatalogueEntry>();
  const add = (acronym: string, title: string, href: string | undefined) => {
    const a = acronym.trim();
    if (!a || a.length > 40 || out.has(a.toLowerCase())) return;
    let url: string | null = null;
    try {
      url = href ? new URL(href, baseUrl).toString() : null;
    } catch {
      url = null;
    }
    out.set(a.toLowerCase(), { acronym: a, title: title.trim(), url });
  };

  // Structure 1: table rows (acronym | title | ...)
  $("table tr").each((_, tr) => {
    const cells = $(tr).find("td");
    if (cells.length >= 2) {
      const acronym = $(cells[0]).text().trim();
      const title = $(cells[1]).text().trim();
      const href = $(tr).find("a[href^='http']").first().attr("href");
      if (/^[A-Za-z0-9+\-_.&' ]{2,40}$/.test(acronym) && title.length > 8) add(acronym, title, href);
    }
  });

  // Structure 2: links or headings shaped "ACRONYM - Title" / "ACRONYM – Title" / "Title (ACRONYM)"
  $("a, h2, h3, h4, li, p strong").each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    const href = $(el).is("a") ? $(el).attr("href") : $(el).find("a").first().attr("href");
    let m = /^([A-Z][A-Za-z0-9+\-_.&]{1,30})\s+[-–—:]\s+(.{8,200})$/.exec(text);
    if (m) return void add(m[1], m[2], href);
    m = /^(.{8,200})\s+\(([A-Z][A-Za-z0-9+\-_.&]{1,30})\)$/.exec(text);
    if (m) add(m[2], m[1], href);
  });

  return Array.from(out.values());
}

/** Minimal robots.txt check for the "*" user agent. */
export function robotsAllows(robotsTxt: string, path: string): boolean {
  let applies = false;
  const disallow: string[] = [];
  const allow: string[] = [];
  for (const raw of robotsTxt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const [k, ...rest] = line.split(":");
    const v = rest.join(":").trim();
    if (/^user-agent$/i.test(k)) applies = v === "*";
    else if (applies && /^disallow$/i.test(k) && v) disallow.push(v);
    else if (applies && /^allow$/i.test(k) && v) allow.push(v);
  }
  const longest = (xs: string[]) => Math.max(-1, ...xs.filter((x) => path.startsWith(x)).map((x) => x.length));
  return longest(allow) >= longest(disallow);
}
