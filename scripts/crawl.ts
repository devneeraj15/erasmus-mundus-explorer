/**
 * Refresh crawler.
 *
 *   npm run crawl                          # catalogue diff + all programme sites
 *   npm run crawl -- --only deai,cde       # just these programmes
 *   npm run crawl -- --catalogue-html f    # parse a saved catalogue page instead of fetching
 *   npm run crawl -- --skip-sites          # catalogue diff only
 *   npm run crawl -- --write-enrichment    # also write data/enrichment/crawler-<date>.json
 *
 * Output: data/crawl/report-<date>.json, a review queue. Nothing here overwrites
 * hand-checked data. With --write-enrichment, single unambiguous future deadlines
 * and language minimums are written with provenance "crawler", which the UI badges
 * as "Crawled, unreviewed". Run `npm run data:build` afterwards to rebuild.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { extractDeadlines, extractLanguage, pageText, parseCatalogue, robotsAllows, type CatalogueEntry } from "../src/lib/crawl-extract";
import type { Enrichment, Program } from "../src/lib/types";

const CATALOGUE_URL = "https://www.eacea.ec.europa.eu/scholarships/erasmus-mundus-catalogue_en";
const UA = "MobilityExplorerBot/0.1 (+https://github.com/devneeraj15/erasmus-mundus-explorer)";
const TIMEOUT_MS = 20_000;
const CONCURRENCY = 4;
const PER_HOST_DELAY_MS = 1500;

const root = resolve(__dirname, "..");
const argv = process.argv.slice(2);
const flag = (f: string) => argv.includes(f);
const opt = (f: string) => {
  const i = argv.indexOf(f);
  return i >= 0 ? argv[i + 1] : undefined;
};
const today = new Date().toISOString().slice(0, 10);

const { programs } = JSON.parse(readFileSync(join(root, "data/programs.json"), "utf8")) as { programs: Program[] };

async function get(url: string): Promise<{ status: number; finalUrl: string; body: string } | { error: string }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { "user-agent": UA, accept: "text/html,*/*" }, redirect: "follow", signal: ctrl.signal });
    const body = (res.headers.get("content-type") ?? "").includes("html") ? await res.text() : "";
    return { status: res.status, finalUrl: res.url, body };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(t);
  }
}

const robotsCache = new Map<string, string | null>();
async function allowed(url: string): Promise<boolean> {
  const u = new URL(url);
  if (!robotsCache.has(u.origin)) {
    const r = await get(`${u.origin}/robots.txt`);
    robotsCache.set(u.origin, "status" in r && r.status === 200 ? r.body || "" : null);
  }
  const txt = robotsCache.get(u.origin);
  return txt == null ? true : robotsAllows(txt, u.pathname);
}

const lastHit = new Map<string, number>();
async function politeWait(url: string) {
  const host = new URL(url).host;
  const wait = (lastHit.get(host) ?? 0) + PER_HOST_DELAY_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastHit.set(host, Date.now());
}

async function catalogueDiff() {
  const file = opt("--catalogue-html");
  let html: string | null = null;
  let error: string | null = null;
  if (file) html = readFileSync(resolve(file), "utf8");
  else {
    const r = await get(CATALOGUE_URL);
    if ("error" in r) error = r.error;
    else if (r.status !== 200) error = `HTTP ${r.status}`;
    else html = r.body;
  }
  if (!html) return { source: file ?? CATALOGUE_URL, error, entries: 0, new_in_catalogue: [], missing_from_catalogue: [] };
  const entries: CatalogueEntry[] = parseCatalogue(html, CATALOGUE_URL);
  const known = new Set(programs.map((p) => p.acronym.toLowerCase()));
  const seen = new Set(entries.map((e) => e.acronym.toLowerCase()));
  return {
    source: file ?? CATALOGUE_URL,
    error: entries.length < 20 ? "Parsed fewer than 20 entries: the page layout may have changed. Check parseCatalogue()." : null,
    entries: entries.length,
    new_in_catalogue: entries.filter((e) => !known.has(e.acronym.toLowerCase())),
    missing_from_catalogue: programs
      .filter((p) => p.program_type === "EMJM" && !seen.has(p.acronym.toLowerCase()))
      .map((p) => p.acronym),
  };
}

