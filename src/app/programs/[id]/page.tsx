import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Info, TriangleAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProvenanceBadge, ScholarshipBadge, StatusBadge, TypeBadge, Val } from "@/components/program-badges";
import { ProgramActions } from "@/components/program-actions";
import { countryName } from "@/lib/countries";
import { getProgram, PROGRAMS } from "@/lib/data";
import { deadlineStatus, primaryDeadline } from "@/lib/deadlines";
import { documentsFor } from "@/lib/documents";
import { PROGRAM_TYPE_LABEL, type EnrichableSection, type Program } from "@/lib/types";

export function generateStaticParams() {
  return PROGRAMS.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const p = getProgram((await params).id);
  return { title: p ? `${p.acronym} · Mobility Explorer` : "Not found" };
}

const SECTION_LABEL: Record<EnrichableSection, string> = {
  funding_detail: "Funding detail",
  deadlines: "Deadlines",
  institutions: "Institutions & structure",
  mobility: "Mobility tracks",
  eligibility: "Eligibility",
  documents: "Documents & language",
  pathways: "Alternative pathways",
};

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(8rem,14rem)_1fr] gap-3 border-b py-2 text-sm last:border-0">
      <dt className="text-muted-foreground">{k}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Section({ p, s, title, children }: { p: Program; s: EnrichableSection; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <ProvenanceBadge source={p.data_quality.sections[s]} />
      </CardHeader>
      <CardContent>
        <dl>{children}</dl>
      </CardContent>
    </Card>
  );
}

