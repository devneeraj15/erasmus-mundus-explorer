/**
 * Turns a hand-check log (data/verification/deadline-checks-<date>.tsv) into an
 * enrichment file with provenance "hand_checked".
 *
 *   npx tsx scripts/verify/build-deadline-enrichment.ts data/verification/deadline-checks-2026-11-27.tsv
 *
 * TSV columns: ACRONYM, STATUS, DATE, INTAKE, SOURCE_URL, QUOTE, STATS ("-" = none).
 * A row with STATUS "STATS" only adds intake numbers from another page.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { parse } from "csv-parse/sync";
import { slugify, type CsvRow } from "../../src/lib/build-data";
import { buildDeadlineEnrichment } from "../../src/lib/deadline-checks";

const root = resolve(__dirname, "../..");
const tsvPath = resolve(process.argv[2] ?? join(root, "data/verification/deadline-checks-2026-11-27.tsv"));
const checkedOn = basename(tsvPath).match(/(\d{4}-\d{2}-\d{2})/)?.[1];
if (!checkedOn) throw new Error("TSV file name must contain the check date (YYYY-MM-DD)");

const seedDir = join(root, "data/seed");
const seed = join(seedDir, "erasmus-mundus-programmes-2026-11-24.csv");
const csv = parse(readFileSync(seed, "utf8"), { columns: true, bom: true, skip_empty_lines: true, trim: true }) as CsvRow[];
const catalogue = new Map(csv.map((r) => [slugify(r.Acronym), r]));

const lines = readFileSync(tsvPath, "utf8").split("\n").filter((l) => l.trim());
const entries = buildDeadlineEnrichment(lines, catalogue, checkedOn);

const out = join(root, `data/enrichment/verified-deadlines-${checkedOn}.json`);
writeFileSync(
  out,
  JSON.stringify(
    {
      $comment: `Hand-checked ${checkedOn} against each programme's official site (built-in browser, no bot checks bypassed). Generated from ${tsvPath.slice(root.length + 1)} by scripts/verify/build-deadline-enrichment.ts. Do not edit by hand: edit the TSV and regenerate.`,
      entries,
    },
    null,
    2,
  ) + "\n",
);
console.log(`Wrote ${entries.length} entries to ${out.slice(root.length + 1)}`);
