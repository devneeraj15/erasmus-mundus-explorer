/**
 * Builds data/programs.json from the seed CSV + enrichment files.
 *
 *   npm run data:build
 *   npm run data:build -- --csv path/to/newer-export.csv
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parse } from "csv-parse/sync";
import { buildPrograms, type CsvRow } from "../src/lib/build-data";
import type { Enrichment } from "../src/lib/types";

const root = resolve(__dirname, "..");
const args = process.argv.slice(2);
const csvArg = args.indexOf("--csv");

function latestSeed(): string {
  const dir = join(root, "data/seed");
  const files = readdirSync(dir).filter((f) => f.endsWith(".csv")).sort();
  if (!files.length) throw new Error("No CSV in data/seed");
  return join(dir, files[files.length - 1]);
}

const csvPath = csvArg >= 0 ? resolve(args[csvArg + 1]) : latestSeed();
const importedOn = csvPath.match(/(\d{4}-\d{2}-\d{2})/)?.[1] ?? new Date().toISOString().slice(0, 10);

const rows = parse(readFileSync(csvPath, "utf8"), {
  columns: true,
  bom: true,
  skip_empty_lines: true,
  trim: true,
}) as CsvRow[];

const enrichDir = join(root, "data/enrichment");
const enrichments: Enrichment[] = readdirSync(enrichDir)
  .filter((f) => f.endsWith(".json"))
  .sort()
  .flatMap((f) => (JSON.parse(readFileSync(join(enrichDir, f), "utf8")).entries ?? []) as Enrichment[]);

const programs = buildPrograms(rows, enrichments, importedOn);
writeFileSync(
  join(root, "data/programs.json"),
  JSON.stringify({ generated_from: csvPath.replace(root + "/", ""), imported_on: importedOn, programs }, null, 2) + "\n",
);
console.log(
  `Wrote ${programs.length} programmes (${enrichments.length} enrichment entries) from ${csvPath.replace(root + "/", "")}`,
);
