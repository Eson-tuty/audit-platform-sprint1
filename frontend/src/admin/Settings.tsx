import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiError, type ValidationErrors } from "../lib/api";
import type { Plan, SiteSettings } from "../lib/types";
import { ListEditor } from "./editors";
import { Alert, Button, Card, Field, Input, LoadingBlock, PageHeader, Textarea, cx } from "../components/ui";

const TABS = ["Brand & banner", "Home hero", "Stats & logos", "Pricing", "Contact & social"] as const;

export default function Settings() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: async () => (await api.get<{ data: SiteSettings }>("/admin/settings")).data.data,
  });
  const [s, setS] = useState<SiteSettings | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>(TABS[0]);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => { if (data) setS(data); }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const { pages: _ignored, ...rest } = s!;
      const lines = (xs: string[] | undefined) => (xs ?? []).map((x) => x.trim()).filter(Boolean);
      const payload = {
        ...rest,
        logos: lines(rest.logos),
        hero: { ...rest.hero, trust: lines(rest.hero.trust) },
        pricing: { ...rest.pricing, plans: rest.pricing.plans.map((p) => ({ ...p, features: lines(p.features) })) },
      };
      return (await api.put<{ data: SiteSettings }>("/admin/settings", payload)).data.data;
    },
    onSuccess: (d) => {
      setS(d); setErrors({}); setError(""); setSaved(true); setTimeout(() => setSaved(false), 2500);
      qc.setQueryData(["admin", "settings"], d);
      qc.invalidateQueries({ queryKey: ["site"] });
    },
    onError: (e) => { const x = apiError(e); setErrors(x.errors); setError(x.message); },
  });

  if (isLoading || !s) return <LoadingBlock />;

  const up = <K extends keyof SiteSettings>(k: K, patch: Partial<SiteSettings[K]>) => setS((prev) => prev && ({ ...prev, [k]: { ...(prev[k] as object), ...patch } }));
  const err = (k: string) => errors[k]?.[0];
  const tabHasError = (t: (typeof TABS)[number]) => {
    const prefixes: Record<string, string[]> = {
      "Brand & banner": ["brand", "banner", "footer"], "Home hero": ["hero"], "Stats & logos": ["stats", "logos"], Pricing: ["pricing"], "Contact & social": ["contact", "social"],
    };
    return Object.keys(errors).some((k) => prefixes[t].some((p) => k.startsWith(p)));
  };

  return (
    <>
      <PageHeader
        title="Site settings"
        description="Brand, announcement banner, home page copy and pricing."
        actions={<Button onClick={() => save.mutate()} loading={save.isPending}>{saved ? "Saved ✓" : "Save changes"}</Button>}
      />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}

      <div className="mb-5 flex flex-wrap gap-1 border-b border-line">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cx("-mb-px border-b-2 px-3 py-2 text-sm", tab === t ? "border-ink font-medium text-ink" : "border-transparent text-muted hover:text-ink", tabHasError(t) && "text-danger")}>
            {t}{tabHasError(t) && " •"}
          </button>
        ))}
      </div>

      {tab === "Brand & banner" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Group title="Brand">
            <Field label="Brand name" error={err("brand.name")}><Input value={s.brand.name} onChange={(e) => up("brand", { name: e.target.value })} /></Field>
            <Field label="Tagline" error={err("brand.tagline")}><Input value={s.brand.tagline ?? ""} onChange={(e) => up("brand", { tagline: e.target.value })} /></Field>
            <Field label="Footer note" error={err("footer.note")}><Input value={s.footer.note ?? ""} onChange={(e) => up("footer", { note: e.target.value })} /></Field>
          </Group>
          <Group title="Announcement banner">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.banner.enabled} onChange={(e) => up("banner", { enabled: e.target.checked })} className="accent-[var(--color-accent)]" /> Show banner above the header</label>
            <Field label="Text" error={err("banner.text")}><Input value={s.banner.text ?? ""} onChange={(e) => up("banner", { text: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Link label"><Input value={s.banner.link_label ?? ""} onChange={(e) => up("banner", { link_label: e.target.value })} /></Field>
              <Field label="Link URL" error={err("banner.link_url")}><Input value={s.banner.link_url ?? ""} onChange={(e) => up("banner", { link_url: e.target.value })} /></Field>
            </div>
          </Group>
        </div>
      )}

      {tab === "Home hero" && (
        <Group title="Hero">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Eyebrow"><Input value={s.hero.eyebrow ?? ""} onChange={(e) => up("hero", { eyebrow: e.target.value })} /></Field>
            <div />
            <Field label="Title" error={err("hero.title")}><Input value={s.hero.title} onChange={(e) => up("hero", { title: e.target.value })} /></Field>
            <Field label="Title accent (italic line)"><Input value={s.hero.title_accent ?? ""} onChange={(e) => up("hero", { title_accent: e.target.value })} /></Field>
            <Field label="Subtitle" className="sm:col-span-2" error={err("hero.subtitle")}><Textarea rows={3} value={s.hero.subtitle ?? ""} onChange={(e) => up("hero", { subtitle: e.target.value })} /></Field>
            <Field label="Primary button label"><Input value={s.hero.cta_label ?? ""} onChange={(e) => up("hero", { cta_label: e.target.value })} /></Field>
            <Field label="Primary button link"><Input value={s.hero.cta_url ?? ""} onChange={(e) => up("hero", { cta_url: e.target.value })} /></Field>
            <Field label="Secondary button label"><Input value={s.hero.secondary_label ?? ""} onChange={(e) => up("hero", { secondary_label: e.target.value })} /></Field>
            <Field label="Secondary button link"><Input value={s.hero.secondary_url ?? ""} onChange={(e) => up("hero", { secondary_url: e.target.value })} /></Field>
          </div>
          <Field label="Trust points (one per line)">
            <Textarea rows={4} value={(s.hero.trust ?? []).join("\n")} onChange={(e) => up("hero", { trust: e.target.value.split("\n") })} />
          </Field>
        </Group>
      )}

      {tab === "Stats & logos" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Group title="Stats row">
            <ListEditor items={s.stats} onChange={(stats) => setS({ ...s, stats })} blank={() => ({ label: "", value: "" })} addLabel="Add stat" max={8}
              render={(it, u) => (<div className="grid grid-cols-[100px_1fr] gap-2"><Input placeholder="Value" value={it.value} onChange={(e) => u({ value: e.target.value })} /><Input placeholder="Label" value={it.label} onChange={(e) => u({ label: e.target.value })} /></div>)} />
          </Group>
          <Group title="Customer logos (names)">
            <Textarea rows={10} value={(s.logos ?? []).join("\n")} onChange={(e) => setS({ ...s, logos: e.target.value.split("\n") })} />
            <p className="text-xs text-muted">One name per line. Shown in the scrolling “trusted by” strip. Only list customers who agreed to be named.</p>
          </Group>
        </div>
      )}

      {tab === "Pricing" && (
        <Group title="Plans">
          <Field label="Currency symbol"><Input value={s.pricing.currency ?? ""} onChange={(e) => up("pricing", { currency: e.target.value })} className="w-24" /></Field>
          <ListEditor<Plan>
            items={s.pricing.plans}
            onChange={(plans) => up("pricing", { plans })}
            blank={() => ({ name: "New plan", price: "0", period: "", description: "", features: [], cta_label: "Get started", highlighted: false })}
            addLabel="Add plan"
            max={6}
            render={(p, u, i) => (
              <div className="grid gap-2 sm:grid-cols-3">
                <Input placeholder="Name" value={p.name} onChange={(e) => u({ name: e.target.value })} />
                <Input placeholder="Price (e.g. 30,000 or Custom)" value={p.price} onChange={(e) => u({ price: e.target.value })} />
                <Input placeholder="Period" value={p.period ?? ""} onChange={(e) => u({ period: e.target.value })} />
                <Textarea rows={2} placeholder="Description" value={p.description ?? ""} onChange={(e) => u({ description: e.target.value })} className="sm:col-span-3" />
                <Textarea rows={4} placeholder="Features — one per line" value={(p.features ?? []).join("\n")} onChange={(e) => u({ features: e.target.value.split("\n") })} className="sm:col-span-2" />
                <div className="space-y-2">
                  <Input placeholder="Button label" value={p.cta_label ?? ""} onChange={(e) => u({ cta_label: e.target.value })} />
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!p.highlighted} onChange={(e) => u({ highlighted: e.target.checked })} className="accent-[var(--color-accent)]" /> Highlight</label>
                </div>
                {Object.keys(errors).filter((k) => k.startsWith(`pricing.plans.${i}.`)).map((k) => <p key={k} className="text-xs text-danger sm:col-span-3">{errors[k][0]}</p>)}
              </div>
            )}
          />
        </Group>
      )}

      {tab === "Contact & social" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Group title="Contact details">
            <Field label="Email" error={err("contact.email")}><Input type="email" value={s.contact.email ?? ""} onChange={(e) => up("contact", { email: e.target.value })} /></Field>
            <Field label="Phone"><Input value={s.contact.phone ?? ""} onChange={(e) => up("contact", { phone: e.target.value })} /></Field>
            <Field label="Address"><Input value={s.contact.address ?? ""} onChange={(e) => up("contact", { address: e.target.value })} /></Field>
          </Group>
          <Group title="Social links">
            <Field label="LinkedIn URL" error={err("social.linkedin")}><Input value={s.social.linkedin ?? ""} onChange={(e) => up("social", { linkedin: e.target.value })} placeholder="https://" /></Field>
            <Field label="X URL" error={err("social.x")}><Input value={s.social.x ?? ""} onChange={(e) => up("social", { x: e.target.value })} placeholder="https://" /></Field>
            <Field label="YouTube URL" error={err("social.youtube")}><Input value={s.social.youtube ?? ""} onChange={(e) => up("social", { youtube: e.target.value })} placeholder="https://" /></Field>
          </Group>
        </div>
      )}
    </>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="space-y-4 p-5">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </Card>
  );
}
