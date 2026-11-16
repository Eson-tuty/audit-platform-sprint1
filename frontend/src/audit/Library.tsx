import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ListChecks, Pencil, Plus, Trash2 } from "lucide-react";
import { api, apiError, type ValidationErrors } from "../lib/api";
import { useCan } from "../admin/auth";
import { ListEditor } from "../admin/editors";
import { Alert, Button, Card, EmptyState, Field, Input, LoadingBlock, Modal, PageHeader, Select, Textarea, cx } from "../components/ui";
import type { LibraryControl, LibraryProcess, LibraryRisk } from "./types";
import { RatingBadge, humanize, useMeta } from "./shared";

type Editing =
  | { kind: "process"; item?: LibraryProcess }
  | { kind: "risk"; processId: number; item?: LibraryRisk }
  | { kind: "control"; riskId: number; item?: LibraryControl };

export default function Library() {
  const can = useCan();
  const manage = can("audit.manage");
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [error, setError] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["audit", "library"],
    queryFn: async () => (await api.get<{ data: LibraryProcess[] }>("/audit/library")).data.data,
  });
  const remove = useMutation({
    mutationFn: (path: string) => api.delete(`/audit/library/${path}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["audit"] }),
    onError: (e) => setError(apiError(e).message),
  });

  if (isLoading || !data) return <LoadingBlock />;
  const selected = data.find((p) => p.id === selectedId) ?? data[0];
  const del = (path: string, what: string) => confirm(`Delete ${what}? Engagements already using it keep their copy.`) && remove.mutate(path);

  return (
    <>
      <PageHeader
        title="Risk & control library"
        description="Processes, their risks, the controls that address each risk and the checks to perform. New engagements copy from here."
        actions={manage && <Button onClick={() => setEditing({ kind: "process" })}><Plus className="size-4" /> Add process</Button>}
      />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}

      {!data.length ? <Card><EmptyState title="The library is empty" body="Add your first process, then its risks and controls." /></Card> : (
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <nav className="space-y-1">
            {data.map((p) => {
              const controls = p.risks.reduce((n, r) => n + r.controls.length, 0);
              return (
                <button key={p.id} onClick={() => setSelectedId(p.id)}
                  className={cx("w-full rounded-lg px-3 py-2 text-left", selected?.id === p.id ? "bg-ink text-paper" : "hover:bg-paper-2")}>
                  <span className="block text-sm font-medium">{p.name}</span>
                  <span className={cx("text-xs", selected?.id === p.id ? "text-paper/70" : "text-muted")}>{p.code} · {p.risks.length} risks · {controls} controls</span>
                </button>
              );
            })}
          </nav>

          {selected && (
            <div className="min-w-0 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-muted">{selected.code}</p>
                  <h2 className="text-lg font-semibold">{selected.name}</h2>
                  {selected.description && <p className="mt-1 text-sm text-muted">{selected.description}</p>}
                </div>
                {manage && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditing({ kind: "process", item: selected })}><Pencil className="size-3.5" /> Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => del(`processes/${selected.id}`, selected.name)}><Trash2 className="size-3.5" /></Button>
                    <Button size="sm" onClick={() => setEditing({ kind: "risk", processId: selected.id })}><Plus className="size-3.5" /> Add risk</Button>
                  </div>
                )}
              </div>

              {!selected.risks.length && <Card><EmptyState title="No risks yet" body="Add the risks this process is exposed to." /></Card>}
              {selected.risks.map((r) => (
                <Card key={r.id} className="overflow-hidden">
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line bg-paper/50 px-5 py-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] text-muted">Risk {r.code}</p>
                      <p className="font-medium">{r.title}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <RatingBadge rating={r.rating} />
                      {manage && (
                        <>
                          <button className="rounded p-1.5 text-muted hover:bg-paper-2 hover:text-ink" aria-label="Edit risk" onClick={() => setEditing({ kind: "risk", processId: selected.id, item: r })}><Pencil className="size-3.5" /></button>
                          <button className="rounded p-1.5 text-muted hover:bg-paper-2 hover:text-danger" aria-label="Delete risk" onClick={() => del(`risks/${r.id}`, `risk ${r.code ?? ""}`)}><Trash2 className="size-3.5" /></button>
                        </>
                      )}
                    </div>
                  </div>
                  <ul className="divide-y divide-line">
                    {r.controls.map((c) => (
                      <li key={c.id} className="flex items-start gap-4 px-5 py-3">
                        <span className="w-16 shrink-0 pt-0.5 font-mono text-xs text-muted">{c.code}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm">{c.title}</p>
                          <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted">
                            <span>{humanize(c.nature)}</span><span>{humanize(c.control_type)}</span><span>{humanize(c.frequency)}</span>{c.owner && <span>Owner: {c.owner}</span>}
                          </p>
                          <details className="mt-1.5">
                            <summary className="inline-flex cursor-pointer items-center gap-1 text-xs text-accent"><ListChecks className="size-3" /> {c.checks.length} checks</summary>
                            <ol className="mt-1.5 list-decimal space-y-0.5 pl-5 text-xs text-ink-2">{c.checks.map((k) => <li key={k.id}>{k.description}</li>)}</ol>
                          </details>
                        </div>
                        {manage && (
                          <div className="flex shrink-0">
                            <button className="rounded p-1.5 text-muted hover:bg-paper-2 hover:text-ink" aria-label="Edit control" onClick={() => setEditing({ kind: "control", riskId: r.id, item: c })}><Pencil className="size-3.5" /></button>
                            <button className="rounded p-1.5 text-muted hover:bg-paper-2 hover:text-danger" aria-label="Delete control" onClick={() => del(`controls/${c.id}`, `control ${c.code ?? ""}`)}><Trash2 className="size-3.5" /></button>
                          </div>
                        )}
                      </li>
                    ))}
                    {manage && (
                      <li className="px-5 py-2.5">
                        <button className="inline-flex items-center gap-1 text-xs font-medium text-accent" onClick={() => setEditing({ kind: "control", riskId: r.id })}><Plus className="size-3.5" /> Add control</button>
                      </li>
                    )}
                  </ul>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {editing && <EditModal editing={editing} onClose={() => setEditing(null)} onCreatedProcess={setSelectedId} />}
    </>
  );
}

function EditModal({ editing, onClose, onCreatedProcess }: { editing: Editing; onClose: () => void; onCreatedProcess: (id: number) => void }) {
  const qc = useQueryClient();
  const { data: meta } = useMeta();
  const it = editing.item as (Partial<LibraryProcess & LibraryRisk & LibraryControl>) | undefined;
  const [form, setForm] = useState({
    code: it?.code ?? "", name: it?.name ?? "", title: it?.title ?? "", description: it?.description ?? "",
    rating: it?.rating ?? "medium", nature: it?.nature ?? "", control_type: it?.control_type ?? "", frequency: it?.frequency ?? "",
    owner: it?.owner ?? "", is_key: it?.is_key ?? true, checks: (it?.checks ?? []).map((c) => ({ id: c.id as number | undefined, description: c.description })),
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [error, setError] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      const n = (v: string) => v || null;
      if (editing.kind === "process") {
        const body = { code: n(form.code), name: form.name, description: n(form.description) };
        return editing.item ? api.put(`/audit/library/processes/${editing.item.id}`, body) : api.post("/audit/library/processes", body);
      }
      if (editing.kind === "risk") {
        const body = { code: n(form.code), title: form.title, description: n(form.description), rating: form.rating };
        return editing.item ? api.put(`/audit/library/risks/${editing.item.id}`, body) : api.post(`/audit/library/processes/${editing.processId}/risks`, body);
      }
      const body = {
        code: n(form.code), title: form.title, description: n(form.description), nature: n(form.nature), control_type: n(form.control_type),
        frequency: n(form.frequency), owner: n(form.owner), is_key: form.is_key, checks: form.checks.filter((c) => c.description.trim()),
      };
      return editing.item ? api.put(`/audit/library/controls/${editing.item.id}`, body) : api.post(`/audit/library/risks/${editing.riskId}/controls`, body);
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["audit"] });
      if (editing.kind === "process" && !editing.item) onCreatedProcess(res.data.data.id);
      onClose();
    },
    onError: (e) => { const x = apiError(e); setErrors(x.errors); setError(x.message); },
  });

  const title = `${editing.item ? "Edit" : "Add"} ${editing.kind}`;
  const opts = (xs: string[] | undefined) => xs?.map((x) => <option key={x} value={x}>{humanize(x)}</option>);

  return (
    <Modal open onClose={onClose} title={title} wide>
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
        {error && !Object.keys(errors).length && <Alert>{error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
          <Field label="Code" error={errors.code?.[0]}><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field>
          {editing.kind === "process"
            ? <Field label="Process name" error={errors.name?.[0]}><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            : <Field label={editing.kind === "risk" ? "Risk" : "Control"} error={errors.title?.[0]}><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>}
        </div>
        <Field label="Description (optional)"><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>

        {editing.kind === "risk" && (
          <Field label="Risk rating" className="max-w-48">
            <Select value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value as "high" })}>{opts(meta?.options.risk_ratings)}</Select>
          </Field>
        )}

        {editing.kind === "control" && (
          <>
            <div className="grid gap-4 sm:grid-cols-4">
              <Field label="Nature"><Select value={form.nature} onChange={(e) => setForm({ ...form, nature: e.target.value })}><option value="">—</option>{opts(meta?.options.control_natures)}</Select></Field>
              <Field label="Type"><Select value={form.control_type} onChange={(e) => setForm({ ...form, control_type: e.target.value })}><option value="">—</option>{opts(meta?.options.control_types)}</Select></Field>
              <Field label="Frequency"><Select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}><option value="">—</option>{opts(meta?.options.control_frequencies)}</Select></Field>
              <Field label="Owner"><Input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_key} onChange={(e) => setForm({ ...form, is_key: e.target.checked })} className="accent-[var(--color-accent)]" /> Key control</label>
            <div>
              <p className="mb-1.5 text-xs font-medium text-ink-2">Checks the tester must perform</p>
              <ListEditor items={form.checks} onChange={(checks) => setForm({ ...form, checks })} blank={() => ({ id: undefined, description: "" })} addLabel="Add check" max={50}
                render={(c, u, i) => <Input placeholder={`Check ${i + 1}`} value={c.description} onChange={(e) => u({ description: e.target.value })} />} />
              {Object.keys(errors).some((k) => k.startsWith("checks")) && <p className="mt-1 text-xs text-danger">Each check needs a description.</p>}
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={save.isPending}>Save</Button>
        </div>
      </form>
    </Modal>
  );
}
