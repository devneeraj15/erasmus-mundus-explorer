"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Check as CheckIcon, CircleHelp, Compass, TriangleAlert, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, NativeSelect } from "@/components/ui/input";
import { ProvenanceBadge, TypeBadge } from "@/components/program-badges";
import { useLocalStore } from "@/hooks/use-local-store";
import { COUNTRY_OPTIONS } from "@/lib/countries";
import { DEMO_IDS, PROGRAM_BY_ID, PROGRAMS } from "@/lib/data";
import { DEFAULT_PROFILE, evaluate, MAJORS, type CheckStatus, type Evaluation, type Profile, type Verdict } from "@/lib/eligibility";
import type { ProgramType } from "@/lib/types";
import { cn } from "@/lib/utils";

const VERDICT: Record<Verdict, { label: string; variant: "green" | "amber" | "red" | "muted"; blurb: string }> = {
  green: { label: "Direct match", variant: "green", blurb: "Meets every recorded prerequisite." },
  amber: { label: "Alternative route possible", variant: "amber", blurb: "Eligible through a waiver, adjacent degree or other route." },
  red: { label: "Not eligible as recorded", variant: "red", blurb: "At least one recorded rule is not met." },
  unverified: { label: "Can't tell yet", variant: "muted", blurb: "Key requirements are not recorded for this programme." },
};

const STATUS_ICON: Record<CheckStatus, React.ReactNode> = {
  pass: <CheckIcon className="size-4 text-emerald-600" />,
  alt: <Compass className="size-4 text-amber-600" />,
  fail: <X className="size-4 text-red-600" />,
  unknown: <CircleHelp className="size-4 text-muted-foreground" />,
};

const STEPS = ["Qualification", "Background", "English", "Experience"] as const;

export function EligibilityWizard() {
  const [profile, setProfile] = useLocalStore<Profile>("em:profile:v1", DEFAULT_PROFILE);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [scope, setScope] = useState<"demo" | "all">("demo");
  const [tier, setTier] = useState<"" | ProgramType>("");
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setProfile((p) => ({ ...p, [k]: v }));

  const results = useMemo(() => {
    if (!done) return [];
    const pool = (scope === "demo" ? DEMO_IDS.map((id) => PROGRAM_BY_ID.get(id)!) : PROGRAMS).filter((p) => !tier || p.program_type === tier);
    const order: Record<Verdict, number> = { green: 0, amber: 1, unverified: 2, red: 3 };
    return pool.map((p) => evaluate(p, profile, PROGRAMS)).sort((a, b) => order[a.verdict] - order[b.verdict]);
  }, [done, scope, tier, profile]);

  const counts = results.reduce<Record<string, number>>((c, r) => ((c[r.verdict] = (c[r.verdict] ?? 0) + 1), c), {});

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <Card className="h-fit lg:sticky lg:top-20">
        <CardHeader>
          <CardTitle>Your profile</CardTitle>
          <CardDescription>Stored only in this browser.</CardDescription>
          <div className="flex gap-1 pt-2">
            {STEPS.map((s, i) => (
              <button
                key={s}
                onClick={() => setStep(i)}
                className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-muted")}
                aria-label={`Step ${i + 1}: ${s}`}
              />
            ))}
          </div>
          <div className="text-xs text-muted-foreground">
            Step {step + 1} of {STEPS.length}: {STEPS[step]}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <>
              <Field label="Current qualification">
                <NativeSelect value={profile.degreeLevel} onChange={(e) => set("degreeLevel", e.target.value as Profile["degreeLevel"])}>
                  <option value="bachelor_final_year">Bachelor, final year</option>
                  <option value="bachelor">Bachelor, completed</option>
                  <option value="master">Master&apos;s completed</option>
                  <option value="phd">PhD</option>
                  <option value="other">Other / non-standard qualification</option>
                </NativeSelect>
              </Field>
              <Field label="Degree credits (ECTS equivalent)">
                <NativeSelect value={profile.degreeEcts ?? ""} onChange={(e) => set("degreeEcts", e.target.value ? Number(e.target.value) : null)}>
                  <option value="">Don&apos;t know</option>
                  <option value="180">180 (3-year degree)</option>
                  <option value="210">210 (3.5-year degree)</option>
                  <option value="240">240 (4-year degree)</option>
                  <option value="300">300+ (5-year / integrated)</option>
                </NativeSelect>
              </Field>
              <Field label="Country of graduation">
                <CountrySelect value={profile.graduationCountry} onChange={(v) => set("graduationCountry", v)} />
              </Field>
              <Field label="Nationality">
                <CountrySelect value={profile.nationality} onChange={(v) => set("nationality", v)} />
              </Field>
            </>
          )}
          {step === 1 && (
            <>
              <Field label="Academic major">
                <NativeSelect value={profile.major} onChange={(e) => set("major", e.target.value)}>
                  {Object.keys(MAJORS)
                    .sort()
                    .map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                </NativeSelect>
              </Field>
              <Field label="Grade band" hint="Not used to rule you out: few programmes publish a GPA cut-off.">
                <NativeSelect value={profile.gradeBand} onChange={(e) => set("gradeBand", e.target.value as Profile["gradeBand"])}>
                  <option value="unknown">Prefer not to say</option>
                  <option value="top">Top 10% / First class / ≥ 3.7 GPA</option>
                  <option value="upper">Upper / 2:1 / 3.3–3.7</option>
                  <option value="middle">Middle / 2:2 / 2.8–3.3</option>
                  <option value="lower">Below 2.8</option>
                </NativeSelect>
              </Field>
            </>
          )}
          {step === 2 && (
            <>
              <Field label="English status">
                <NativeSelect value={profile.english} onChange={(e) => set("english", e.target.value as Profile["english"])}>
                  <option value="ielts">Have IELTS</option>
                  <option value="toefl">Have TOEFL iBT</option>
                  <option value="moi">No test, but my degree was taught in English</option>
                  <option value="native">Native speaker</option>
                  <option value="none">No test yet</option>
                </NativeSelect>
              </Field>
              {(profile.english === "ielts" || profile.english === "toefl") && (
                <Field label={profile.english === "ielts" ? "IELTS overall" : "TOEFL iBT total"}>
                  <Input
                    type="number"
                    step={profile.english === "ielts" ? 0.5 : 1}
                    min={0}
                    max={profile.english === "ielts" ? 9 : 120}
                    value={profile.englishScore ?? ""}
                    onChange={(e) => set("englishScore", e.target.value ? Number(e.target.value) : null)}
                  />
                </Field>
              )}
            </>
          )}
          {step === 3 && (
            <>
              <Field label="Years of relevant work or research experience">
                <Input type="number" min={0} max={40} value={profile.workYears} onChange={(e) => set("workYears", Number(e.target.value) || 0)} />
              </Field>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-0.5" checked={profile.priorEmjmScholarship} onChange={(e) => set("priorEmjmScholarship", e.target.checked)} />
                I have already received an Erasmus Mundus Joint Master scholarship
              </label>
            </>
          )}
          <div className="flex justify-between gap-2 pt-2">
            <Button variant="ghost" size="sm" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button size="sm" onClick={() => setStep((s) => s + 1)}>
                Next
              </Button>
            ) : (
              <Button size="sm" onClick={() => setDone(true)}>
                Evaluate
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Eligibility & alternative pathways</h1>
          <p className="text-sm text-muted-foreground">
            Green is a direct match, amber means a route exists through a waiver or adjacent degree. When a programme&apos;s rule isn&apos;t recorded the check says so,
            rather than guessing.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <NativeSelect value={scope} onChange={(e) => setScope(e.target.value as "demo" | "all")} className="w-auto max-w-full">
            <option value="demo">Demo programmes ({DEMO_IDS.length}, with sample requirements)</option>
            <option value="all">All {PROGRAMS.length} programmes</option>
          </NativeSelect>
          <NativeSelect value={tier} onChange={(e) => setTier(e.target.value as ProgramType | "")} className="w-auto">
            <option value="">All tiers</option>
            <option value="EMJM">EMJM</option>
            <option value="EIT">EIT</option>
            <option value="MSCA">MSCA</option>
            <option value="EMDM">EMDM</option>
            <option value="SHORT_TERM">Short-term</option>
          </NativeSelect>
          {done && (
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(VERDICT) as Verdict[]).map((v) =>
                counts[v] ? (
                  <Badge key={v} variant={VERDICT[v].variant}>
                    {counts[v]} {VERDICT[v].label.toLowerCase()}
                  </Badge>
                ) : null,
              )}
            </div>
          )}
        </div>
        {!done ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">Fill in the four steps and press Evaluate.</CardContent>
          </Card>
        ) : (
          results.map((r) => <ResultCard key={r.programId} r={r} />)
        )}
      </div>
    </div>
  );
}

