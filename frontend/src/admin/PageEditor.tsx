import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Eye, ExternalLink, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { api, apiError, type ValidationErrors } from "../lib/api";
import type { CmsPage, Section, SectionType } from "../lib/types";
import { formatDate, slugify } from "../lib/markdown";
import { SectionRenderer } from "../site/Sections";
import { ListEditor, RowControls, move } from "./editors";
import { Alert, Badge, Button, Card, Field, FigLabel, Input, LoadingBlock, Select, Textarea, statusTone } from "../components/ui";

const SECTION_LABELS: Record<SectionType, string> = {
  hero: "Hero", rich_text: "Rich text (Markdown)", features: "Feature grid", stats: "Stats row", faq: "FAQ", cta: "Call to action",
};

const blankSection = (type: SectionType): Section => {
  switch (type) {
    case "hero": return { type, eyebrow: "", title: "New headline", subtitle: "" };
    case "rich_text": return { type, body: "## Heading\n\nWrite in **Markdown**." };
    case "features": return { type, title: "", items: [{ title: "Feature", body: "Description" }] };
    case "stats": return { type, items: [{ label: "Metric", value: "100" }] };
    case "faq": return { type, title: "Frequently asked questions", items: [{ q: "Question?", a: "Answer." }] };
    case "cta": return { type, title: "Ready to see it?", body: "", button_label: "Book a demo", button_url: "/contact" };
  }
};

type Form = { title: string; slug: string; status: CmsPage["status"]; seo: { title?: string; description?: string }; sections: Section[] };
type Version = { id: number; version: number; created_at: string };

