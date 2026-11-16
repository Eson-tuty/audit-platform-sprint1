import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { api, apiError, type ValidationErrors } from "../lib/api";
import { Alert, Badge, Button, Card, EmptyState, Field, Input, LoadingBlock, Modal, PageHeader, Select, Textarea, statusTone } from "../components/ui";
import type { Client } from "./types";

const blank = { name: "", code: "", industry: "", contact_name: "", contact_email: "", contact_phone: "", address: "", status: "active" };

export default function Clients() {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Client | "new" | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["audit", "clients", search],
    queryFn: async () => (await api.get<{ data: Client[] }>("/audit/clients", { params: { search: search || undefined } })).data.data,
  });

  return (
    <>
      <PageHeader
        title="Clients"
        description="Organisations you audit."
        actions={<><Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" /><Button onClick={() => setEditing("new")}><Plus className="size-4" /> Add client</Button></>}
      />
      <Card className="overflow-x-auto">
        {isLoading ? <LoadingBlock /> : !data?.length ? <EmptyState title="No clients yet" action={<Button onClick={() => setEditing("new")}><Plus className="size-4" /> Add client</Button>} /> : (
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-line text-left text-xs text-muted">
              <tr><th className="px-5 py-3 font-medium">Client</th><th className="px-3 py-3 font-medium">Industry</th><th className="px-3 py-3 font-medium">Contact</th><th className="px-3 py-3 text-right font-medium">Engagements</th><th className="px-3 py-3 font-medium">Status</th><th className="px-5 py-3" /></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.map((c) => (
                <tr key={c.id}>
                  <td className="px-5 py-3"><p className="font-medium">{c.name}</p><p className="font-mono text-[11px] text-muted">{c.code}</p></td>
                  <td className="px-3 py-3 text-ink-2">{c.industry ?? "—"}</td>
                  <td className="px-3 py-3"><p>{c.contact_name ?? "—"}</p><p className="text-xs text-muted">{c.contact_email}</p></td>
                  <td className="px-3 py-3 text-right tabular-nums">{c.engagements_count}</td>
                  <td className="px-3 py-3"><Badge tone={statusTone(c.status ?? "active")}>{c.status}</Badge></td>
                  <td className="px-5 py-3 text-right"><Button size="sm" variant="secondary" onClick={() => setEditing(c)}>Edit</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <ClientModal client={editing} onClose={() => setEditing(null)} />
    </>
  );
}

function ClientModal({ client, onClose }: { client: Client | "new" | null; onClose: () => void }) {
  const qc = useQueryClient();
  const existing = client && client !== "new" ? client : null;
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [error, setError] = useState("");
  const [key, setKey] = useState("");
  const k = client === null ? "closed" : existing ? `e${existing.id}` : "new";
  if (k !== key) {
    setKey(k); setErrors({}); setError("");
    setForm(existing ? Object.fromEntries(Object.keys(blank).map((f) => [f, String((existing as Record<string, unknown>)[f] ?? "")])) as typeof blank : blank);
  }
  const save = useMutation({
    mutationFn: () => {
      const payload = Object.fromEntries(Object.entries(form).map(([f, v]) => [f, v === "" ? null : v]));
      return existing ? api.put(`/audit/clients/${existing.id}`, payload) : api.post("/audit/clients", payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["audit"] }); onClose(); },
    onError: (e) => { const x = apiError(e); setErrors(x.errors); setError(x.message); },
  });
  const remove = useMutation({
    mutationFn: () => api.delete(`/audit/clients/${existing!.id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["audit"] }); onClose(); },
    onError: (e) => setError(apiError(e).message),
  });
  const f = (name: keyof typeof blank) => ({ value: form[name], onChange: (e: { target: { value: string } }) => setForm({ ...form, [name]: e.target.value }) });

  return (
    <Modal open={client !== null} onClose={onClose} title={existing ? `Edit ${existing.name}` : "Add client"} wide>
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
        {error && !Object.keys(errors).length && <Alert>{error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <Field label="Client name" error={errors.name?.[0]}><Input required {...f("name")} /></Field>
          <Field label="Code" error={errors.code?.[0]}><Input {...f("code")} /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Industry"><Input {...f("industry")} /></Field>
          <Field label="Status"><Select {...f("status")}><option value="active">Active</option><option value="inactive">Inactive</option></Select></Field>
          <Field label="Contact person"><Input {...f("contact_name")} /></Field>
          <Field label="Contact email" error={errors.contact_email?.[0]}><Input type="email" {...f("contact_email")} /></Field>
          <Field label="Contact phone"><Input {...f("contact_phone")} /></Field>
        </div>
        <Field label="Address"><Textarea rows={2} {...f("address")} /></Field>
        <div className="flex items-center justify-between border-t border-line pt-4">
          <div>{existing && !existing.engagements_count && <Button type="button" variant="ghost" className="text-danger" loading={remove.isPending} onClick={() => confirm(`Delete ${existing.name}?`) && remove.mutate()}>Delete</Button>}</div>
          <div className="flex gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" loading={save.isPending}>Save</Button></div>
        </div>
      </form>
    </Modal>
  );
}
