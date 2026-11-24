"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProvenanceBadge, ScholarshipBadge, StatusBadge, TypeBadge, Val } from "@/components/program-badges";
import { useCompare } from "@/hooks/use-compare";
import { MAX_COMPARE } from "@/hooks/use-local-store";
import { countryName } from "@/lib/countries";
import { DEMO_IDS, PROGRAM_BY_ID } from "@/lib/data";
import { deadlineStatus, primaryDeadline } from "@/lib/deadlines";
import type { EnrichableSection, Program } from "@/lib/types";

type Cell = (p: Program) => React.ReactNode;
interface MatrixRow {
  label: string;
  section: EnrichableSection | null; // null = catalogue field
  cell: Cell;
}

const list = (xs: string[] | null | undefined) =>
  xs == null ? <Val v={null} /> : xs.length ? <ul className="list-disc space-y-0.5 pl-4">{xs.map((x) => <li key={x}>{x}</li>)}</ul> : <span>None</span>;

const GROUPS: { title: string; rows: MatrixRow[] }[] = [
  {
    title: "Overview",
    rows: [
      { label: "Tier", section: null, cell: (p) => <TypeBadge type={p.program_type} /> },
      { label: "Field", section: null, cell: (p) => p.discipline_cluster },
      { label: "Degree awarded", section: "institutions", cell: (p) => <Val v={p.degree_awarded} /> },
      { label: "Duration", section: "institutions", cell: (p) => <Val v={p.duration_months} suffix=" months" /> },
      { label: "ECTS", section: "institutions", cell: (p) => <Val v={p.ects_credits} /> },
      { label: "Coordinator", section: "institutions", cell: (p) => (p.coordinating_institution ? `${p.coordinating_institution.name} (${countryName(p.coordinating_institution.country)})` : <Val v={null} />) },
    ],
  },
  {
    title: "Funding & deadlines",
    rows: [
      { label: "Scholarship", section: null, cell: (p) => <ScholarshipBadge p={p} /> },
      { label: "Monthly stipend", section: null, cell: (p) => <Val v={p.funding.emjm_monthly_stipend_eur ? `€${p.funding.emjm_monthly_stipend_eur.toLocaleString("en")}` : null} /> },
      { label: "Tuition waiver (scholars)", section: "funding_detail", cell: (p) => <Val v={p.funding.tuition_waiver} /> },
      { label: "Consortium scholarships", section: "funding_detail", cell: (p) => <Val v={p.funding.consortium_scholarships} /> },
      { label: "Self-funded fee tier", section: "pathways", cell: (p) => <Val v={p.alternative_pathways.self_funded_fee_tier_eur ? `€${p.alternative_pathways.self_funded_fee_tier_eur.toLocaleString("en")}/yr` : null} /> },
      { label: "Application fee", section: "funding_detail", cell: (p) => <Val v={p.funding.application_fee_eur == null ? null : p.funding.application_fee_eur === 0 ? "Free" : `€${p.funding.application_fee_eur}`} /> },
      {
        label: "Next deadline",
        section: "deadlines",
        cell: (p) => (
          <div className="flex flex-col items-start gap-1">
            <Val v={primaryDeadline(p)} />
            <StatusBadge status={deadlineStatus(p)} />
          </div>
        ),
      },
    ],
  },
  {
    title: "Mobility tracks",
    rows: [
      {
        label: "Path",
        section: "mobility",
        cell: (p) =>
          p.mobility_tracks ? (
            <ol className="space-y-1">
              {p.mobility_tracks.map((m) => (
                <li key={m.period}>
                  <span className="font-medium">{m.period}:</span> {m.countries.map(countryName).join(" / ")}
                  {m.note && <span className="text-muted-foreground"> ({m.note})</span>}
                </li>
              ))}
            </ol>
          ) : (
            <Val v={null} />
          ),
      },
    ],
  },
  {
    title: "Language requirements",
    rows: [
      { label: "Accepted tests", section: "documents", cell: (p) => list(p.document_checklist.language_proficiency?.accepted_tests) },
      { label: "IELTS minimum", section: "documents", cell: (p) => <Val v={p.document_checklist.language_proficiency?.minimum_scores?.ielts} /> },
      { label: "TOEFL iBT minimum", section: "documents", cell: (p) => <Val v={p.document_checklist.language_proficiency?.minimum_scores?.toefl} /> },
      { label: "MOI waiver accepted", section: "documents", cell: (p) => <Val v={p.document_checklist.language_proficiency?.moi_waiver_accepted} /> },
      { label: "Waiver conditions", section: "documents", cell: (p) => list(p.document_checklist.language_proficiency?.waiver_conditions) },
      { label: "Waiver feasibility", section: "pathways", cell: (p) => <Val v={p.alternative_pathways.language_waiver_feasibility} /> },
    ],
  },
  {
    title: "Motivation letter",
    rows: [
      { label: "Length", section: "documents", cell: (p) => <Val v={p.document_checklist.motivation_letter?.max_words_or_pages} /> },
      { label: "Required prompts", section: "documents", cell: (p) => list(p.document_checklist.motivation_letter?.specific_prompts) },
    ],
  },
  {
    title: "References & documents",
    rows: [
      { label: "Reference letters", section: "documents", cell: (p) => <Val v={p.document_checklist.recommendation_letters?.count} /> },
      { label: "Submission method", section: "documents", cell: (p) => <Val v={p.document_checklist.recommendation_letters?.method} /> },
      { label: "Referee type", section: "documents", cell: (p) => <Val v={p.document_checklist.recommendation_letters?.type} /> },
      { label: "Certified transcript translation", section: "documents", cell: (p) => <Val v={p.document_checklist.academic_transcripts?.certified_translation} /> },
      { label: "Provisional degree accepted", section: "documents", cell: (p) => <Val v={p.document_checklist.degree_certificate?.conditional_provisional_allowed} /> },
      { label: "CV format", section: "documents", cell: (p) => <Val v={p.document_checklist.cv_format} /> },
      { label: "Additional documents", section: "documents", cell: (p) => list(p.document_checklist.additional_documents) },
    ],
  },
  {
    title: "Eligibility",
    rows: [
      { label: "Minimum degree", section: "eligibility", cell: (p) => <Val v={p.eligibility_criteria.min_degree_level} /> },
      { label: "Entry disciplines", section: "eligibility", cell: (p) => list(p.eligibility_criteria.allowed_disciplines) },
      { label: "Adjacent (with evidence)", section: "eligibility", cell: (p) => list(p.eligibility_criteria.adjacent_disciplines) },
      { label: "Final-year students", section: "eligibility", cell: (p) => <Val v={p.eligibility_criteria.final_year_students_allowed} /> },
      { label: "Work experience", section: "eligibility", cell: (p) => <Val v={p.eligibility_criteria.work_experience_requirement} /> },
      { label: "Prior EMJM scholars eligible", section: "eligibility", cell: (p) => <Val v={p.eligibility_criteria.prior_erasmus_scholarship_allowed} /> },
      { label: "Non-direct degree route", section: "pathways", cell: (p) => <Val v={p.alternative_pathways.non_direct_degree_admission} /> },
    ],
  },
];

