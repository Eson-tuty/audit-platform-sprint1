import { lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, ChevronRight, ExternalLink, Link2, Linkedin, Mail, MessageCircle, Send } from "lucide-react";
import { api } from "../lib/api";
import type { UniversityResource } from "../lib/types";
import { formatDate, renderMarkdown } from "../lib/markdown";
import { FaqList } from "./Sections";
import { typeMeta } from "./UniversityIndex";
import { useDocumentTitle, useSite } from "./useSite";
import NotFound from "./NotFound";
import { FigLabel, LoadingBlock } from "../components/ui";

const tools: Record<string, React.LazyExoticComponent<() => React.JSX.Element>> = {
  "fieldwork-tracker": lazy(() => import("../tools/FieldworkTracker")),
  "sample-size-calculator": lazy(() => import("../tools/SampleSizeCalculator")),
  "materiality-calculator": lazy(() => import("../tools/MaterialityCalculator")),
};

type Response = { data: UniversityResource; related: UniversityResource[] };

export default function UniversityResourcePage() {
  const { slug = "" } = useParams();
  const { data: site } = useSite();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["university", slug],
    queryFn: async () => (await api.get<Response>(`/university/${encodeURIComponent(slug)}`)).data,
    retry: false,
  });
  useDocumentTitle(data?.data.seo?.title || data?.data.title);

  if (isLoading) return <LoadingBlock />;
  if (isError || !data) return <NotFound />;

  const r = data.data;
  const Tool = r.tool_key ? tools[r.tool_key] : undefined;
  const meta = typeMeta[r.type] ?? typeMeta.guide;

  return (
    <article>
      <header className="border-b border-line">
        <div className="mx-auto max-w-7xl px-4 pt-10 pb-12 sm:px-6">
          <nav aria-label="Breadcrumb" className="no-print flex items-center gap-1 text-xs text-muted">
            <Link to="/university" className="hover:text-ink">{site?.brand.name ?? ""} University</Link>
            <ChevronRight className="size-3" />
            <span>{meta.label}</span>
            <ChevronRight className="size-3" />
            <span className="text-ink-2">{r.category}</span>
          </nav>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{r.title}</h1>
          {r.summary && <p className="mt-4 max-w-3xl text-lg text-muted">{r.summary}</p>}
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11px] text-muted uppercase tracking-wide">
            <span>{meta.label}</span>
            <span>Category · {r.category}</span>
            {r.reviewed_at && <span>Last reviewed · {formatDate(r.reviewed_at)}</span>}
            <span>Informational only — not professional advice</span>
          </div>
        </div>
      </header>

      {Tool && (
        <section className="border-b border-line bg-paper-2/50">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
            <Suspense fallback={<LoadingBlock />}><Tool /></Suspense>
          </div>
        </section>
      )}

      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          {r.body && <div className="prose-audit max-w-3xl" dangerouslySetInnerHTML={{ __html: renderMarkdown(r.body) }} />}

          {!!r.faqs?.length && (
            <section className="mt-14 max-w-3xl">
              <h2 className="mb-5 text-2xl font-semibold tracking-tight">Frequently asked questions</h2>
              <FaqList items={r.faqs} />
            </section>
          )}

          {!!r.sources?.length && (
            <section className="mt-14 max-w-3xl">
              <h2 className="mb-4 text-lg font-semibold">Authoritative sources</h2>
              <ul className="space-y-2 text-sm">
                {r.sources.map((s) => (
                  <li key={s.label} className="flex items-start gap-2">
                    <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-muted" />
                    {s.url && /^https?:\/\//.test(s.url) ? <a href={s.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">{s.label}</a> : <span>{s.label}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="no-print space-y-8 lg:sticky lg:top-24 lg:self-start">
          {!!data.related.length && (
            <div>
              <FigLabel>Related resources</FigLabel>
              <ul className="mt-3 space-y-2">
                {data.related.map((x) => (
                  <li key={x.slug}>
                    <Link to={`/university/${x.slug}`} className="group block rounded-lg border border-line bg-white p-3 hover:border-ink/40">
                      <p className="text-sm font-medium group-hover:text-accent">{x.title}</p>
                      <p className="mt-0.5 text-xs text-muted capitalize">{x.type} · {x.category}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <ShareBar title={r.title} />
        </aside>
      </div>

      <section className="no-print px-4 pb-20 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 rounded-2xl bg-ink px-8 py-10 text-paper md:flex-row md:items-center">
          <div>
            <h2 className="font-serif text-3xl">Track this inside a real engagement.</h2>
            <p className="mt-2 text-paper/70">Samples, evidence and review notes linked to the working papers they support.</p>
          </div>
          <Link to="/contact" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-paper px-5 text-sm font-medium text-ink hover:bg-white">
            Book a demo <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </article>
  );
}

function ShareBar({ title }: { title: string }) {
  const url = typeof window !== "undefined" ? window.location.href : "";
  const enc = encodeURIComponent;
  const links = [
    { label: "WhatsApp", icon: MessageCircle, href: `https://wa.me/?text=${enc(`${title} ${url}`)}` },
    { label: "LinkedIn", icon: Linkedin, href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}` },
    { label: "Telegram", icon: Send, href: `https://t.me/share/url?url=${enc(url)}&text=${enc(title)}` },
    { label: "Email", icon: Mail, href: `mailto:?subject=${enc(title)}&body=${enc(url)}` },
  ];
  return (
    <div>
      <FigLabel>Share</FigLabel>
      <div className="mt-3 flex flex-wrap gap-2">
        {links.map(({ label, icon: I, href }) => (
          <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={`Share on ${label}`} title={label} className="grid size-9 place-items-center rounded-lg border border-line bg-white text-ink-2 hover:border-ink/40 hover:text-ink">
            <I className="size-4" />
          </a>
        ))}
        <button
          onClick={() => navigator.clipboard?.writeText(url)}
          aria-label="Copy link"
          title="Copy link"
          className="grid size-9 place-items-center rounded-lg border border-line bg-white text-ink-2 hover:border-ink/40 hover:text-ink"
        >
          <Link2 className="size-4" />
        </button>
      </div>
    </div>
  );
}