function ResultCard({ r }: { r: Evaluation }) {
  const p = PROGRAM_BY_ID.get(r.programId)!;
  const v = VERDICT[r.verdict];
  return (
    <Card className={cn(r.verdict === "green" && "border-emerald-300", r.verdict === "amber" && "border-amber-300")}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Link href={`/programs/${p.id}`} className="font-semibold hover:underline">
              {p.acronym}
            </Link>
            <TypeBadge type={p.program_type} />
          </div>
          <Badge variant={v.variant} title={v.blurb}>
            {v.label}
          </Badge>
        </div>
        <CardDescription className="line-clamp-1">{p.name}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-1.5">
          {r.checks.map((c) => (
            <li key={c.key} className="flex items-start gap-2 text-sm">
              <span className="mt-0.5">{STATUS_ICON[c.status]}</span>
              <span className="flex-1">
                <span className="font-medium">{c.label}:</span> {c.detail}
              </span>
              {c.source !== "unknown" && <ProvenanceBadge source={c.source} />}
            </li>
          ))}
        </ul>
        {r.advisories.length > 0 && (
          <div className="space-y-2 rounded-lg bg-muted/60 p-3 text-sm">
            <div className="flex items-center gap-1.5 font-medium">
              <TriangleAlert className="size-4" /> Strategic advisory
            </div>
            {r.advisories.map((a, i) => (
              <div key={i}>
                <p className="text-muted-foreground">{a.text}</p>
                {a.relatedIds && a.relatedIds.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <span className="text-xs text-muted-foreground">Related:</span>
                    {a.relatedIds.map((id) => (
                      <Link key={id} href={`/programs/${id}`} className="text-xs font-medium text-primary hover:underline">
                        {PROGRAM_BY_ID.get(id)?.acronym}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function CountrySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <NativeSelect value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select…</option>
      {COUNTRY_OPTIONS.map((c) => (
        <option key={c.code} value={c.code}>
          {c.name}
        </option>
      ))}
    </NativeSelect>
  );
}