export function CompareMatrix() {
  const params = useSearchParams();
  const { ids, setIds, toggle } = useCompare();

  // A shared link (?ids=a,b) replaces the local pin list once.
  const fromUrl = params.get("ids");
  useEffect(() => {
    if (!fromUrl) return;
    const wanted = fromUrl.split(",").filter((id) => PROGRAM_BY_ID.has(id)).slice(0, MAX_COMPARE);
    if (wanted.length) setIds(wanted);
  }, [fromUrl, setIds]);

  const programs = ids.map((id) => PROGRAM_BY_ID.get(id)).filter((p): p is Program => !!p);
  const anySample = programs.some((p) => Object.values(p.data_quality.sections).includes("sample"));

  if (programs.length < 2) {
    return (
      <div className="mx-auto max-w-xl space-y-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Compare programmes</h1>
        <p className="text-muted-foreground">
          Pin 2 to 5 programmes from the explorer with the pin icon. {programs.length === 1 && `You have pinned ${programs[0].acronym}.`}
        </p>
        <div className="flex justify-center gap-2">
          <Button asChild variant="outline">
            <Link href="/">Go to explorer</Link>
          </Button>
          <Button onClick={() => setIds(["deai", "eit-digital-ds", "jemaro", "cde"].filter((id) => DEMO_IDS.includes(id)))}>Load a demo comparison</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Comparison matrix</h1>
          <p className="text-sm text-muted-foreground">Each row shows where its values come from. “Unknown” means the data has not been collected yet.</p>
        </div>
      </div>
      {anySample && (
        <div className="flex gap-2 rounded-lg border border-dashed border-amber-400 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <p>
            Cells badged <strong>Sample data</strong> are illustrative demo values, not verified requirements. Partner names like “Sample partner A” are placeholders. Check
            each programme&apos;s official site before deciding.
          </p>
        </div>
      )}
      <div className="relative overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[720px] table-fixed text-sm">
          <colgroup>
            <col className="w-48" />
            {programs.map((p) => (
              <col key={p.id} />
            ))}
          </colgroup>
          <thead className="sticky top-0 bg-card">
            <tr className="border-b">
              <th className="p-3 text-left align-bottom text-xs font-medium uppercase text-muted-foreground">Programme</th>
              {programs.map((p) => (
                <th key={p.id} className="p-3 text-left align-top">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/programs/${p.id}`} className="font-semibold hover:underline">
                      {p.acronym}
                    </Link>
                    <button onClick={() => toggle(p.id)} aria-label={`Remove ${p.acronym}`} className="text-muted-foreground hover:text-foreground">
                      <X className="size-4" />
                    </button>
                  </div>
                  <div className="line-clamp-2 text-xs font-normal text-muted-foreground">{p.name}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GROUPS.map((g) => (
              <MatrixGroup key={g.title} title={g.title} rows={g.rows} programs={programs} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MatrixGroup({ title, rows, programs }: { title: string; rows: MatrixRow[]; programs: Program[] }) {
  return (
    <>
      <tr className="bg-muted/60">
        <td colSpan={programs.length + 1} className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </td>
      </tr>
      {rows.map((r) => (
        <tr key={r.label} className="border-b last:border-0">
          <th scope="row" className="p-3 text-left align-top font-medium">
            {r.label}
          </th>
          {programs.map((p) => {
            const src = r.section ? p.data_quality.sections[r.section] : "catalogue";
            return (
              <td key={p.id} className="p-3 align-top">
                <div className="space-y-1.5">
                  <div>{r.cell(p)}</div>
                  {src === "sample" && <ProvenanceBadge source="sample" />}
                </div>
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