export default async function ProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const p = getProgram((await params).id);
  if (!p) notFound();
  const e = p.eligibility_criteria;
  const lp = p.document_checklist.language_proficiency;
  const hasSample = Object.values(p.data_quality.sections).includes("sample");
  const docs = documentsFor(p);

  return (
    <div className="space-y-5">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All programmes
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <TypeBadge type={p.program_type} />
            <ScholarshipBadge p={p} />
            <StatusBadge status={deadlineStatus(p)} />
            {p.new_for_2027 && <span className="text-xs font-medium text-violet-700 dark:text-violet-300">New for 2027</span>}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{p.acronym}</h1>
          <p className="max-w-3xl text-muted-foreground">{p.name}</p>
          <p className="text-xs text-muted-foreground">
            {PROGRAM_TYPE_LABEL[p.program_type]} · {p.discipline_cluster}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {p.website_url && (
            <a href={p.website_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              Official website <ExternalLink className="size-4" />
            </a>
          )}
          <ProgramActions id={p.id} />
        </div>
      </div>

      {hasSample ? (
        <div className="flex gap-2 rounded-lg border border-dashed border-amber-400 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <p>
            This is a demo programme. Sections badged <strong>Sample data</strong> hold illustrative values so the comparison and eligibility tools can be tried. They are
            not verified. The title, tier, field, funding status, deadline and website come from the catalogue export.
          </p>
        </div>
      ) : (
        <div className="flex gap-2 rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" />
          <p>Only catalogue metadata is available for this programme so far. Detailed requirements show as “Unknown” until they are collected from the official site.</p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Section p={p} s="deadlines" title="Deadlines">
          <Row k="Next deadline">
            <Val v={primaryDeadline(p)} />
          </Row>
          <Row k="Scholarship deadline">
            <Val v={p.deadlines.scholarship_deadline} />
          </Row>
          <Row k="Self-funded deadline">
            <Val v={p.deadlines.self_funded_deadline} />
          </Row>
          <Row k="Applications open">
            <Val v={p.deadlines.applications_open_date} />
          </Row>
        </Section>

        <Section p={p} s="funding_detail" title="Funding">
          <Row k="Catalogue status">{p.funding.scholarship_label}</Row>
          <Row k="Monthly stipend">
            <Val v={p.funding.emjm_monthly_stipend_eur ? `€${p.funding.emjm_monthly_stipend_eur.toLocaleString("en")}` : null} />
          </Row>
          <Row k="Tuition waiver">
            <Val v={p.funding.tuition_waiver} />
          </Row>
          <Row k="Consortium scholarships">
            <Val v={p.funding.consortium_scholarships} />
          </Row>
          <Row k="Application fee">
            <Val v={p.funding.application_fee_eur == null ? null : p.funding.application_fee_eur === 0 ? "Free" : `€${p.funding.application_fee_eur}`} />
          </Row>
        </Section>

        <Section p={p} s="institutions" title="Consortium">
          <Row k="Coordinator">
            <Val v={p.coordinating_institution ? `${p.coordinating_institution.name} (${countryName(p.coordinating_institution.country)})` : null} />
          </Row>
          <Row k="Partners">
            {p.partner_institutions ? (
              <ul>
                {p.partner_institutions.map((x) => (
                  <li key={x.name}>
                    {x.name} ({countryName(x.country)}) {x.role && <span className="text-muted-foreground">· {x.role}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <Val v={null} />
            )}
          </Row>
          <Row k="Degree">
            <Val v={p.degree_awarded} />
          </Row>
          <Row k="Duration / ECTS">
            <Val v={p.duration_months ? `${p.duration_months} months${p.ects_credits ? ` · ${p.ects_credits} ECTS` : ""}` : null} />
          </Row>
        </Section>

        <Section p={p} s="mobility" title="Mobility tracks">
          {p.mobility_tracks ? (
            p.mobility_tracks.map((m) => (
              <Row key={m.period} k={m.period}>
                {m.countries.map(countryName).join(" / ")} {m.note && <span className="text-muted-foreground">({m.note})</span>}
              </Row>
            ))
          ) : (
            <Row k="Path">
              <Val v={null} />
            </Row>
          )}
        </Section>

        <Section p={p} s="eligibility" title="Eligibility">
          <Row k="Minimum degree">
            <Val v={e.min_degree_level} />
          </Row>
          <Row k="Entry disciplines">
            <Val v={e.allowed_disciplines?.join(", ")} />
          </Row>
          <Row k="Adjacent disciplines">
            <Val v={e.adjacent_disciplines?.join(", ")} />
          </Row>
          <Row k="Final-year students">
            <Val v={e.final_year_students_allowed} />
          </Row>
          <Row k="Work experience">
            <Val v={e.work_experience_requirement} />
          </Row>
          <Row k="Nationality rules">
            <Val v={e.nationality_considerations ?? (p.program_type === "EMJM" ? "EMJM rule: max 10% of EU scholarships per nationality per intake" : null)} />
          </Row>
        </Section>

        <Section p={p} s="documents" title="Language">
          <Row k="Accepted tests">
            <Val v={lp?.accepted_tests?.join(", ")} />
          </Row>
          <Row k="IELTS / TOEFL minimum">
            <Val v={lp?.minimum_scores ? `${lp.minimum_scores.ielts ?? "?"} / ${lp.minimum_scores.toefl ?? "?"}` : null} />
          </Row>
          <Row k="MOI waiver">
            <Val v={lp?.moi_waiver_accepted} />
          </Row>
          <Row k="Waiver conditions">
            <Val v={lp?.waiver_conditions?.join("; ")} />
          </Row>
        </Section>

        <Section p={p} s="documents" title="Documents">
          {docs.map((d) => (
            <Row key={d.key} k={d.label}>
              {d.note ?? (d.fromProgramData ? "Required" : <span className="italic text-muted-foreground">Generic checklist item: confirm on site</span>)}
            </Row>
          ))}
        </Section>

        <Section p={p} s="pathways" title="Alternative pathways">
          <Row k="Non-direct degree">
            <Val v={p.alternative_pathways.non_direct_degree_admission} />
          </Row>
          <Row k="Language waiver feasibility">
            <Val v={p.alternative_pathways.language_waiver_feasibility} />
          </Row>
          <Row k="Self-funded fee tier">
            <Val v={p.alternative_pathways.self_funded_fee_tier_eur ? `€${p.alternative_pathways.self_funded_fee_tier_eur.toLocaleString("en")}/yr` : null} />
          </Row>
        </Section>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data provenance</CardTitle>
          <CardDescription>Where each part of this page comes from. Imported {p.data_quality.last_imported}.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(SECTION_LABEL) as EnrichableSection[]).map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs">
                {SECTION_LABEL[s]} <ProvenanceBadge source={p.data_quality.sections[s]} />
              </span>
            ))}
          </div>
          {p.data_quality.notes.length > 0 && (
            <ul className="list-disc pl-5 text-sm text-muted-foreground">
              {p.data_quality.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
