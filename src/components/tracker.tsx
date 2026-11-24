"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Download, FileCheck, Sparkles, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, NativeSelect, Textarea } from "@/components/ui/input";
import { ProvenanceBadge, TypeBadge } from "@/components/program-badges";
import { DeadlineCountdown } from "@/components/deadline-countdown";
import { useLocalStore } from "@/hooks/use-local-store";
import { useTracker } from "@/hooks/use-tracker";
import { DEMO_IDS, PROGRAM_BY_ID, PROGRAMS } from "@/lib/data";
import { primaryDeadline } from "@/lib/deadlines";
import { documentsFor, sopPrompts, type DocStatus, type SopContext } from "@/lib/documents";
import type { Program } from "@/lib/types";

const STATUS_LABEL: Record<DocStatus, string> = { todo: "To do", in_progress: "In progress", ready: "Ready", submitted: "Submitted" };
const EMPTY_CTX: SopContext = { major: "", experience: "", goal: "" };

export function Tracker() {
  const { state, addTarget, removeTarget, setDoc, setNote } = useTracker();
  const [ctx, setCtx] = useLocalStore<SopContext>("em:sop:v1", EMPTY_CTX);
  const [pick, setPick] = useState("");

  const targets = state.targets.map((id) => PROGRAM_BY_ID.get(id)).filter((p): p is Program => !!p);
  const options = useMemo(() => PROGRAMS.filter((p) => !state.targets.includes(p.id)).sort((a, b) => a.acronym.localeCompare(b.acronym)), [state.targets]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ tracker: state, sop: ctx }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "application-tracker.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Application readiness tracker</h1>
          <p className="text-sm text-muted-foreground">Saved in this browser only (localStorage). Nothing is uploaded.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <NativeSelect value={pick} onChange={(e) => setPick(e.target.value)} className="w-64" aria-label="Add programme">
            <option value="">Add a programme…</option>
            {options.map((p) => (
              <option key={p.id} value={p.id}>
                {p.acronym}
                {DEMO_IDS.includes(p.id) ? " (demo)" : ""}
              </option>
            ))}
          </NativeSelect>
          <Button
            disabled={!pick}
            onClick={() => {
              addTarget(pick);
              setPick("");
            }}
          >
            Add
          </Button>
          {targets.length > 0 && (
            <Button variant="outline" onClick={exportJson}>
              <Download /> Export
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" /> Statement of purpose context
          </CardTitle>
          <CardDescription>Used to tailor the writing prompts under each programme. Template-based, nothing is sent anywhere.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Your major</Label>
            <Input value={ctx.major} onChange={(e) => setCtx({ ...ctx, major: e.target.value })} placeholder="e.g. Physics" />
          </div>
          <div className="space-y-1.5">
            <Label>Key experience</Label>
            <Input value={ctx.experience} onChange={(e) => setCtx({ ...ctx, experience: e.target.value })} placeholder="e.g. thesis on satellite image segmentation" />
          </div>
          <div className="space-y-1.5">
            <Label>Career goal</Label>
            <Input value={ctx.goal} onChange={(e) => setCtx({ ...ctx, goal: e.target.value })} placeholder="e.g. climate-risk analytics in public agencies" />
          </div>
        </CardContent>
      </Card>

      {!targets.length && (
        <Card>
          <CardContent className="space-y-3 py-12 text-center text-muted-foreground">
            <p>No target programmes yet. Add one above, or use “Track documents” on a programme page.</p>
            <Button variant="outline" onClick={() => ["deai", "euroculture"].forEach(addTarget)}>
              Try with two demo programmes
            </Button>
          </CardContent>
        </Card>
      )}

      {targets.map((p) => {
        const docs = documentsFor(p);
        const st = state.status[p.id] ?? {};
        const readyCount = docs.filter((d) => st[d.key] === "ready" || st[d.key] === "submitted").length;
        const generic = docs.some((d) => !d.fromProgramData);
        const deadline = primaryDeadline(p);
        const pct = Math.round((readyCount / docs.length) * 100);
        return (
          <Card key={p.id}>
            <CardHeader className="gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Link href={`/programs/${p.id}`} className="font-semibold hover:underline">
                    {p.acronym}
                  </Link>
                  <TypeBadge type={p.program_type} />
                  {p.data_quality.sections.documents === "sample" && <ProvenanceBadge source="sample" />}
                  {generic && <Badge variant="muted">Generic checklist</Badge>}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {deadline ? (
                    <>
                      <span className="tabular-nums">{deadline}</span> <DeadlineCountdown date={deadline} />
                    </>
                  ) : (
                    <span className="text-muted-foreground">Deadline unknown</span>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => removeTarget(p.id)} aria-label={`Remove ${p.acronym}`}>
                    <Trash2 />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {readyCount}/{docs.length} ready
                </span>
              </div>
            </CardHeader>
            <CardContent className="grid gap-5 lg:grid-cols-2">
              <ul className="space-y-2">
                {docs.map((d) => (
                  <li key={d.key} className="flex items-start justify-between gap-3 border-b pb-2 text-sm last:border-0">
                    <div>
                      <div className="flex items-center gap-1.5 font-medium">
                        <FileCheck className="size-4 text-muted-foreground" /> {d.label}
                      </div>
                      {d.note && <div className="pl-5.5 text-xs text-muted-foreground">{d.note}</div>}
                    </div>
                    <NativeSelect
                      value={st[d.key] ?? "todo"}
                      onChange={(e) => setDoc(p.id, d.key, e.target.value as DocStatus)}
                      className="h-8 w-32 text-xs"
                      aria-label={`${d.label} status`}
                    >
                      {(Object.keys(STATUS_LABEL) as DocStatus[]).map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </NativeSelect>
                  </li>
                ))}
              </ul>
              <div className="space-y-3">
                <div>
                  <div className="mb-1.5 text-sm font-medium">Tailored SOP prompts</div>
                  <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
                    {sopPrompts(p, ctx).map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                </div>
                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Textarea value={state.notes[p.id] ?? ""} onChange={(e) => setNote(p.id, e.target.value)} placeholder="Portal login, referee names, questions for the consortium…" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
