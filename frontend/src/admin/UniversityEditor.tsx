import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Trash2 } from "lucide-react";
import { api, apiError, type ValidationErrors } from "../lib/api";
import type { UniversityResource } from "../lib/types";
import { renderMarkdown, slugify } from "../lib/markdown";
import { ListEditor } from "./editors";
import type { UniversityMeta } from "./UniversityList";
import { Alert, Button, Card, Field, FigLabel, Input, LoadingBlock, Select, Textarea, cx } from "../components/ui";

type Form = Required<Pick<UniversityResource, "title" | "slug" | "category" | "type" | "status">> & {
  tool_key: string;
  summary: string;
  body: string;
  faqs: { q: string; a: string }[];
  sources: { label: string; url?: string }[];
  seo: { title?: string; description?: string };
  sort_order: number;
  reviewed_at: string;
};

const empty: Form = {
  title: "", slug: "", category: "", type: "guide", status: "draft", tool_key: "", summary: "", body: "",
  faqs: [], sources: [], seo: {}, sort_order: 0, reviewed_at: new Date().toISOString().slice(0, 10),
};

export default function UniversityEditor() {
  const { id = "new" } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: meta } = useQuery({
    queryKey: ["admin", "university", "meta"],
    queryFn: async () => (await api.get<{ meta: UniversityMeta }>("/admin/university")).data.meta,
  });
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "university-item", id],
    queryFn: async () => (await api.get<{ data: UniversityResource }>(`/admin/university/${id}`)).data.data,
    enabled: !isNew,
  });

  const [form, setForm] = useState<Form>(empty);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({
        title: data.title, slug: data.slug, category: data.category, type: data.type, status: data.status ?? "draft",
        tool_key: data.tool_key ?? "", summary: data.summary ?? "", body: data.body ?? "", faqs: data.faqs ?? [],
        sources: data.sources ?? [], seo: data.seo ?? {}, sort_order: data.sort_order ?? 0, reviewed_at: data.reviewed_at ?? "",
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, tool_key: form.tool_key || null, reviewed_at: form.reviewed_at || null };
      return isNew ? (await api.post("/admin/university", payload)).data.data : (await api.put(`/admin/university/${id}`, payload)).data.data;
    },
    onSuccess: (r: UniversityResource) => {
      setErrors({}); setError(""); setSaved(true); setTimeout(() => setSaved(false), 2500);
      qc.invalidateQueries({ queryKey: ["admin", "university"] });
      qc.invalidateQueries({ queryKey: ["university"] });
      if (isNew) navigate(`/admin/university/${r.id}`, { replace: true });
    },
    onError: (err) => { const e = apiError(err); setErrors(e.errors); setError(e.message); },
  });

  const remove = useMutation({
    mutationFn: async () => api.delete(`/admin/university/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "university"] }); navigate("/admin/university"); },
  });

  if (!isNew && isLoading) return <LoadingBlock />;
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const err = (k: string) => errors[k]?.[0];

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link to="/admin/university" className="rounded-lg p-2 text-muted hover:bg-paper-2" aria-label="Back"><ArrowLeft className="size-4" /></Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{isNew ? "New resource" : form.title}</h1>
            {!isNew && <p className="font-mono text-xs text-muted">/university/{form.slug}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          {!isNew && form.status === "published" && <a href={`/university/${form.slug}`} target="_blank" rel="noreferrer"><Button variant="secondary"><ExternalLink className="size-4" /> Live</Button></a>}
          <Button onClick={() => save.mutate()} loading={save.isPending}>{saved ? "Saved ✓" : "Save"}</Button>
        </div>
      </div>
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <Card className="space-y-4 p-5">
            <Field label="Title" error={err("title")}>
              <Input value={form.title} onChange={(e) => { set("title", e.target.value); if (!slugTouched) set("slug", slugify(e.target.value)); }} />
            </Field>
            <Field label="Summary" error={err("summary")} hint="Shown on cards and under the page title.">
              <Textarea rows={2} value={form.summary} onChange={(e) => set("summary", e.target.value)} />
            </Field>
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <FigLabel>Body · Markdown</FigLabel>
              <div className="flex rounded-lg border border-line p-0.5 text-xs">
                {(["write", "preview"] as const).map((t) => (
                  <button key={t} onClick={() => setTab(t)} className={cx("rounded-md px-3 py-1 capitalize", tab === t ? "bg-ink text-paper" : "text-muted")}>{t}</button>
                ))}
              </div>
            </div>
            {tab === "write" ? (
              <Textarea rows={16} value={form.body} onChange={(e) => set("body", e.target.value)} className="font-mono text-xs" placeholder={"## How it works\n\nUse **Markdown**: headings, lists, links, - [ ] checklists…"} />
            ) : (
              <div className="prose-audit min-h-64 rounded-lg border border-line p-4" dangerouslySetInnerHTML={{ __html: renderMarkdown(form.body) || "<p><em>Nothing to preview.</em></p>" }} />
            )}
            {err("body") && <p className="mt-1 text-xs text-danger">{err("body")}</p>}
          </Card>

          <Card className="p-5">
            <FigLabel>FAQs</FigLabel>
            <div className="mt-3">
              <ListEditor items={form.faqs} onChange={(v) => set("faqs", v)} blank={() => ({ q: "", a: "" })} addLabel="Add FAQ"
                render={(it, up) => (<><Input placeholder="Question" value={it.q} onChange={(e) => up({ q: e.target.value })} /><Textarea rows={2} placeholder="Answer" value={it.a} onChange={(e) => up({ a: e.target.value })} /></>)} />
            </div>
          </Card>

          <Card className="p-5">
            <FigLabel>Authoritative sources</FigLabel>
            <div className="mt-3">
              <ListEditor items={form.sources} onChange={(v) => set("sources", v)} blank={() => ({ label: "", url: "" })} addLabel="Add source"
                render={(it, up, i) => (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input placeholder="Label" value={it.label} onChange={(e) => up({ label: e.target.value })} />
                    <Input placeholder="https://…" value={it.url ?? ""} onChange={(e) => up({ url: e.target.value })} />
                    {err(`sources.${i}.url`) && <p className="text-xs text-danger sm:col-span-2">{err(`sources.${i}.url`)}</p>}
                  </div>
                )} />
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="space-y-4 p-4">
            <Field label="Status"><Select value={form.status} onChange={(e) => set("status", e.target.value as Form["status"])}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></Select></Field>
            <Field label="URL slug" error={err("slug")}><Input value={form.slug} onChange={(e) => { setSlugTouched(true); set("slug", slugify(e.target.value)); }} className="font-mono" /></Field>
            <Field label="Category" error={err("category")} hint="Pick one or type a new category.">
              <Input list="uni-categories" value={form.category} onChange={(e) => set("category", e.target.value)} />
              <datalist id="uni-categories">{meta?.categories.map((c) => <option key={c} value={c} />)}</datalist>
            </Field>
            <Field label="Type" error={err("type")}>
              <Select value={form.type} onChange={(e) => set("type", e.target.value as Form["type"])}>
                {(meta?.types ?? ["tool", "guide", "template", "checklist"]).map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Interactive tool" error={err("tool_key")} hint="Embeds a built-in tool above the body.">
              <Select value={form.tool_key} onChange={(e) => set("tool_key", e.target.value)}>
                <option value="">None</option>
                {meta?.tool_keys.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Sort order"><Input type="number" min={0} value={form.sort_order} onChange={(e) => set("sort_order", Number(e.target.value) || 0)} /></Field>
              <Field label="Last reviewed"><Input type="date" value={form.reviewed_at} onChange={(e) => set("reviewed_at", e.target.value)} /></Field>
            </div>
          </Card>
          <Card className="space-y-4 p-4">
            <FigLabel>SEO</FigLabel>
            <Field label="Meta title"><Input value={form.seo.title ?? ""} onChange={(e) => set("seo", { ...form.seo, title: e.target.value })} /></Field>
            <Field label="Meta description" hint={`${(form.seo.description ?? "").length}/300`}><Textarea rows={3} value={form.seo.description ?? ""} onChange={(e) => set("seo", { ...form.seo, description: e.target.value })} /></Field>
          </Card>
          {!isNew && (
            <Button variant="ghost" className="w-full text-danger" loading={remove.isPending} onClick={() => confirm("Delete this resource?") && remove.mutate()}>
              <Trash2 className="size-4" /> Delete resource
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
