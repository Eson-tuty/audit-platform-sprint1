import { useState } from "react";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { Download, Mail, Phone, Search, Trash2 } from "lucide-react";
import { api, apiError } from "../lib/api";
import type { Lead, Paginated } from "../lib/types";
import { formatDate } from "../lib/markdown";
import { Alert, Badge, Button, Card, Drawer, EmptyState, Field, Input, LoadingBlock, PageHeader, Select, Textarea, cx, statusTone } from "../components/ui";

type LeadsResponse = Paginated<Lead> & { statuses: string[]; counts: Record<string, number> };

export default function Leads() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Lead | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "leads", status, search, page],
    queryFn: async () => (await api.get<LeadsResponse>("/admin/leads", { params: { status: status || undefined, search: search || undefined, page } })).data,
    placeholderData: keepPreviousData,
  });

  const total = data ? Object.values(data.counts).reduce((a, b) => a + Number(b), 0) : 0;
  const exportUrl = `${import.meta.env.VITE_API_BASE_URL ?? "/api/v1"}/admin/leads/export?${new URLSearchParams({ ...(status && { status }), ...(search && { search }) })}`;

  return (
    <>
      <PageHeader
        title="Leads"
        description="Demo requests and enquiries from website forms."
        actions={<a href={exportUrl}><Button variant="secondary"><Download className="size-4" /> Export CSV</Button></a>}
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1 rounded-lg border border-line bg-white p-1">
          {["", ...(data?.statuses ?? [])].map((s) => (
            <button key={s || "all"} onClick={() => { setStatus(s); setPage(1); }} className={cx("rounded-md px-3 py-1.5 text-xs capitalize", status === s ? "bg-ink text-paper" : "text-ink-2 hover:bg-paper-2")}>
              {s || "All"} <span className="ml-1 opacity-60">{s ? data?.counts[s] ?? 0 : total}</span>
            </button>
          ))}
        </div>
        <div className="relative lg:w-72">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <Input placeholder="Search name, email, company" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
        </div>
      </div>

      <Card className="overflow-x-auto">
        {isLoading ? <LoadingBlock /> : !data?.data.length ? <EmptyState title="No leads match" body="New demo requests from the website appear here." /> : (
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-line text-left text-xs text-muted">
              <tr><th className="px-5 py-3 font-medium">Name</th><th className="px-5 py-3 font-medium">Company</th><th className="px-5 py-3 font-medium">Source</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium">Received</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.data.map((l) => (
                <tr key={l.id} onClick={() => setSelected(l)} className="cursor-pointer hover:bg-paper/60">
                  <td className="px-5 py-3"><p className="font-medium">{l.name}</p><p className="text-xs text-muted">{l.email}</p></td>
                  <td className="px-5 py-3 text-ink-2">{l.company || "—"}</td>
                  <td className="px-5 py-3 font-mono text-xs text-muted">{l.source}</td>
                  <td className="px-5 py-3"><Badge tone={statusTone(l.status)}>{l.status}</Badge></td>
                  <td className="px-5 py-3 text-muted">{formatDate(l.created_at, { dateStyle: "medium", timeStyle: "short" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {data && data.last_page > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted">Page {data.current_page} of {data.last_page} · {data.total} leads</span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button size="sm" variant="secondary" disabled={page >= data.last_page} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      <LeadDrawer
        lead={selected}
        statuses={data?.statuses ?? []}
        onClose={() => setSelected(null)}
        onChanged={(l) => { setSelected(l); qc.invalidateQueries({ queryKey: ["admin", "leads"] }); qc.invalidateQueries({ queryKey: ["admin", "dashboard"] }); }}
        onDeleted={() => { setSelected(null); qc.invalidateQueries({ queryKey: ["admin", "leads"] }); }}
      />
    </>
  );
}

function LeadDrawer({ lead, statuses, onClose, onChanged, onDeleted }: { lead: Lead | null; statuses: string[]; onClose: () => void; onChanged: (l: Lead) => void; onDeleted: () => void }) {
  const [status, setStatus] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [lastId, setLastId] = useState<number | null>(null);
  if (lead && lead.id !== lastId) { setLastId(lead.id); setStatus(lead.status); setNote(""); setError(""); }

  const update = useMutation({
    mutationFn: async () => (await api.put<{ data: Lead }>(`/admin/leads/${lead!.id}`, { status, note: note || undefined })).data.data,
    onSuccess: (l) => { setNote(""); onChanged(l); },
    onError: (e) => setError(apiError(e).message),
  });
  const remove = useMutation({ mutationFn: async () => api.delete(`/admin/leads/${lead!.id}`), onSuccess: onDeleted });

  return (
    <Drawer open={!!lead} onClose={onClose} title="Lead details">
      {lead && (
        <div className="space-y-6">
          <div>
            <p className="text-lg font-semibold">{lead.name}</p>
            <p className="text-sm text-muted">{lead.company}</p>
            <div className="mt-3 space-y-1 text-sm">
              {lead.email && <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-accent hover:underline"><Mail className="size-4" /> {lead.email}</a>}
              {lead.phone && <a href={`tel:${lead.phone}`} className="flex items-center gap-2 hover:underline"><Phone className="size-4 text-muted" /> {lead.phone}</a>}
            </div>
            <p className="mt-3 font-mono text-[11px] text-muted">{lead.source} · {formatDate(lead.created_at, { dateStyle: "medium", timeStyle: "short" })}</p>
          </div>
          {lead.message && <div className="rounded-lg bg-paper-2 p-3 text-sm whitespace-pre-wrap">{lead.message}</div>}

          <div className="space-y-3 border-t border-line pt-5">
            {error && <Alert>{error}</Alert>}
            <Field label="Status">
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>{statuses.map((s) => <option key={s} value={s}>{s}</option>)}</Select>
            </Field>
            <Field label="Add a note"><Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Called — follow up next week" /></Field>
            <Button onClick={() => update.mutate()} loading={update.isPending} disabled={status === lead.status && !note}>Save</Button>
          </div>

          {!!lead.metadata?.notes?.length && (
            <div className="border-t border-line pt-5">
              <p className="mb-2 text-xs font-medium text-muted">Notes</p>
              <ul className="space-y-2">
                {[...lead.metadata.notes].reverse().map((n, i) => (
                  <li key={i} className="rounded-lg border border-line p-3 text-sm">
                    <p>{n.text}</p>
                    <p className="mt-1 text-[11px] text-muted">{n.by} · {formatDate(n.at, { dateStyle: "short", timeStyle: "short" })}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="border-t border-line pt-5">
            <Button variant="ghost" className="text-danger" loading={remove.isPending} onClick={() => confirm("Delete this lead permanently?") && remove.mutate()}>
              <Trash2 className="size-4" /> Delete lead
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  );
}
