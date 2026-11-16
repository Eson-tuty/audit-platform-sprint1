import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useCan, useMe } from "../admin/auth";
import { Badge, cx, type Tone } from "../components/ui";
import type { Counts, Meta } from "./types";

export function useMeta() {
  return useQuery({
    queryKey: ["audit", "meta"],
    queryFn: async () => (await api.get<{ data: Meta }>("/audit/meta")).data.data,
    staleTime: 60_000,
  });
}

/** Can the current user record testing on a process assigned to `assigneeId`? Mirrors AuditWorkflow::canTest. */
export function useCanTest() {
  const can = useCan();
  const { data: me } = useMe();
  return (assigneeId: number | null | undefined) => can("audit.manage") || (can("audit.test") && !!me && assigneeId === me.user.id);
}

const LABELS: Record<string, string> = { it_dependent: "IT-dependent", ad_hoc: "Ad hoc", half_yearly: "Half-yearly" };
export const humanize = (s: string | null | undefined) => (s ? LABELS[s] ?? s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()) : "—");

const STATUS: Record<string, [string, Tone]> = {
  planning: ["Planning", "neutral"],
  not_started: ["Not started", "neutral"],
  in_progress: ["In progress", "blue"],
  completed: ["Completed", "green"],
  open: ["Open", "red"],
  closed: ["Closed", "green"],
  pass: ["Pass", "green"],
  fail: ["Fail", "red"],
  high: ["High", "red"],
  medium: ["Medium", "amber"],
  low: ["Low", "neutral"],
};

export function StatusBadge({ status, className }: { status: string | null | undefined; className?: string }) {
  if (!status) return <Badge className={className}>Untested</Badge>;
  const [label, tone] = STATUS[status] ?? [humanize(status), "neutral" as Tone];
  return <Badge tone={tone} className={cx("normal-case!", className)}>{label}</Badge>;
}

export function RatingBadge({ rating }: { rating: string | null | undefined }) {
  if (!rating) return null;
  const [label, tone] = STATUS[rating] ?? [rating, "neutral" as Tone];
  return <Badge tone={tone} className="normal-case!">{label} risk</Badge>;
}

/** "Due in 3 days" / "Overdue 2 days" / "Due today" */
export function DueBadge({ days, closed }: { days: number | null; closed?: boolean }) {
  if (closed || days === null) return null;
  if (days < 0) return <Badge tone="red" className="normal-case!">Overdue {Math.abs(days)}d</Badge>;
  if (days === 0) return <Badge tone="amber" className="normal-case!">Due today</Badge>;
  return <Badge tone={days <= 7 ? "amber" : "neutral"} className="normal-case!">Due in {days}d</Badge>;
}

/**
 * Stacked progress bar: passed | failed | untested.
 * Status colours are paired with the visible counts next to the bar, so identity is never colour alone.
 */
export function TestProgress({ counts, className }: { counts: Counts; className?: string }) {
  const { total, passed, failed } = counts;
  const pct = (n: number) => (total ? (n / total) * 100 : 0);
  const label = `${passed} passed, ${failed} failed, ${total - passed - failed} untested of ${total}`;
  return (
    <div className={cx("flex h-2 w-full gap-[2px] overflow-hidden rounded-full bg-paper-2", className)} role="img" aria-label={label} title={label}>
      {passed > 0 && <div className="h-full rounded-l-full bg-chart" style={{ width: `${pct(passed)}%` }} />}
      {failed > 0 && <div className={cx("h-full bg-danger", passed === 0 && "rounded-l-full")} style={{ width: `${pct(failed)}%` }} />}
    </div>
  );
}

export function ProgressLegend() {
  return (
    <div className="flex items-center gap-4 text-[11px] text-muted">
      <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-chart" /> Passed</span>
      <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-danger" /> Failed</span>
      <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-paper-2 ring-1 ring-line" /> Untested</span>
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: string | number; sub?: string; tone?: "red" | "amber" }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={cx("mt-1 text-2xl font-semibold tracking-tight tabular-nums", tone === "red" && "text-danger", tone === "amber" && "text-amber")}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}

export const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d.length === 10 ? `${d}T00:00:00` : d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "—";

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
