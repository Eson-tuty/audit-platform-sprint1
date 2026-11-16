import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Briefcase, ExternalLink, FileText, GraduationCap, History, Inbox, LayoutDashboard, LogOut, Menu, Settings, Users, X } from "lucide-react";
import { useCan, useLogout, useMe } from "./auth";
import { useSite } from "../site/useSite";
import { cx } from "../components/ui";

const items = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/pages", label: "Pages", icon: FileText, perm: "cms.pages.manage" },
  { to: "/admin/university", label: "University", icon: GraduationCap, perm: "cms.university.manage" },
  { to: "/admin/leads", label: "Leads", icon: Inbox, perm: "cms.leads.manage" },
  { to: "/admin/settings", label: "Site settings", icon: Settings, perm: "cms.settings.manage" },
  { to: "/admin/users", label: "Users & roles", icon: Users, perm: "users.manage" },
  { to: "/admin/audit-log", label: "Audit log", icon: History, perm: "audit_logs.view" },
];

export default function AdminLayout() {
  const { data: me } = useMe();
  const { data: site } = useSite();
  const can = useCan();
  const logout = useLogout();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => { document.title = `Admin — ${site?.brand.name ?? ""}`; }, [site?.brand.name]);

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 p-3">
      {items.filter((i) => !i.perm || can(i.perm)).map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => cx("flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm", isActive ? "bg-ink text-paper" : "text-ink-2 hover:bg-paper-2")}
        >
          <Icon className="size-4" /> {label}
        </NavLink>
      ))}
      <div className="mt-auto border-t border-line pt-3">
        {can("audit.view|audit.test|audit.manage") && (
          <Link to="/app" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-2 hover:bg-paper-2">
            <Briefcase className="size-4" /> Audit workspace
          </Link>
        )}
        <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-2 hover:bg-paper-2">
          <ExternalLink className="size-4" /> View website
        </a>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-paper lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-white lg:flex">
        <Brand name={site?.brand.name} tenant={me?.tenant.name} />
        {nav}
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 bg-ink/30 lg:hidden" onClick={() => setOpen(false)}>
          <aside className="flex h-full w-64 flex-col bg-white" onClick={(e) => e.stopPropagation()}>
            <Brand name={site?.brand.name} tenant={me?.tenant.name} />
            {nav}
          </aside>
        </div>
      )}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-paper/90 px-4 backdrop-blur sm:px-6">
          <button className="rounded p-1.5 lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">{open ? <X className="size-5" /> : <Menu className="size-5" />}</button>
          <span className="hidden font-mono text-[11px] tracking-wider text-muted uppercase lg:block">{me?.tenant.name}</span>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm leading-tight font-medium">{me?.user.name}</p>
              <p className="text-[11px] leading-tight text-muted">{me?.roles.join(", ")}</p>
            </div>
            <span className="grid size-8 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent-2">
              {me?.user.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
            </span>
            <button onClick={logout} className="rounded-lg p-2 text-muted hover:bg-paper-2 hover:text-ink" aria-label="Sign out" title="Sign out"><LogOut className="size-4" /></button>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Brand({ name, tenant }: { name?: string; tenant?: string }) {
  return (
    <Link to="/admin" className="flex items-center gap-2 border-b border-line px-5 py-4">
      <span className="grid size-7 place-items-center rounded-md bg-ink font-serif text-lg italic text-paper">{(name ?? "A").charAt(0)}</span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold">{name ?? "Admin"}</span>
        <span className="block text-[11px] text-muted">{tenant ?? "Admin panel"}</span>
      </span>
    </Link>
  );
}
