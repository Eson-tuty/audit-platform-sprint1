import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Calculator, ClipboardCheck, FileText, Search } from "lucide-react";
import { useUniversity, useDocumentTitle } from "./useSite";
import type { ResourceType } from "../lib/types";
import { cx, FigLabel, LoadingBlock } from "../components/ui";

export const typeMeta: Record<ResourceType, { label: string; icon: typeof BookOpen }> = {
  tool: { label: "Free tool", icon: Calculator },
  guide: { label: "Guide", icon: BookOpen },
  template: { label: "Template", icon: FileText },
  checklist: { label: "Checklist", icon: ClipboardCheck },
};

export default function UniversityIndex() {
  const { data, isLoading } = useUniversity();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [type, setType] = useState<ResourceType | "all">("all");
  useDocumentTitle("University — free audit tools & guides");

  const categories = useMemo(() => ["All", ...Array.from(new Set((data ?? []).map((r) => r.category)))], [data]);
  const filtered = (data ?? []).filter(
    (r) =>
      (category === "All" || r.category === category) &&
      (type === "all" || r.type === type) &&
      (!q || `${r.title} ${r.summary}`.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <>
      <section className="border-b border-line">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <FigLabel>university</FigLabel>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Free tools for <span className="font-serif font-normal italic text-accent">working auditors</span>.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted">Trackers, calculators, templates and checklists you can use today — no sign-up, nothing stored on our servers.</p>
          <div className="relative mt-8 max-w-lg">
            <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search tools and guides…"
              className="h-12 w-full rounded-xl border border-line bg-white pr-4 pl-10 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button key={c} onClick={() => setCategory(c)} className={cx("rounded-full border px-3.5 py-1.5 text-sm", category === c ? "border-ink bg-ink text-paper" : "border-line bg-white hover:border-ink/30")}>
                {c}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 rounded-lg border border-line bg-white p-1">
            {(["all", "tool", "guide", "template", "checklist"] as const).map((t) => (
              <button key={t} onClick={() => setType(t)} className={cx("rounded-md px-3 py-1 text-xs capitalize", type === t ? "bg-paper-2 font-medium text-ink" : "text-muted hover:text-ink")}>
                {t === "all" ? "All types" : `${t}s`}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <LoadingBlock />
        ) : filtered.length === 0 ? (
          <p className="py-20 text-center text-muted">No resources match. Try a different filter.</p>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((r) => {
              const meta = typeMeta[r.type] ?? typeMeta.guide;
              const Icon = meta.icon;
              return (
                <Link key={r.slug} to={`/university/${r.slug}`} className="group flex flex-col rounded-xl border border-line bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-ink/40 hover:shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium", r.type === "tool" ? "bg-accent-soft text-accent-2" : "bg-paper-2 text-ink-2")}>
                      <Icon className="size-3.5" /> {meta.label}
                    </span>
                    <FigLabel>{r.category}</FigLabel>
                  </div>
                  <h2 className="mt-5 text-lg font-semibold leading-snug group-hover:text-accent">{r.title}</h2>
                  <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted">{r.summary}</p>
                  <span className="mt-6 inline-flex items-center gap-1 text-sm font-medium">
                    {r.type === "tool" ? "Open tool" : "Read"} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
