import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { ArrowRight, Menu, X } from "lucide-react";
import { useSite } from "./useSite";
import { safeHref } from "../lib/markdown";
import { cx } from "../components/ui";

const BANNER_KEY = "site.banner.dismissed";

export function Logo({ name }: { name: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="grid size-7 place-items-center rounded-md bg-ink font-serif text-lg italic leading-none text-paper">{name.charAt(0)}</span>
      <span className="text-[17px] font-semibold tracking-tight">{name}</span>
    </span>
  );
}

const nav = [
  { to: "/#product", label: "Product" },
  { to: "/university", label: "University" },
  { to: "/#pricing", label: "Pricing" },
  { to: "/security", label: "Security" },
  { to: "/about", label: "Company" },
];

export default function SiteLayout() {
  const { data: site } = useSite();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [bannerHidden, setBannerHidden] = useState(() => {
    try { return sessionStorage.getItem(BANNER_KEY) === "1"; } catch { return false; }
  });

  useEffect(() => setMenuOpen(false), [location.pathname, location.hash]);

  const brand = site?.brand.name ?? "Auditline";
  const showBanner = site?.banner.enabled && site.banner.text && !bannerHidden;

  return (
    <div className="flex min-h-screen flex-col">
      {showBanner && (
        <div className="no-print relative bg-ink px-10 py-2 text-center text-[13px] text-paper/90">
          <span>{site!.banner.text}</span>
          {site!.banner.link_url && (
            <Link to={safeHref(site!.banner.link_url)} className="ml-2 font-medium text-white underline underline-offset-4">
              {site!.banner.link_label || "Learn more"} →
            </Link>
          )}
          <button
            aria-label="Dismiss announcement"
            className="absolute top-1/2 right-3 -translate-y-1/2 rounded p-1 text-paper/60 hover:text-paper"
            onClick={() => { setBannerHidden(true); try { sessionStorage.setItem(BANNER_KEY, "1"); } catch { /* ignore */ } }}
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      <header className="no-print sticky top-0 z-40 border-b border-line/70 bg-paper/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" aria-label={`${brand} home`}><Logo name={brand} /></Link>
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} className="rounded-md px-3 py-2 text-sm text-ink-2 hover:bg-paper-2 hover:text-ink">
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <Link to="/admin/login" className="rounded-md px-3 py-2 text-sm text-ink-2 hover:text-ink">Log in</Link>
            <Link to={safeHref(site?.hero.cta_url, "/contact")} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ink px-4 text-sm font-medium text-paper hover:bg-ink-2">
              {site?.hero.cta_label ?? "Book a demo"} <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <button className="rounded-md p-2 md:hidden" aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}>
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
        {menuOpen && (
          <div className="border-t border-line bg-paper px-4 pb-4 md:hidden">
            {nav.map((n) => (
              <Link key={n.to} to={n.to} className="block border-b border-line/60 py-3 text-sm">{n.label}</Link>
            ))}
            <div className="mt-4 flex gap-2">
              <Link to="/admin/login" className="flex-1 rounded-lg border border-line py-2.5 text-center text-sm">Log in</Link>
              <Link to="/contact" className="flex-1 rounded-lg bg-ink py-2.5 text-center text-sm text-paper">Book a demo</Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1"><Outlet /></main>

      <footer className="no-print border-t border-line bg-paper-2/60">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <Logo name={brand} />
            <p className="mt-3 max-w-xs text-sm text-muted">{site?.footer.note}</p>
            {site?.contact.email && <a href={`mailto:${site.contact.email}`} className="mt-4 block text-sm text-ink-2 hover:text-accent">{site.contact.email}</a>}
            {site?.contact.address && <p className="mt-1 text-sm text-muted">{site.contact.address}</p>}
          </div>
          <FooterCol title="Product" links={[["Workflow", "/#product"], ["Features", "/#features"], ["Pricing", "/#pricing"], ["Security", "/security"]]} />
          <FooterCol title="University" links={[["All resources", "/university"], ["Fieldwork tracker", "/university/internal-audit-fieldwork-testing-tracker"], ["Sample size calculator", "/university/audit-sample-size-calculator"], ["Materiality calculator", "/university/materiality-calculator"]]} />
          <FooterCol title="Company" links={[["About", "/about"], ["Contact", "/contact"], ["Book a demo", "/contact"]]} />
          <FooterCol title="Legal" links={[["Privacy", "/privacy"], ["Terms", "/terms"]]} />
        </div>
        <div className="mx-auto flex max-w-7xl flex-col gap-2 border-t border-line px-4 py-6 text-xs text-muted sm:flex-row sm:justify-between sm:px-6">
          <span>© {new Date().getFullYear()} {brand}. All rights reserved.</span>
          <span className="flex gap-4">
            {site?.social.linkedin && <a href={safeHref(site.social.linkedin)} target="_blank" rel="noreferrer" className="hover:text-ink">LinkedIn</a>}
            {site?.social.x && <a href={safeHref(site.social.x)} target="_blank" rel="noreferrer" className="hover:text-ink">X</a>}
            {site?.social.youtube && <a href={safeHref(site.social.youtube)} target="_blank" rel="noreferrer" className="hover:text-ink">YouTube</a>}
            <span className="font-mono">v1 · in-region hosting</span>
          </span>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted">{title}</p>
      <ul className="mt-3 space-y-2">
        {links.map(([label, to]) => (
          <li key={label}><Link to={to} className={cx("text-sm text-ink-2 hover:text-accent")}>{label}</Link></li>
        ))}
      </ul>
    </div>
  );
}
