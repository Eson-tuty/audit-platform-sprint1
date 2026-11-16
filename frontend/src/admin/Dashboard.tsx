import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { api } from "../lib/api";
import type { Lead } from "../lib/types";
import { formatDate } from "../lib/markdown";
import { useMe } from "./auth";
import { Badge, Card, LoadingBlock, PageHeader, statusTone } from "../components/ui";

type DashboardData = {
  counts: Record<"leads_total" | "leads_new" | "pages_published" | "pages_total" | "resources_published" | "resources_total", number>;
  leads_series: { date: string; leads: number }[];
  recent_leads: Lead[];
  recent_activity: { id: number; event: string; auditable_type: string | null; created_at: string; user: { name: string } | null }[];
};

export default function Dashboard() {
  const { data: me } = useMe();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => (await api.get<{ data: DashboardData }>("/admin/dashboard")).data.data,
  });

  if (isLoading || !data) return <LoadingBlock />;
  const c = data.counts;
  const last30 = data.leads_series.reduce((a, b) => a + b.leads, 0);

  return (
    <>
      <PageHeader title={`Good to see you, ${me?.user.name.split(" ")[0] ?? ""}`} description="What's happening on your website." />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="New leads" value={c.leads_new} sub={`${c.leads_total} total`} to="/admin/leads" />
        <Stat label="Leads, last 30 days" value={last30} sub="from all forms" to="/admin/leads" />
        <Stat label="Published pages" value={c.pages_published} sub={`${c.pages_total} total`} to="/admin/pages" />
        <Stat label="University resources" value={c.resources_published} sub={`${c.resources_total} total`} to="/admin/university" />
      </div>

      <Card className="mt-6 p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">Leads per day</h2>
          <span className="text-xs text-muted">Last 30 days</span>
        </div>
        <LeadsChart series={data.leads_series} />
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <h2 className="font-semibold">Recent leads</h2>
            <Link to="/admin/leads" className="flex items-center gap-1 text-xs font-medium text-accent">View all <ArrowRight className="size-3" /></Link>
          </div>
          <ul className="divide-y divide-line">
            {data.recent_leads.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{l.name}</p>
                  <p className="truncate text-xs text-muted">{l.company || l.email} · {formatDate(l.created_at)}</p>
                </div>
                <Badge tone={statusTone(l.status)}>{l.status}</Badge>
              </li>
            ))}
            {!data.recent_leads.length && <li className="px-5 py-8 text-center text-sm text-muted">No leads yet.</li>}
          </ul>
        </Card>
        <Card>
          <div className="border-b border-line px-5 py-3"><h2 className="font-semibold">Recent activity</h2></div>
          <ul className="divide-y divide-line">
            {data.recent_activity.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <span className="min-w-0 truncate"><span className="font-medium">{a.user?.name ?? "Website visitor"}</span> <span className="font-mono text-xs text-muted">{a.event}</span></span>
                <span className="shrink-0 text-xs text-muted">{formatDate(a.created_at, { dateStyle: "short", timeStyle: "short" })}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}

function Stat({ label, value, sub, to }: { label: string; value: number; sub: string; to: string }) {
  return (
    <Link to={to} className="rounded-xl border border-line bg-white p-5 hover:border-ink/30">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value.toLocaleString("en-IN")}</p>
      <p className="mt-1 text-xs text-muted">{sub}</p>
    </Link>
  );
}

/** Single-series bar chart: one hue, recessive gridlines, per-bar hover tooltip, table fallback for screen readers. */
function LeadsChart({ series }: { series: { date: string; leads: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720, H = 180, padL = 28, padB = 22, padT = 8;
  const max = Math.max(4, ...series.map((s) => s.leads));
  const ticks = [0, Math.ceil(max / 2), max];
  const plotW = W - padL, plotH = H - padB - padT;
  const slot = plotW / series.length;
  const barW = Math.max(4, slot - 2); // 2px surface gap between bars
  const y = (v: number) => padT + plotH - (v / max) * plotH;
  const short = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  return (
    <div className="relative mt-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Leads per day over the last 30 days">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeWidth={1} />
            <text x={padL - 6} y={y(t) + 3} textAnchor="end" fontSize={10} fill="var(--color-muted)">{t}</text>
          </g>
        ))}
        {series.map((s, i) => {
          const x = padL + i * slot + 1;
          const h = (s.leads / max) * plotH;
          const r = Math.min(4, h / 2, barW / 2);
          const top = padT + plotH - h;
          return (
            <g key={s.date} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              {/* hit target larger than the mark */}
              <rect x={padL + i * slot} y={padT} width={slot} height={plotH} fill="transparent" />
              {h > 0 && (
                <path
                  d={`M${x},${padT + plotH} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${padT + plotH} Z`}
                  fill="var(--color-chart)"
                  opacity={hover === null || hover === i ? 1 : 0.45}
                />
              )}
            </g>
          );
        })}
        {[0, Math.floor(series.length / 2), series.length - 1].map((i) => (
          <text key={i} x={padL + i * slot + slot / 2} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--color-muted)">{series[i] && short(series[i].date)}</text>
        ))}
      </svg>
      {hover !== null && series[hover] && (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-md border border-line bg-white px-2.5 py-1.5 text-xs shadow-sm"
          style={{ left: `${((padL + hover * slot + slot / 2) / W) * 100}%` }}
        >
          <p className="text-muted">{short(series[hover].date)}</p>
          <p className="font-semibold text-ink">{series[hover].leads} lead{series[hover].leads === 1 ? "" : "s"}</p>
        </div>
      )}
      <table className="sr-only">
        <caption>Leads per day</caption>
        <tbody>{series.map((s) => <tr key={s.date}><th>{s.date}</th><td>{s.leads}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
