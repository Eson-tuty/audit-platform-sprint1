import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Plus, Search } from "lucide-react";
import { api } from "../lib/api";
import type { CmsPage } from "../lib/types";
import { formatDate } from "../lib/markdown";
import { Badge, Button, Card, EmptyState, Input, LoadingBlock, PageHeader, Select, statusTone } from "../components/ui";

export default function PagesList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "pages", search, status],
    queryFn: async () => (await api.get<{ data: CmsPage[] }>("/admin/pages", { params: { search: search || undefined, status: status || undefined } })).data.data,
  });

  return (
    <>
      <PageHeader
        title="Pages"
        description="Website pages built from reusable sections. Every save creates a new version."
        actions={<Button onClick={() => navigate("/admin/pages/new")}><Plus className="size-4" /> New page</Button>}
      />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <Input placeholder="Search by title or slug" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-44">
          <option value="">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </Select>
      </div>
      <Card className="overflow-x-auto">
        {isLoading ? <LoadingBlock /> : !data?.length ? (
          <EmptyState title="No pages yet" body="Create your first page — About, Security, a landing page for a campaign…" action={<Button onClick={() => navigate("/admin/pages/new")}>New page</Button>} />
        ) : (
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-line text-left text-xs text-muted">
              <tr><th className="px-5 py-3 font-medium">Title</th><th className="px-5 py-3 font-medium">URL</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium">Versions</th><th className="px-5 py-3 font-medium">Updated</th><th /></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.map((p) => (
                <tr key={p.id} className="hover:bg-paper/60">
                  <td className="px-5 py-3"><Link to={`/admin/pages/${p.id}`} className="font-medium hover:text-accent">{p.title}</Link></td>
                  <td className="px-5 py-3 font-mono text-xs text-muted">/{p.slug}</td>
                  <td className="px-5 py-3"><Badge tone={statusTone(p.status)}>{p.status}</Badge></td>
                  <td className="px-5 py-3 font-mono text-xs">{p.versions_count}</td>
                  <td className="px-5 py-3 text-muted">{formatDate(p.updated_at)}</td>
                  <td className="px-5 py-3 text-right">
                    {p.status === "published" && <a href={`/${p.slug}`} target="_blank" rel="noreferrer" className="inline-flex text-muted hover:text-ink" aria-label="View live page"><ExternalLink className="size-4" /></a>}
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
