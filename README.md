# Erasmus Mundus & European Mobility Explorer

A fast, local-first web app for exploring, comparing and checking eligibility for Erasmus Mundus Joint Masters (EMJM), MSCA Doctoral Networks, EIT Master School programmes, Erasmus Mundus Design Measures (EMDM) and Erasmus+ traineeships.

Built with Next.js 15 (App Router, React 19), TypeScript, Tailwind CSS v4, shadcn/ui-style components, TanStack Table and Lucide icons. All pages are statically generated; personal data (profile, tracker) stays in the browser's `localStorage`.

## What's in it

| Page | What it does |
| --- | --- |
| **Explore** (`/`) | All 199 catalogue programmes in a sortable, searchable table with tier filter cards (EMJM, MSCA, EIT, EMDM, Short-term), field, funding, deadline status, "new for 2027" and "hand-checked only" filters. Pin 2 to 5 programmes to compare. |
| **Compare** (`/compare`) | Side-by-side matrix: mobility tracks, IELTS/TOEFL thresholds vs MOI waivers, motivation letter length and prompts, reference letters and submission method, application fee, eligibility. Shareable via `?ids=a,b,c`. |
| **Deadlines** (`/deadlines`) | Known deadlines in date order with a live countdown. |
| **Eligibility** (`/eligibility`) | Four-step wizard (qualification, background, English, experience). Each programme gets **green** (direct match), **amber** (alternative route: adjacent degree, MOI waiver, ECTS-deficit route), **red**, or **can't tell yet** when the rule isn't recorded. Includes the EMJM 10%-per-nationality advisory and the prior-scholarship rule. |
| **Tracker** (`/tracker`) | Per-programme document checklist with status, notes, progress bar, JSON export, and statement-of-purpose prompts tailored from each programme's pillars, mobility countries and stated prompts. |
| **Programme page** (`/programs/[id]`) | Every field of the unified schema, with a provenance badge per section. |

## Data honesty

The seed is `data/seed/erasmus-mundus-programmes-2026-11-24.csv` (199 rows). It only has acronym, title, type, field, "new for 2027", next deadline, scholarship status, whether the row was hand-checked, and website.

- Anything the CSV doesn't carry is `null` in the schema and shows as **Unknown**. The eligibility engine treats unknown rules as unknown, never as a pass.
- The 11 hand-checked programmes have **sample** enrichment in `data/enrichment/sample-demo-programs.json` so the comparison matrix and eligibility engine can be demonstrated. These values are illustrative, are **not verified**, and are badged **Sample data** everywhere they appear. Partner institutions are generic placeholders ("Sample partner A").
- Each section of a programme records its provenance (`catalogue`, `hand_checked`, `sample`, `crawler`, `unknown`) in `data_quality.sections`.

To replace sample data with real data, check the official site and put the values in a new enrichment file with `"provenance": "hand_checked"`.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # unit tests (import, eligibility engine, deadlines, crawler parsers)
npm run build      # rebuilds data/programs.json, then the static site
```

## Data pipeline

```
data/seed/*.csv ──┐
                  ├─► npm run data:build ─► data/programs.json ─► app
data/enrichment/*.json ┘
```

- `npm run data:build` reads the newest CSV in `data/seed/` (or `-- --csv path`) and applies every enrichment file. Enrichment can never overwrite a programme's id or provenance.
- `npm run crawl` refreshes data:
  - fetches the EACEA catalogue page and reports programmes that are new or missing compared with the seed;
  - visits each programme website (respecting `robots.txt`, 4 concurrent requests, 1.5 s per-host delay), records broken links, and extracts candidate deadlines (classified as scholarship / self-funded / unspecified) and IELTS/TOEFL minimums;
  - writes a review queue to `data/crawl/report-<date>.json`.
  - With `-- --write-enrichment` it also writes `data/enrichment/crawler-<date>.json` for unambiguous findings on non-hand-checked programmes. These show as **Crawled, unreviewed** in the UI.
  - Options: `--only deai,cde`, `--skip-sites`, `--catalogue-html saved-page.html`.
- `.github/workflows/refresh.yml` runs the crawler weekly and uploads the report as a workflow artifact.

The catalogue parser has only been tested against fixtures: the EACEA site was not reachable from the build environment. If the live layout differs, the crawler says so ("Parsed fewer than 20 entries") rather than silently producing an empty diff; adjust `parseCatalogue()` in `src/lib/crawl-extract.ts`.

## Unified schema

`src/lib/types.ts` defines the `Program` type, following the spec: identity, consortium, mobility tracks, funding, deadlines (scholarship vs self-funded vs open date), eligibility criteria, document checklist (transcripts, degree, CV, motivation letter prompts, references, language tests and waivers), alternative pathways, and `data_quality` provenance.

## Not built yet

- Supabase/pgvector semantic matching. The engine is deterministic and rule-based; a database is not needed at the current size (the whole dataset is ~550 KB of JSON).
- Real requirement data beyond the CSV. This needs hand-checking or a reviewed crawler run.
- Applicant-volume or admission-rate data. The 10% nationality advisory therefore suggests related programmes in the same field instead of claiming better odds.

Not an official EU service. Always confirm requirements and deadlines on each programme's official website.