interface SiteResult {
  id: string;
  acronym: string;
  url: string;
  status?: number;
  final_url?: string;
  error?: string;
  skipped?: string;
  deadlines?: ReturnType<typeof extractDeadlines>;
  language?: ReturnType<typeof extractLanguage>;
}

async function crawlSite(p: Program): Promise<SiteResult> {
  const base: SiteResult = { id: p.id, acronym: p.acronym, url: p.website_url! };
  if (!(await allowed(base.url))) return { ...base, skipped: "robots.txt disallows" };
  await politeWait(base.url);
  const r = await get(base.url);
  if ("error" in r) return { ...base, error: r.error };
  const text = r.body ? pageText(r.body) : "";
  return { ...base, status: r.status, final_url: r.finalUrl, deadlines: extractDeadlines(text, today), language: extractLanguage(text) };
}

async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k]);
        process.stdout.write(".");
      }
    }),
  );
  process.stdout.write("\n");
  return out;
}

function toEnrichment(results: SiteResult[]): Enrichment[] {
  const byId = new Map(programs.map((p) => [p.id, p]));
  const out: Enrichment[] = [];
  for (const r of results) {
    const p = byId.get(r.id)!;
    if (p.data_quality.rules === "hand_checked") continue; // never touch hand-checked rows
    const patch: Enrichment["patch"] = {};
    const sections: Enrichment["sections"] = [];
    const uniq = Array.from(new Set((r.deadlines ?? []).map((d) => d.date)));
    if (uniq.length === 1 && !p.deadlines.next_deadline) {
      const d = r.deadlines!.find((x) => x.date === uniq[0])!;
      patch.deadlines = d.kind === "self_funded" ? { self_funded_deadline: d.date } : d.kind === "scholarship" ? { scholarship_deadline: d.date } : { next_deadline: d.date };
      sections.push("deadlines");
    }
    if (r.language && (r.language.ielts || r.language.toefl) && p.data_quality.sections.documents === "unknown") {
      patch.document_checklist = {
        language_proficiency: { minimum_scores: { ielts: r.language.ielts, toefl: r.language.toefl } },
      };
      sections.push("documents");
    }
    if (sections.length) out.push({ id: r.id, provenance: "crawler", sources: [r.final_url ?? r.url], notes: [`Crawled ${today}; unreviewed.`], sections, patch });
  }
  return out;
}

async function main() {
  const outDir = join(root, "data/crawl");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  console.log("Checking catalogue…");
  const catalogue = await catalogueDiff();
  if (catalogue.error) console.warn(`  catalogue: ${catalogue.error}`);
  console.log(`  ${catalogue.entries} entries parsed, ${catalogue.new_in_catalogue.length} new, ${catalogue.missing_from_catalogue.length} missing`);

  let sites: SiteResult[] = [];
  if (!flag("--skip-sites")) {
    const only = opt("--only")?.split(",");
    const targets = programs.filter((p) => p.website_url && (!only || only.includes(p.id)));
    console.log(`Crawling ${targets.length} programme sites…`);
    sites = await pool(targets, CONCURRENCY, crawlSite);
  }

  const report = {
    generated_at: new Date().toISOString(),
    catalogue,
    sites: {
      total: sites.length,
      broken: sites.filter((s) => s.error || (s.status && s.status >= 400)).map((s) => ({ id: s.id, url: s.url, status: s.status, error: s.error })),
      results: sites,
    },
  };
  const reportPath = join(outDir, `report-${today}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
  console.log(`Report: ${reportPath.replace(root + "/", "")} (${report.sites.broken.length} broken links)`);

  if (flag("--write-enrichment")) {
    const entries = toEnrichment(sites);
    const enrichPath = join(root, `data/enrichment/crawler-${today}.json`);
    writeFileSync(enrichPath, JSON.stringify({ $comment: "Crawler output. Unreviewed: verify before promoting to hand_checked.", entries }, null, 2) + "\n");
    console.log(`Enrichment: ${enrichPath.replace(root + "/", "")} (${entries.length} programmes). Run npm run data:build.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
