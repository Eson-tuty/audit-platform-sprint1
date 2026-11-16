import { Fragment, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import { api } from "../lib/api";
import type { Paginated } from "../lib/types";
import { formatDate } from "../lib/markdown";
import { Button, Card, EmptyState, LoadingBlock, PageHeader, Select, cx } from "../components/ui";

type Log = {
  id: number;
  event: string;
  auditable_type: string | null;
  auditable_id: number | null;
  ip_address: string | null;
  user_agent: string | null;
  before_values: Record<string, unknown> | null;
  after_values: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  user: { name: string; email: string } | null;
};

const eventTone = (e: string) => (e.includes("failed") || e.includes("deleted") ? "text-danger" : e.startsWith("auth") ? "text-info" : "text-ink");

export default function AuditLog() {
  const [event, setEvent] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<number | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "audit-logs", event, page],
    queryFn: async () => (await api.get<Paginated<Log> & { events: string[] }>("/admin/audit-logs", { params: { event: event || undefined, page } })).data,
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Append-only record of sign-ins, content changes, exports and permission changes."
        actions={
          <Select value={event} onChange={(e) => { setEvent(e.target.value); setPage(1); }} className="w-56">
            <option value="">All events</option>
            {data?.events.map((e) => <option key={e} value={e}>{e}</option>)}
          </Select>
        }
      />
      <Card className="overflow-x-auto">
        {isLoading ? <LoadingBlock /> : !data?.data.length ? <EmptyState title="No events" /> : (
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-line text-left text-xs text-muted">
              <tr><th className="w-8" /><th className="px-3 py-3 font-medium">When</th><th className="px-3 py-3 font-medium">Event</th><th className="px-3 py-3 font-medium">User</th><th className="px-3 py-3 font-medium">Subject</th><th className="px-3 py-3 font-medium">IP</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.data.map((l) => {
                const hasDetail = l.before_values || l.after_values || l.metadata;
                const isOpen = open === l.id;
                return (
                  <Fragment key={l.id}>
                    <tr className={cx(hasDetail && "cursor-pointer hover:bg-paper/60")} onClick={() => hasDetail && setOpen(isOpen ? null : l.id)}>
                      <td className="pl-4 text-muted">{hasDetail && (isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />)}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-muted">{formatDate(l.created_at, { dateStyle: "short", timeStyle: "medium" })}</td>
                      <td className={cx("px-3 py-2.5 font-mono text-xs", eventTone(l.event))}>{l.event}</td>
                      <td className="px-3 py-2.5">{l.user?.name ?? <span className="text-muted">Website visitor</span>}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-muted">{l.auditable_type ? `${l.auditable_type.split("\\").pop()} #${l.auditable_id}` : "—"}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-muted">{l.ip_address}</td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-paper/60">
                        <td />
                        <td colSpan={5} className="px-3 py-3">
                          <div className="grid gap-3 md:grid-cols-3">
                            <Json label="Before" value={l.before_values} />
                            <Json label="After" value={l.after_values} />
                            <Json label="Metadata" value={l.metadata} />
                          </div>
                          {l.user_agent && <p className="mt-2 truncate font-mono text-[10px] text-muted">{l.user_agent}</p>}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
      {data && data.last_page > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted">Page {data.current_page} of {data.last_page}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button size="sm" variant="secondary" disabled={page >= data.last_page} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </>
  );
}

function Json({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-medium text-muted">{label}</p>
      <pre className="max-h-48 overflow-auto rounded-md border border-line bg-white p-2 font-mono text-[11px] whitespace-pre-wrap">{value ? JSON.stringify(value, null, 2) : "—"}</pre>
    </div>
  );
}
