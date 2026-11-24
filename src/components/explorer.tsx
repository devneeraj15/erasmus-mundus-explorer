"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type FilterFn,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, ExternalLink, Pin, Search, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { ProvenanceBadge, ScholarshipBadge, StatusBadge, TypeBadge } from "@/components/program-badges";
import { useCompare } from "@/hooks/use-compare";
import { PROGRAMS } from "@/lib/data";
import { deadlineStatus, primaryDeadline } from "@/lib/deadlines";
import { PROGRAM_TYPE_LABEL, type DeadlineStatus, type Program, type ProgramType, type ScholarshipStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type Row = Program & { _status: DeadlineStatus; _deadline: string | null; _hasSample: boolean };

const TIERS: ProgramType[] = ["EMJM", "MSCA", "EIT", "EMDM", "SHORT_TERM"];
const TIER_BLURB: Record<ProgramType, string> = {
  EMJM: "2-year joint masters, EU scholarship €1,400/month where awarded",
  MSCA: "Doctoral Networks: salaried doctoral researcher contracts",
  EIT: "Technical masters + innovation & entrepreneurship",
  EMDM: "Design Measures: future masters in set-up; prepare a year ahead",
  SHORT_TERM: "Erasmus+ traineeships and short-term mobility",
};

const col = createColumnHelper<Row>();

const globalFilter: FilterFn<Row> = (row, _id, value: string) => {
  const q = value.trim().toLowerCase();
  if (!q) return true;
  const p = row.original;
  return [p.acronym, p.name, p.discipline_cluster, ...p.keywords, ...(p.research_pillars ?? [])].join(" ").toLowerCase().includes(q);
};

export function Explorer() {
  const rows: Row[] = useMemo(
    () =>
      PROGRAMS.map((p) => ({
        ...p,
        _status: deadlineStatus(p),
        _deadline: primaryDeadline(p),
        _hasSample: Object.values(p.data_quality.sections).includes("sample"),
      })),
    [],
  );
  const { ids, toggle, full } = useCompare();

  const [q, setQ] = useState("");
  const [tiers, setTiers] = useState<ProgramType[]>([]);
  const [field, setField] = useState("");
  const [scholarship, setScholarship] = useState<"" | ScholarshipStatus>("");
  const [status, setStatus] = useState<"" | DeadlineStatus>("");
  const [newOnly, setNewOnly] = useState(false);
  const [checkedOnly, setCheckedOnly] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);

  const fields = useMemo(() => Array.from(new Set(rows.map((r) => r.discipline_cluster))).sort(), [rows]);
  const tierCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows) c[r.program_type] = (c[r.program_type] ?? 0) + 1;
    return c;
  }, [rows]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (!tiers.length || tiers.includes(r.program_type)) &&
          (!field || r.discipline_cluster === field) &&
          (!scholarship || r.funding.scholarship_status === scholarship) &&
          (!status || r._status === status) &&
          (!newOnly || r.new_for_2027) &&
          (!checkedOnly || r.data_quality.rules === "hand_checked"),
      ),
    [rows, tiers, field, scholarship, status, newOnly, checkedOnly],
  );

  const columns = useMemo(
    () => [
      col.display({
        id: "pin",
        header: () => <span className="sr-only">Compare</span>,
        cell: ({ row }) => {
          const on = ids.includes(row.original.id);
          return (
            <button
              onClick={() => toggle(row.original.id)}
              disabled={!on && full}
              aria-pressed={on}
              title={on ? "Remove from comparison" : full ? "Comparison is full (5)" : "Pin to compare"}
              className={cn("rounded p-1 hover:bg-accent disabled:opacity-30", on ? "text-primary" : "text-muted-foreground")}
            >
              <Pin className={cn("size-4", on && "fill-current")} />
            </button>
          );
        },
      }),
      col.accessor("acronym", {
        header: "Programme",
        cell: ({ row }) => (
          <div className="min-w-56">
            <Link href={`/programs/${row.original.id}`} className="font-medium hover:underline">
              {row.original.acronym}
            </Link>
            {row.original.new_for_2027 && (
              <Badge variant="violet" className="ml-2">
                <Sparkles className="size-3" /> New 2027
              </Badge>
            )}
            <div className="line-clamp-2 text-xs text-muted-foreground">{row.original.name}</div>
          </div>
        ),
      }),
      col.accessor("program_type", { header: "Tier", cell: (c) => <TypeBadge type={c.getValue()} /> }),
      col.accessor("discipline_cluster", { header: "Field", cell: (c) => <span className="text-sm">{c.getValue()}</span> }),
      col.accessor((r) => r.funding.scholarship_status, { id: "funding", header: "Funding", cell: ({ row }) => <ScholarshipBadge p={row.original} /> }),
      col.accessor("_deadline", {
        header: "Next deadline",
        sortUndefined: "last",
        sortingFn: (a, b) => (a.original._deadline ?? "9999").localeCompare(b.original._deadline ?? "9999"),
        cell: ({ row }) => (
          <div className="flex flex-col items-start gap-1">
            <span className="text-sm tabular-nums">{row.original._deadline ?? "—"}</span>
            <StatusBadge status={row.original._status} />
          </div>
        ),
      }),
      col.accessor((r) => r.data_quality.rules, {
        id: "quality",
        header: "Data",
        cell: ({ row }) => (
          <div className="flex flex-col items-start gap-1">
            <ProvenanceBadge source={row.original.data_quality.rules === "hand_checked" ? "hand_checked" : "catalogue"} />
            {row.original._hasSample && <ProvenanceBadge source="sample" />}
          </div>
        ),
      }),
      col.display({
        id: "site",
        header: () => <span className="sr-only">Website</span>,
        cell: ({ row }) =>
          row.original.website_url ? (
            <a href={row.original.website_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground" title="Official website">
              <ExternalLink className="size-4" />
            </a>
          ) : null,
      }),
    ],
    [ids, toggle, full],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { globalFilter: q, sorting },
    onSortingChange: setSorting,
    globalFilterFn: globalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const shown = table.getRowModel().rows;
  const reset = () => {
    setQ("");
    setTiers([]);
    setField("");
    setScholarship("");
    setStatus("");
    setNewOnly(false);
    setCheckedOnly(false);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Explore {rows.length} programmes</h1>
        <p className="text-sm text-muted-foreground">
          Every programme in the catalogue export, beyond joint masters. Pin 2 to 5 to compare side by side.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {TIERS.map((t) => {
          const on = tiers.includes(t);
          return (
            <button
              key={t}
              onClick={() => setTiers((prev) => (on ? prev.filter((x) => x !== t) : [...prev, t]))}
              aria-pressed={on}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors hover:bg-accent",
                on && "border-primary bg-accent ring-1 ring-primary",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <TypeBadge type={t} />
                <span className="text-xs tabular-nums text-muted-foreground">{tierCounts[t] ?? 0}</span>
              </div>
              <div className="mt-1.5 text-sm font-medium">{PROGRAM_TYPE_LABEL[t]}</div>
              <div className="text-xs text-muted-foreground">{TIER_BLURB[t]}</div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search acronym, title, keyword…" className="pl-8" />
        </div>
        <NativeSelect value={field} onChange={(e) => setField(e.target.value)} className="w-auto" aria-label="Field">
          <option value="">All fields</option>
          {fields.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </NativeSelect>
        <NativeSelect value={scholarship} onChange={(e) => setScholarship(e.target.value as ScholarshipStatus | "")} className="w-auto" aria-label="Funding">
          <option value="">Any funding</option>
          <option value="EU_SCHOLARSHIP">EU scholarship (€1,400/mo)</option>
          <option value="YES">Funding available (other)</option>
          <option value="OLDER_GRANT">Check: older grant</option>
          <option value="SELF_FUNDED">Self-funded only</option>
        </NativeSelect>
        <NativeSelect value={status} onChange={(e) => setStatus(e.target.value as DeadlineStatus | "")} className="w-auto" aria-label="Deadline status">
          <option value="">Any deadline status</option>
          <option value="DEADLINE_AHEAD">Deadline ahead</option>
          <option value="OPEN">Open</option>
          <option value="OPENING_SOON">Opening soon</option>
          <option value="CLOSED">Closed</option>
          <option value="UNKNOWN">Deadline unknown</option>
        </NativeSelect>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={newOnly} onChange={(e) => setNewOnly(e.target.checked)} /> New for 2027
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={checkedOnly} onChange={(e) => setCheckedOnly(e.target.checked)} /> Hand-checked only
        </label>
        <Button variant="ghost" size="sm" onClick={reset}>
          Reset
        </Button>
      </div>

      <div className="text-sm text-muted-foreground">
        Showing {shown.length} of {rows.length}
      </div>

      <div className="relative overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="px-3 py-2 font-medium">
                    {h.column.getCanSort() ? (
                      <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={h.column.getToggleSortingHandler()}>
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        <ArrowUpDown className="size-3" />
                      </button>
                    ) : (
                      flexRender(h.column.columnDef.header, h.getContext())
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-muted/40">
                {r.getVisibleCells().map((c) => (
                  <td key={c.id} className="px-3 py-2 align-top">
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {!shown.length && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-10 text-center text-muted-foreground">
                  No programmes match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