export default function PageEditor() {
  const { id = "new" } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "page", id],
    queryFn: async () => (await api.get<{ data: CmsPage; versions: Version[] }>(`/admin/pages/${id}`)).data,
    enabled: !isNew,
  });

  const [form, setForm] = useState<Form>({ title: "", slug: "", status: "draft", seo: {}, sections: [blankSection("hero")] });
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [preview, setPreview] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({
        title: data.data.title,
        slug: data.data.slug,
        status: data.data.status,
        seo: data.data.latest_version?.seo ?? {},
        sections: data.data.latest_version?.content ?? [],
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, seo: form.seo };
      return isNew ? (await api.post("/admin/pages", payload)).data.data : (await api.put(`/admin/pages/${id}`, payload)).data.data;
    },
    onSuccess: (page: CmsPage) => {
      setErrors({}); setError(""); setSaved(true); setTimeout(() => setSaved(false), 2500);
      qc.invalidateQueries({ queryKey: ["admin", "pages"] });
      qc.invalidateQueries({ queryKey: ["admin", "page", String(page.id)] });
      qc.invalidateQueries({ queryKey: ["page"] });
      qc.invalidateQueries({ queryKey: ["site"] });
      if (isNew) navigate(`/admin/pages/${page.id}`, { replace: true });
    },
    onError: (err) => { const e = apiError(err); setErrors(e.errors); setError(e.message); },
  });

  const restore = useMutation({
    mutationFn: async (version: number) => (await api.post(`/admin/pages/${id}/versions/${version}/restore`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "page", id] }),
  });

  const remove = useMutation({
    mutationFn: async () => api.delete(`/admin/pages/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "pages"] }); navigate("/admin/pages"); },
  });

  if (!isNew && isLoading) return <LoadingBlock />;

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const setSection = (i: number, s: Section) => set("sections", form.sections.map((x, j) => (j === i ? s : x)));

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link to="/admin/pages" className="rounded-lg p-2 text-muted hover:bg-paper-2" aria-label="Back to pages"><ArrowLeft className="size-4" /></Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{isNew ? "New page" : form.title || "Untitled"}</h1>
            {!isNew && <p className="font-mono text-xs text-muted">/{form.slug} · v{data?.data.latest_version?.version ?? 1}</p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setPreview((p) => !p)}>{preview ? <><Pencil className="size-4" /> Edit</> : <><Eye className="size-4" /> Preview</>}</Button>
          {!isNew && form.status === "published" && <a href={`/${form.slug}`} target="_blank" rel="noreferrer"><Button variant="secondary"><ExternalLink className="size-4" /> Live</Button></a>}
          <Button onClick={() => save.mutate()} loading={save.isPending}>{saved ? "Saved ✓" : "Save"}</Button>
        </div>
      </div>

      {error && <div className="mb-4"><Alert>{error}</Alert></div>}

      {preview ? (
        <Card className="overflow-hidden bg-paper">
          <div className="border-b border-line bg-white px-4 py-2"><FigLabel>Preview — unsaved changes included</FigLabel></div>
          <SectionRenderer sections={form.sections} />
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-4">
            {form.sections.map((s, i) => (
              <Card key={i} className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2"><span className="font-mono text-[11px] text-muted">{String(i + 1).padStart(2, "0")}</span><span className="text-sm font-semibold">{SECTION_LABELS[s.type]}</span></span>
                  <RowControls
                    className="flex-row"
                    onUp={i > 0 ? () => set("sections", move(form.sections, i, i - 1)) : undefined}
                    onDown={i < form.sections.length - 1 ? () => set("sections", move(form.sections, i, i + 1)) : undefined}
                    onRemove={() => set("sections", form.sections.filter((_, j) => j !== i))}
                  />
                </div>
                <SectionFields section={s} onChange={(x) => setSection(i, x)} />
              </Card>
            ))}
            <AddSection onAdd={(t) => set("sections", [...form.sections, blankSection(t)])} />
            {errors.sections && <Alert>{errors.sections[0]}</Alert>}
          </div>

          <div className="space-y-4">
            <Card className="space-y-4 p-4">
              <Field label="Title" error={errors.title?.[0]}>
                <Input value={form.title} onChange={(e) => { set("title", e.target.value); if (!slugTouched) set("slug", slugify(e.target.value)); }} />
              </Field>
              <Field label="URL slug" error={errors.slug?.[0]} hint={<span className="font-mono">/{form.slug || "…"}</span>}>
                <Input value={form.slug} onChange={(e) => { setSlugTouched(true); set("slug", slugify(e.target.value)); }} className="font-mono" />
              </Field>
              <Field label="Status" error={errors.status?.[0]}>
                <Select value={form.status} onChange={(e) => set("status", e.target.value as Form["status"])}>
                  <option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option>
                </Select>
              </Field>
            </Card>
            <Card className="space-y-4 p-4">
              <FigLabel>SEO</FigLabel>
              <Field label="Meta title" error={errors["seo.title"]?.[0]}><Input value={form.seo.title ?? ""} onChange={(e) => set("seo", { ...form.seo, title: e.target.value })} /></Field>
              <Field label="Meta description" error={errors["seo.description"]?.[0]} hint={`${(form.seo.description ?? "").length}/300`}>
                <Textarea rows={3} value={form.seo.description ?? ""} onChange={(e) => set("seo", { ...form.seo, description: e.target.value })} />
              </Field>
            </Card>
            {!isNew && (
              <Card className="p-4">
                <FigLabel>Version history</FigLabel>
                <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto">
                  {data?.versions.map((v, idx) => (
                    <li key={v.id} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-paper-2">
                      <span><span className="font-mono text-xs">v{v.version}</span> <span className="text-xs text-muted">{formatDate(v.created_at, { dateStyle: "short", timeStyle: "short" })}</span></span>
                      {idx === 0 ? <Badge tone="green">current</Badge> : (
                        <button className="flex items-center gap-1 text-xs text-accent hover:underline" onClick={() => confirm(`Restore v${v.version} as a new version? Unsaved edits will be lost.`) && restore.mutate(v.version)}>
                          <RotateCcw className="size-3" /> Restore
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {!isNew && (
              <Button variant="ghost" className="w-full text-danger" onClick={() => confirm("Delete this page? It will be removed from the website.") && remove.mutate()} loading={remove.isPending}>
                <Trash2 className="size-4" /> Delete page
              </Button>
            )}
            {!isNew && <p className="text-center text-xs text-muted">Status: <Badge tone={statusTone(form.status)}>{form.status}</Badge></p>}
          </div>
        </div>
      )}
    </>
  );
}

function AddSection({ onAdd }: { onAdd: (t: SectionType) => void }) {
  return (
    <div className="rounded-xl border border-dashed border-line p-4">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted"><Plus className="size-3.5" /> Add a section</p>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(SECTION_LABELS) as SectionType[]).map((t) => (
          <Button key={t} type="button" size="sm" variant="secondary" onClick={() => onAdd(t)}>{SECTION_LABELS[t]}</Button>
        ))}
      </div>
    </div>
  );
}

function SectionFields({ section: s, onChange }: { section: Section; onChange: (s: Section) => void }) {
  const p = <T extends Section>(patch: Partial<T>) => onChange({ ...s, ...patch } as Section);
  switch (s.type) {
    case "hero":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Eyebrow"><Input value={s.eyebrow ?? ""} onChange={(e) => p({ eyebrow: e.target.value })} /></Field>
          <Field label="Title"><Input value={s.title} onChange={(e) => p({ title: e.target.value })} /></Field>
          <Field label="Subtitle" className="sm:col-span-2"><Textarea rows={2} value={s.subtitle ?? ""} onChange={(e) => p({ subtitle: e.target.value })} /></Field>
          <Field label="Button label"><Input value={s.button_label ?? ""} onChange={(e) => p({ button_label: e.target.value })} /></Field>
          <Field label="Button link"><Input value={s.button_url ?? ""} onChange={(e) => p({ button_url: e.target.value })} placeholder="/contact" /></Field>
        </div>
      );
    case "rich_text":
      return <Textarea rows={10} value={s.body} onChange={(e) => p({ body: e.target.value })} className="font-mono text-xs" />;
    case "features":
      return (
        <div className="space-y-3">
          <Field label="Section title"><Input value={s.title ?? ""} onChange={(e) => p({ title: e.target.value })} /></Field>
          <ListEditor items={s.items ?? []} onChange={(items) => p({ items })} blank={() => ({ title: "", body: "" })} addLabel="Add feature"
            render={(it, up) => (<><Input placeholder="Title" value={it.title} onChange={(e) => up({ title: e.target.value })} /><Textarea rows={2} placeholder="Description" value={it.body} onChange={(e) => up({ body: e.target.value })} /></>)} />
        </div>
      );
    case "stats":
      return (
        <ListEditor items={s.items ?? []} onChange={(items) => p({ items })} blank={() => ({ label: "", value: "" })} addLabel="Add stat" max={8}
          render={(it, up) => (<div className="grid grid-cols-2 gap-2"><Input placeholder="Value" value={it.value} onChange={(e) => up({ value: e.target.value })} /><Input placeholder="Label" value={it.label} onChange={(e) => up({ label: e.target.value })} /></div>)} />
      );
    case "faq":
      return (
        <div className="space-y-3">
          <Field label="Section title"><Input value={s.title ?? ""} onChange={(e) => p({ title: e.target.value })} /></Field>
          <ListEditor items={s.items ?? []} onChange={(items) => p({ items })} blank={() => ({ q: "", a: "" })} addLabel="Add question"
            render={(it, up) => (<><Input placeholder="Question" value={it.q} onChange={(e) => up({ q: e.target.value })} /><Textarea rows={2} placeholder="Answer" value={it.a} onChange={(e) => up({ a: e.target.value })} /></>)} />
        </div>
      );
    case "cta":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Title" className="sm:col-span-2"><Input value={s.title} onChange={(e) => p({ title: e.target.value })} /></Field>
          <Field label="Body" className="sm:col-span-2"><Textarea rows={2} value={s.body ?? ""} onChange={(e) => p({ body: e.target.value })} /></Field>
          <Field label="Button label"><Input value={s.button_label ?? ""} onChange={(e) => p({ button_label: e.target.value })} /></Field>
          <Field label="Button link"><Input value={s.button_url ?? ""} onChange={(e) => p({ button_url: e.target.value })} /></Field>
        </div>
      );
  }
}
