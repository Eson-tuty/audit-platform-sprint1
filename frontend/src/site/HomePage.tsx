import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Check, FileSpreadsheet, Landmark, Receipt, Users, FolderArchive, Cpu,
  FileText, ShieldCheck, ClipboardList, Scale, Sigma, MessageSquareText, ListChecks, FileCheck2, Search,
} from "lucide-react";
import { useSite, useUniversity, useDocumentTitle } from "./useSite";
import { safeHref } from "../lib/markdown";
import { cx, FigLabel } from "../components/ui";

export default function HomePage() {
  const { data: site } = useSite();
  useDocumentTitle(site?.brand.tagline ?? "Audit workflow software");

  if (!site) return <div className="h-[80vh]" />;

  return (
    <>
      <Hero site={site} />
      <Logos logos={site.logos} />
      <Workflow />
      <SourcesEngine />
      <Features />
      <Collaboration />
      <Stats stats={site.stats} />
      <Pricing site={site} />
      <UniversityTeaser />
      <FinalCta site={site} />
    </>
  );
}

type Site = NonNullable<ReturnType<typeof useSite>["data"]>;

function SectionHead({ fig, title, body, className }: { fig: string; title: string; body?: string; className?: string }) {
  return (
    <div className={cx("max-w-2xl", className)}>
      <FigLabel>{fig}</FigLabel>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</h2>
      {body && <p className="mt-4 text-lg text-muted text-pretty">{body}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ hero */
function Hero({ site }: { site: Site }) {
  const h = site.hero;
  return (
    <section className="relative overflow-hidden border-b border-line">
      <div className="mx-auto grid max-w-7xl gap-14 px-4 pt-16 pb-20 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:pt-24">
        <div>
          {h.eyebrow && (
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1 text-xs text-ink-2">
              <span className="size-1.5 rounded-full bg-accent" /> {h.eyebrow}
            </span>
          )}
          <h1 className="mt-6 text-5xl leading-[1.04] font-semibold tracking-tight text-balance sm:text-6xl">
            {h.title}
            {h.title_accent && <span className="mt-1 block font-serif font-normal italic text-accent">{h.title_accent}</span>}
          </h1>
          {h.subtitle && <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">{h.subtitle}</p>}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={safeHref(h.cta_url, "/contact")} className="inline-flex h-12 items-center gap-2 rounded-lg bg-ink px-6 font-medium text-paper hover:bg-ink-2">
              {h.cta_label || "Book a demo"} <ArrowRight className="size-4" />
            </Link>
            {h.secondary_label && (
              <Link to={safeHref(h.secondary_url, "/university")} className="inline-flex h-12 items-center rounded-lg border border-line bg-white px-6 font-medium hover:bg-paper-2">
                {h.secondary_label}
              </Link>
            )}
          </div>
          {h.trust?.length > 0 && (
            <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-muted">
              {h.trust.map((t) => (
                <li key={t} className="flex items-center gap-1.5"><Check className="size-3.5 text-accent" /> {t}</li>
              ))}
            </ul>
          )}
        </div>
        <EngagementFigure />
      </div>
    </section>
  );
}

function EngagementFigure() {
  const rows = [
    ["WP-A1", "Bank reconciliation", "Reviewed", "green"],
    ["WP-B4", "Revenue cut-off testing", "In review", "amber"],
    ["WP-C2", "Fixed asset additions", "Prepared", "blue"],
    ["WP-D7", "Journal entry testing", "3 flags", "red"],
    ["WP-E1", "GST input credit recon", "Reviewed", "green"],
  ] as const;
  const tone = { green: "bg-accent-soft text-accent-2", amber: "bg-amber-soft text-amber", blue: "bg-info-soft text-info", red: "bg-danger-soft text-danger" };
  return (
    <figure className="relative">
      <div className="grid-paper absolute -inset-6 -z-10 rounded-3xl opacity-70" />
      <div className="rounded-2xl border border-line bg-white shadow-[0_24px_60px_-30px_rgba(20,22,26,0.35)]">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <div>
            <p className="text-sm font-semibold">FY 2025–26 · Statutory audit</p>
            <p className="font-mono text-[11px] text-muted">Example Manufacturing Pvt Ltd</p>
          </div>
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-accent">
            <span className="size-1.5 animate-pulse rounded-full bg-accent" /> live
          </span>
        </div>
        <div className="grid grid-cols-3 divide-x divide-line border-b border-line">
          {[["Materiality", "₹42.6L"], ["Papers filed", "38 / 61"], ["Open review notes", "7"]].map(([k, v]) => (
            <div key={k} className="px-5 py-4">
              <p className="text-[11px] text-muted">{k}</p>
              <p className="mt-1 font-mono text-lg font-medium">{v}</p>
            </div>
          ))}
        </div>
        <ul className="divide-y divide-line">
          {rows.map(([ref, name, status, t]) => (
            <li key={ref} className="flex items-center gap-3 px-5 py-3 text-sm">
              <span className="w-14 font-mono text-[11px] text-muted">{ref}</span>
              <span className="flex-1 truncate">{name}</span>
              <span className={cx("rounded-full px-2 py-0.5 text-[11px] font-medium", tone[t])}>{status}</span>
            </li>
          ))}
        </ul>
        <div className="px-5 py-3">
          <div className="flex justify-between text-[11px] text-muted"><span>Engagement progress</span><span className="font-mono">62%</span></div>
          <div className="mt-1.5 h-1.5 rounded-full bg-paper-2"><div className="h-full w-[62%] rounded-full bg-accent" /></div>
        </div>
      </div>
      <figcaption className="mt-3 text-right"><FigLabel>fig. 01 · illustrative engagement — not client data</FigLabel></figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------ logos */
function Logos({ logos }: { logos: string[] }) {
  if (!logos?.length) return null;
  const doubled = [...logos, ...logos];
  return (
    <section className="border-b border-line py-10">
      <p className="text-center text-sm text-muted">Trusted by audit, risk & compliance teams</p>
      <div className="relative mt-6 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
        <div className="marquee flex w-max gap-14 pr-14">
          {doubled.map((l, i) => (
            <span key={i} className="font-serif text-2xl whitespace-nowrap text-ink/45">{l}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- workflow */
const stages = [
  { n: "01", t: "Ingest", d: "Trial balance, ledgers and bank data mapped in minutes." },
  { n: "02", t: "Plan", d: "Materiality, risk assessment and audit programme drafted." },
  { n: "03", t: "Risk & controls", d: "RCM built, walkthroughs documented, key controls flagged." },
  { n: "04", t: "Fieldwork", d: "Samples drawn, evidence requested, tests recorded." },
  { n: "05", t: "Review", d: "Layered review notes, sign-offs and clearance." },
  { n: "06", t: "Findings", d: "Exceptions rolled up into rated observations." },
  { n: "07", t: "Report", d: "Draft report, management responses and final opinion." },
];

function Workflow() {
  const [active, setActive] = useState(3);
  return (
    <section id="product" className="scroll-mt-20 border-b border-line">
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <SectionHead fig="fig. 02 · engagement lifecycle" title="From trial balance to signed report." body="Seven stages, one file. Every working paper knows where it came from and what depends on it." />
        <div className="mt-12 overflow-x-auto pb-2">
          <ol className="grid min-w-[880px] grid-cols-7 gap-2">
            {stages.map((s, i) => (
              <li key={s.n}>
                <button
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onClick={() => setActive(i)}
                  className={cx(
                    "group h-full w-full rounded-xl border p-4 text-left transition-colors",
                    i === active ? "border-ink bg-ink text-paper" : i < active ? "border-accent/30 bg-accent-soft" : "border-line bg-white hover:border-ink/30",
                  )}
                >
                  <span className={cx("font-mono text-[11px]", i === active ? "text-paper/60" : "text-muted")}>{s.n}</span>
                  <p className="mt-6 font-semibold">{s.t}</p>
                  <p className={cx("mt-2 text-xs leading-relaxed", i === active ? "text-paper/75" : "text-muted")}>{s.d}</p>
                </button>
              </li>
            ))}
          </ol>
          <div className="mt-3 grid min-w-[880px] grid-cols-7 gap-2">
            {stages.map((s, i) => (
              <div key={s.n} className={cx("h-1 rounded-full", i <= active ? "bg-accent" : "bg-line")} />
            ))}
          </div>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            [Users, "Collaboration track", "Client portal, evidence requests and team hand-offs run alongside every stage."],
            [ShieldCheck, "Review & control track", "Reviewer sign-offs, partner clearance and an immutable audit trail."],
            [FolderArchive, "Archive track", "Assembled file locked at sign-off with retention rules applied."],
          ].map(([Icon, t, d]) => {
            const I = Icon as typeof Users;
            return (
              <div key={t as string} className="flex gap-4 rounded-xl border border-line bg-white p-5">
                <I className="size-5 shrink-0 text-accent" />
                <div><p className="font-medium">{t as string}</p><p className="mt-1 text-sm text-muted">{d as string}</p></div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------- sources/engine */
function SourcesEngine() {
  const inputs = [[Landmark, "Ledger & trial balance"], [Receipt, "Bank statements"], [FileSpreadsheet, "Tax portal data"], [Users, "Payroll registers"], [FolderArchive, "Evidence & contracts"]] as const;
  const outputs = [[FileText, "Financial statements"], [ClipboardList, "Working-paper file"], [Scale, "Tax reconciliations"], [ListChecks, "Review schedules"], [FileCheck2, "Audit report & opinion"]] as const;
  return (
    <section className="border-b border-line bg-ink text-paper">
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="max-w-2xl">
          <FigLabel className="text-paper/50">fig. 03 · data flow</FigLabel>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Every source in. <span className="font-serif font-normal italic text-[#9fd6c4]">The actual paper out.</span></h2>
          <p className="mt-4 text-lg text-paper/65">Connect the sources you already use. The engine reconciles, cross-references and files the papers your reviewers expect to see.</p>
        </div>
        <div className="mt-14 grid items-center gap-6 lg:grid-cols-[1fr_auto_1fr]">
          <ul className="space-y-2">
            {inputs.map(([I, t]) => (
              <li key={t} className="flex items-center gap-3 rounded-lg border border-paper/10 bg-paper/5 px-4 py-3 text-sm"><I className="size-4 text-paper/60" /> {t}</li>
            ))}
          </ul>
          <div className="mx-auto flex size-44 flex-col items-center justify-center rounded-full border border-[#9fd6c4]/40 bg-[#9fd6c4]/10 text-center">
            <Cpu className="size-7 text-[#9fd6c4]" />
            <p className="mt-2 font-semibold">Audit engine</p>
            <p className="mt-1 px-6 font-mono text-[10px] leading-snug text-paper/55">reconcile · cross-ref · sample · flag</p>
          </div>
          <ul className="space-y-2">
            {outputs.map(([I, t]) => (
              <li key={t} className="flex items-center gap-3 rounded-lg border border-[#9fd6c4]/25 bg-[#9fd6c4]/10 px-4 py-3 text-sm"><I className="size-4 text-[#9fd6c4]" /> {t}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- features */
const features = [
  [ClipboardList, "Working papers, cross-referenced", "60+ templates across the lifecycle. Change a figure and every paper that relies on it updates."],
  [Sigma, "Materiality & sampling", "Benchmarks, performance materiality and statistically defensible sample sizes, documented automatically."],
  [Search, "Journal entry testing", "Weekend postings, round sums, unusual users and back-dated entries flagged for follow-up."],
  [MessageSquareText, "Review notes that close", "Notes stay attached to the cell they're about, with owner, status and clearance trail."],
  [Users, "Client evidence portal", "Clients upload against a request list. No email threads, no lost attachments."],
  [FileCheck2, "Reports from the file", "Observations, management responses and the opinion assemble from what's already in the file."],
] as const;

function Features() {
  return (
    <section id="features" className="scroll-mt-20 border-b border-line">
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <SectionHead fig="fig. 04 · modules" title="So many moving parts — cross-referenced automatically." />
        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {features.map(([I, t, d], i) => (
            <div key={t} className="bg-white p-7">
              <div className="flex items-center justify-between">
                <I className="size-5 text-accent" />
                <FigLabel>{String(i + 1).padStart(2, "0")}</FigLabel>
              </div>
              <h3 className="mt-6 font-semibold">{t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- collaboration */
const relay = [
  { who: "Preparer", what: "Raises F-031: 2 of 25 vendor changes lack secondary approval.", t: "Mon 10:12" },
  { who: "Reviewer", what: "Confirms exception, rates it Medium, asks for root cause.", t: "Mon 15:40" },
  { who: "Partner", what: "Clears wording for the management letter.", t: "Tue 09:05" },
  { who: "Client", what: "Responds: dual approval enforced in ERP from 1 Dec.", t: "Wed 11:30" },
];

function Collaboration() {
  return (
    <section className="border-b border-line">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:items-center">
        <SectionHead fig="fig. 05 · one record" title="Preparer to partner to client. One file, no email." body="Every finding carries its own thread — who raised it, who reviewed it, what the client said — so the report writes itself from the record." />
        <ol className="relative space-y-3 before:absolute before:top-4 before:bottom-4 before:left-[19px] before:w-px before:bg-line">
          {relay.map((r, i) => (
            <li key={r.who} className="relative flex gap-4">
              <span className={cx("z-10 grid size-10 shrink-0 place-items-center rounded-full border font-mono text-xs", i === relay.length - 1 ? "border-accent bg-accent text-white" : "border-line bg-white")}>{i + 1}</span>
              <div className="flex-1 rounded-xl border border-line bg-white p-4">
                <div className="flex items-center justify-between"><p className="text-sm font-semibold">{r.who}</p><span className="font-mono text-[11px] text-muted">{r.t}</span></div>
                <p className="mt-1 text-sm text-muted">{r.what}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ stats */
function Stats({ stats }: { stats: Site["stats"] }) {
  if (!stats?.length) return null;
  return (
    <section className="border-b border-line bg-paper-2/60">
      <dl className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-14 sm:px-6 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label}>
            <dd className="font-serif text-5xl">{s.value}</dd>
            <dt className="mt-1 text-sm text-muted">{s.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ---------------------------------------------------------------- pricing */
function Pricing({ site }: { site: Site }) {
  const plans = site.pricing.plans ?? [];
  if (!plans.length) return null;
  const cur = site.pricing.currency ?? "";
  return (
    <section id="pricing" className="scroll-mt-20 border-b border-line">
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <SectionHead fig="fig. 06 · pricing" title="Priced per engagement. Seats are free." body="No per-user licences and no trial clock. Start with one live engagement on us." />
        <div className={cx("mt-12 grid gap-4", plans.length >= 3 ? "lg:grid-cols-3" : "md:grid-cols-2")}>
          {plans.map((p) => {
            const numeric = /^[\d,.]+$/.test(p.price);
            return (
              <div key={p.name} className={cx("flex flex-col rounded-2xl border p-7", p.highlighted ? "border-ink bg-ink text-paper" : "border-line bg-white")}>
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{p.name}</p>
                  {p.highlighted && <span className="rounded-full bg-[#9fd6c4] px-2 py-0.5 text-[11px] font-medium text-ink">Most popular</span>}
                </div>
                <p className="mt-6 flex items-baseline gap-1">
                  {numeric && <span className={cx("text-xl", p.highlighted ? "text-paper/70" : "text-muted")}>{cur}</span>}
                  <span className="font-serif text-5xl">{p.price}</span>
                </p>
                {p.period && <p className={cx("mt-1 font-mono text-xs", p.highlighted ? "text-paper/60" : "text-muted")}>{p.period}</p>}
                {p.description && <p className={cx("mt-4 text-sm", p.highlighted ? "text-paper/75" : "text-muted")}>{p.description}</p>}
                <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                  {(p.features ?? []).map((f) => (
                    <li key={f} className="flex gap-2"><Check className={cx("mt-0.5 size-4 shrink-0", p.highlighted ? "text-[#9fd6c4]" : "text-accent")} /> {f}</li>
                  ))}
                </ul>
                <Link
                  to={`/contact?plan=${encodeURIComponent(p.name)}`}
                  className={cx("mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-medium", p.highlighted ? "bg-paper text-ink hover:bg-white" : "border border-line hover:bg-paper-2")}
                >
                  {p.cta_label || "Get started"} <ArrowRight className="size-4" />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------- university tease */
function UniversityTeaser() {
  const { data } = useUniversity();
  const items = (data ?? []).slice(0, 3);
  if (!items.length) return null;
  return (
    <section className="border-b border-line">
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <SectionHead fig="fig. 07 · university" title="Free tools for working auditors." body="Trackers, calculators, templates and checklists — no sign-up required." />
          <Link to="/university" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">Browse all resources <ArrowRight className="size-4" /></Link>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {items.map((r) => (
            <Link key={r.slug} to={`/university/${r.slug}`} className="group flex flex-col rounded-xl border border-line bg-white p-6 transition-colors hover:border-ink/40">
              <FigLabel>{r.category} · {r.type}</FigLabel>
              <h3 className="mt-3 font-semibold group-hover:text-accent">{r.title}</h3>
              <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted">{r.summary}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium">{r.type === "tool" ? "Open tool" : "Read"} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" /></span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- final cta */
function FinalCta({ site }: { site: Site }) {
  return (
    <section className="px-4 py-20 sm:px-6">
      <div className="grid-paper mx-auto max-w-5xl rounded-3xl border border-line bg-white px-6 py-16 text-center">
        <FigLabel>your first engagement, on us</FigLabel>
        <h2 className="mt-4 font-serif text-5xl text-balance">Run one live audit before you pay.</h2>
        <p className="mx-auto mt-4 max-w-xl text-muted">Bring a trial balance. We'll set up the engagement with you and you keep every working paper.</p>
        <Link to={safeHref(site.hero.cta_url, "/contact")} className="mt-8 inline-flex h-12 items-center gap-2 rounded-lg bg-ink px-6 font-medium text-paper hover:bg-ink-2">
          {site.hero.cta_label || "Book a demo"} <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}
