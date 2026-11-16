import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Card, EmptyState, LoadingBlock, PageHeader } from "../components/ui";
import type { EngagementProcess } from "./types";
import { StatusBadge, TestProgress, fmtDate } from "./shared";

export default function MyWork() {
  const { data, isLoading } = useQuery({
    queryKey: ["audit", "my-work"],
    queryFn: async () => (await api.get<{ data: EngagementProcess[] }>("/audit/my-work")).data.data,
  });

  if (isLoading) return <LoadingBlock />;
  const active = data?.filter((p) => p.status !== "completed") ?? [];
  const done = data?.filter((p) => p.status === "completed") ?? [];

  return (
    <>
      <PageHeader title="My work" description="Processes assigned to you. Open one to test its controls." />
      {!data?.length ? <Card><EmptyState title="Nothing assigned to you yet" body="When a manager assigns you a process it will appear here." /></Card> : (
        <>
          <Section title="To do" items={active} empty="All caught up — every assigned process is fully tested." />
          {done.length > 0 && <Section title="Completed" items={done} />}
        </>
      )}
    </>
  );
}

function Section({ title, items, empty }: { title: string; items: EngagementProcess[]; empty?: string }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold text-ink-2">{title} <span className="font-normal text-muted">{items.length}</span></h2>
      {!items.length ? <p className="text-sm text-muted">{empty}</p> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((p) => (
            <Link key={p.id} to={`/app/testing/${p.id}`} className="rounded-xl border border-line bg-white p-4 transition-shadow hover:shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{p.process_name}</p>
                  <p className="text-xs text-muted">{p.client}</p>
                  <p className="text-xs text-muted">{p.engagement_label}</p>
                </div>
                <StatusBadge status={p.status} />
              </div>
              <TestProgress counts={p.counts} className="mt-4" />
              <div className="mt-2 flex justify-between text-xs text-muted">
                <span>{p.counts.tested}/{p.counts.total} tested{p.counts.failed ? ` · ${p.counts.failed} failed` : ""}</span>
                {p.due_date && <span>Due {fmtDate(p.due_date)}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
