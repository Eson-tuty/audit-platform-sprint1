import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Plus, Minus } from "lucide-react";
import type { Section } from "../lib/types";
import { renderMarkdown, safeHref } from "../lib/markdown";
import { FigLabel } from "../components/ui";

export function SectionRenderer({ sections }: { sections: Section[] }) {
  return (
    <>
      {sections.map((s, i) => (
        <SectionBlock key={i} section={s} index={i} />
      ))}
    </>
  );
}

function SectionBlock({ section: s, index }: { section: Section; index: number }) {
  switch (s.type) {
    case "hero":
      return (
        <section className="border-b border-line">
          <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
            {s.eyebrow && <FigLabel>{s.eyebrow}</FigLabel>}
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{s.title}</h1>
            {s.subtitle && <p className="mx-auto mt-5 max-w-2xl text-lg text-muted text-pretty">{s.subtitle}</p>}
            {s.button_label && (
              <Link to={safeHref(s.button_url, "/contact")} className="mt-8 inline-flex h-11 items-center gap-2 rounded-lg bg-ink px-5 text-sm font-medium text-paper hover:bg-ink-2">
                {s.button_label} <ArrowRight className="size-4" />
              </Link>
            )}
          </div>
        </section>
      );
    case "rich_text":
      return (
        <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <div className="prose-audit" dangerouslySetInnerHTML={{ __html: renderMarkdown(s.body) }} />
        </section>
      );
    case "features":
      return (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          {s.title && <h2 className="mb-8 text-2xl font-semibold tracking-tight">{s.title}</h2>}
          <div className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {(s.items ?? []).map((it, i) => (
              <div key={i} className="bg-white p-6">
                <FigLabel>{String(i + 1).padStart(2, "0")}</FigLabel>
                <h3 className="mt-2 font-semibold">{it.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{it.body}</p>
              </div>
            ))}
          </div>
        </section>
      );
    case "stats":
      return (
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <dl className="grid grid-cols-2 gap-6 rounded-xl border border-line bg-white p-6 md:grid-cols-4">
            {(s.items ?? []).map((it, i) => (
              <div key={i}>
                <dt className="text-xs text-muted">{it.label}</dt>
                <dd className="mt-1 font-serif text-4xl">{it.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      );
    case "faq":
      return (
        <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          {s.title && <h2 className="mb-6 text-2xl font-semibold tracking-tight">{s.title}</h2>}
          <FaqList items={s.items ?? []} />
        </section>
      );
    case "cta":
      return (
        <section className="px-4 py-16 sm:px-6" data-index={index}>
          <div className="mx-auto max-w-5xl rounded-2xl bg-ink px-8 py-12 text-center text-paper">
            <h2 className="font-serif text-4xl">{s.title}</h2>
            {s.body && <p className="mx-auto mt-3 max-w-xl text-paper/70">{s.body}</p>}
            {s.button_label && (
              <Link to={safeHref(s.button_url, "/contact")} className="mt-7 inline-flex h-11 items-center gap-2 rounded-lg bg-paper px-5 text-sm font-medium text-ink hover:bg-white">
                {s.button_label} <ArrowRight className="size-4" />
              </Link>
            )}
          </div>
        </section>
      );
    default:
      return null;
  }
}

export function FaqList({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-line rounded-xl border border-line bg-white">
      {items.map((f, i) => (
        <div key={i}>
          <button
            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-medium"
            aria-expanded={open === i}
            onClick={() => setOpen(open === i ? null : i)}
          >
            {f.q}
            {open === i ? <Minus className="size-4 shrink-0 text-muted" /> : <Plus className="size-4 shrink-0 text-muted" />}
          </button>
          {open === i && <p className="px-5 pb-5 text-sm leading-relaxed text-muted">{f.a}</p>}
        </div>
      ))}
    </div>
  );
}
