"use client";
import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { ExternalLink, FileText, Loader2, ShieldCheck, Sparkles, Upload, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Textarea } from "@/components/ui/input";
import { ScholarshipBadge, StatusBadge, TypeBadge } from "@/components/program-badges";
import { PROGRAMS } from "@/lib/data";
import { deadlineStatus, primaryDeadline } from "@/lib/deadlines";
import { ACCEPT, CvReadError, extractCvText } from "@/lib/cv-extract";
import { matchCv } from "@/lib/cv-match";
import { EMPTY_FIT, FIT_STORE_KEY, type FitStore } from "@/lib/chances";
import { todayIso } from "@/lib/deadlines";
import { useLocalStore } from "@/hooks/use-local-store";
import type { Program } from "@/lib/types";
import { cn } from "@/lib/utils";

const MIN_WORDS = 15;

export function CvMatcher() {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [emjmOnly, setEmjmOnly] = useState(true);
  const [fundedOnly, setFundedOnly] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = useCallback(async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setReading(true);
    setFileName(file.name);
    try {
      const t = await extractCvText(file);
      setText(t);
      setSubmitted(t);
    } catch (e) {
      setError(e instanceof CvReadError ? e.message : "Couldn't read that file. Try another format, or paste the text below.");
      setFileName(null);
    } finally {
      setReading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }, []);

  const filter = useCallback(
    (p: Program) =>
      (!emjmOnly || p.program_type === "EMJM") &&
      (!fundedOnly || p.funding.scholarship_status === "EU_SCHOLARSHIP" || p.funding.scholarship_status === "YES"),
    [emjmOnly, fundedOnly],
  );

  const result = useMemo(() => (submitted ? matchCv(submitted, PROGRAMS, { filter, limit: 5 }) : null), [submitted, filter]);
  const tooShort = result && result.profile.wordCount < MIN_WORDS;
  const [fit, setFit] = useLocalStore<FitStore>(FIT_STORE_KEY, EMPTY_FIT);

  /** Saves one number per programme (0-100). The CV text itself is never stored. */
  const saveFit = () => {
    if (!submitted) return;
    const all = matchCv(submitted, PROGRAMS, { limit: PROGRAMS.length });
    setFit({ saved_on: todayIso(), scores: Object.fromEntries(all.matches.map((m) => [m.program.id, m.score])) });
  };

  const clear = () => {
    setText("");
    setSubmitted(null);
    setFileName(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Match your CV to Erasmus Mundus programmes</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Upload your CV and we&apos;ll suggest the 5 programmes in the catalogue that best fit your background, based on the subjects and skills it mentions.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
        <ShieldCheck className="mt-0.5 size-5 shrink-0" />
        <div>
          <p className="font-medium">Your CV never leaves your browser.</p>
          <p className="opacity-90">
            The file is read and matched on your own device. Nothing is uploaded to a server or sent to an AI service, and the CV is never saved: refresh the page and it&apos;s gone. If you choose “Use in My chances”, only the fit numbers are kept in this browser.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[24rem_minmax(0,1fr)]">
        <Card className="h-fit lg:sticky lg:top-20">
          <CardHeader>
            <CardTitle>Your CV</CardTitle>
            <CardDescription>PDF, DOCX or plain text, up to 10 MB.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                void onFile(e.dataTransfer.files[0]);
              }}
              className={cn(
                "flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground",
                dragging && "border-primary bg-accent text-foreground",
              )}
            >
              {reading ? <Loader2 className="size-6 animate-spin" /> : <Upload className="size-6" />}
              <span className="font-medium text-foreground">{reading ? "Reading your CV…" : "Choose a file or drop it here"}</span>
              <span className="text-xs">Read locally. Not uploaded.</span>
            </button>
            <input ref={inputRef} type="file" accept={ACCEPT} className="sr-only" aria-label="Upload CV" onChange={(e) => void onFile(e.target.files?.[0])} />

            {fileName && !error && (
              <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <FileText className="size-4 shrink-0" />
                  <span className="truncate">{fileName}</span>
                </span>
                <button onClick={clear} aria-label="Remove CV" className="text-muted-foreground hover:text-foreground">
                  <X className="size-4" />
                </button>
              </div>
            )}
            {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

            <div className="space-y-1.5">
              <Label htmlFor="cv-text">…or paste your CV text</Label>
              <Textarea
                id="cv-text"
                rows={8}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Education, projects, skills, work experience…"
              />
            </div>

            <div className="space-y-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={emjmOnly} onChange={(e) => setEmjmOnly(e.target.checked)} />
                Erasmus Mundus Joint Masters only
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={fundedOnly} onChange={(e) => setFundedOnly(e.target.checked)} />
                Only programmes with scholarships or funding
              </label>
            </div>

            <div className="flex gap-2">
              <Button className="flex-1" disabled={!text.trim() || reading} onClick={() => setSubmitted(text)}>
                <Sparkles className="size-4" /> Find my top 5
              </Button>
              {(text || submitted) && (
                <Button variant="outline" onClick={clear}>
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {!result && <EmptyState />}

          {result && tooShort && (
            <Card>
              <CardContent className="p-5 text-sm text-muted-foreground">
                There isn&apos;t enough text to match yet. Add your degree, main subjects, projects and skills, then try again.
              </CardContent>
            </Card>
          )}

          {result && !tooShort && (
            <>
              {result.profile.concepts.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Strengths we picked up from your CV</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.profile.concepts.slice(0, 8).map((c) => (
                      <Badge key={c.label} variant="secondary">
                        {c.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {result.matches.length === 0 ? (
                <Card>
                  <CardContent className="p-5 text-sm text-muted-foreground">
                    No programme titles overlap with your CV. Try adding your degree subject and key skills, or turn off the filters.
                  </CardContent>
                </Card>
              ) : (
                <ol className="space-y-3">
                  {result.matches.map((m, i) => (
                    <MatchCard key={m.program.id} rank={i + 1} m={m} />
                  ))}
                </ol>
              )}

              <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
                <Button size="sm" variant="outline" onClick={saveFit}>
                  Use in My chances
                </Button>
                <span className="text-muted-foreground">
                  {fit.saved_on ? (
                    <>
                      Fit scores saved {fit.saved_on}.{" "}
                      <Link href="/" className="underline">
                        See My chances
                      </Link>{" "}
                      ·{" "}
                      <button className="underline" onClick={() => setFit(EMPTY_FIT)}>
                        Forget
                      </button>
                    </>
                  ) : (
                    "Saves one fit number per programme in this browser, so the explorer's My chances column can use it. Your CV is not saved."
                  )}
                </span>
              </div>

              <p className="text-xs text-muted-foreground">
                How this works: we compare the subjects and skills in your CV with each programme&apos;s title and field from the official catalogue, giving
                more weight to specific topics than to common words. It&apos;s a starting point for your shortlist, not a prediction of admission. Check
                each programme&apos;s{" "}
                <Link href="/eligibility" className="underline">
                  eligibility
                </Link>{" "}
                and official website before applying.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MatchCard({ rank, m }: { rank: number; m: ReturnType<typeof matchCv>["matches"][number] }) {
  const p = m.program;
  const deadline = primaryDeadline(p);
  return (
    <li>
      <Card>
        <CardHeader className="gap-3 pb-3">
          <div className="flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{rank}</span>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/programs/${p.id}`} className="font-semibold hover:underline">
                  {p.acronym}
                </Link>
                <TypeBadge type={p.program_type} />
                <ScholarshipBadge p={p} />
                <StatusBadge status={deadlineStatus(p)} />
              </div>
              <p className="text-sm text-muted-foreground">{p.name}</p>
            </div>
            <div className="w-20 shrink-0 text-right">
              <div className="text-lg font-semibold tabular-nums">{m.score}%</div>
              <div className="text-xs text-muted-foreground">fit</div>
            </div>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
            <div className="h-full rounded-full bg-primary" style={{ width: `${m.score}%` }} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-muted-foreground">Why:</span>
            {m.matchedTerms.slice(0, 6).map((t) => (
              <Badge key={t} variant="outline" className="capitalize">
                {t}
              </Badge>
            ))}
            {m.fieldFit >= 0.5 && <Badge variant="blue">Fits your field: {p.discipline_cluster}</Badge>}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
            <span>Next deadline: {deadline ?? "Unknown"}</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={`/programs/${p.id}`} className="font-medium text-primary hover:underline">
              Programme details
            </Link>
            {p.website_url && (
              <a href={p.website_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                Official website <ExternalLink className="size-3.5" />
              </a>
            )}
          </div>
        </CardContent>
      </Card>
    </li>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="space-y-3 p-6 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Your top 5 matches will appear here.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Include your degree subject, thesis or final project, and technical skills: those carry the most weight.</li>
          <li>Scanned PDFs have no readable text. If yours is one, paste the text instead.</li>
          <li>
            New to the scholarship? Read{" "}
            <Link href="/about" className="underline">
              What is Erasmus Mundus?
            </Link>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}
