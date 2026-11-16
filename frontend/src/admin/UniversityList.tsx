import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Plus, Search } from "lucide-react";
import { api } from "../lib/api";
import type { UniversityResource } from "../lib/types";
import { formatDate } from "../lib/markdown";
import { Badge, Button, Card, EmptyState, Input, LoadingBlock, PageHeader, Select, statusTone } from "../components/ui";

export type UniversityMeta = { categories: string[]; types: string[]; tool_keys: string[] };

export default function UniversityList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "university", search, category, status],
    queryFn: async () => (await api.get<{ data: UniversityResource[]; meta: UniversityMeta }>("/admin/university", {
      params: { search: search || undefined, category: category || undefined, status: status || undefined },
    })).data,
  });

  return (
    <>
      <PageHeader
        title="University"
        description="Free tools, guides, templates and checklists published at /university."
        actions={<Button onClick={() => navigate("/admin/university/new")}><Plus className="size-4" /> New resource</Button>}
      />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <Input placeholder="Search by title" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="sm:w-44">
          <option value="">All categories</option>
          {data?.meta.categories.map((c) => <option key={c}>{c}</option>)}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-40">
          <option value="">All statuses</option><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option>
        </Select>
      </div>
      <Card className="overflow-x-auto">
        {isLoading ? <LoadingBlock /> : !data?.data.length ? (
          <EmptyState title="No resources found" action={<Button onClick={() => navigate("/admin/university/new")}>New resource</Button>} />
        ) : (
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-line text-left text-xs text-muted">
              <tr><th className="px-5 py-3 font-medium">Title</th><th className="px-5 py-3 font-medium">Category</th><th className="px-5 py-3 font-medium">Type</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium">Reviewed</th><th /></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.data.map((r) => (
                <tr key={r.id} className="hover:bg-paper/60">
                  <td className="px-5 py-3">
                    <Link to={`/admin/university/${r.id}`} className="font-medium hover:text-accent">{r.title}</Link>
                    {r.tool_key && <span className="ml-2 font-mono text-[10px] text-muted">⚙ {r.tool_key}</span>}
                  </td>
                  <td className="px-5 py-3 text-ink-2">{r.category}</td>
                  <td className="px-5 py-3"><Badge tone={r.type === "tool" ? "green" : "neutral"}>{r.type}</Badge></td>
                  <td className="px-5 py-3"><Badge tone={statusTone(r.status ?? "draft")}>{r.status}</Badge></td>
                  <td className="px-5 py-3 text-muted">{formatDate(r.reviewed_at)}</td>
                  <td className="px-5 py-3 text-right">
                    {r.status === "published" && <a href={`/university/${r.slug}`} target="_blank" rel="noreferrer" className="inline-flex text-muted hover:text-ink" aria-label="View live"><ExternalLink className="size-4" /></a>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
