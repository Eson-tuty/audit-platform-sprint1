import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { api, apiError, type ValidationErrors } from "../lib/api";
import { formatDate } from "../lib/markdown";
import { useMe } from "./auth";
import { Alert, Badge, Button, Card, Field, Input, LoadingBlock, Modal, PageHeader, Select, statusTone } from "../components/ui";

type Role = { id: number; name: string; slug: string; permissions: { id: number; name: string }[] };
type Member = { id: number; name: string; email: string; is_active: boolean; last_login_at: string | null; membership_status: string; role_ids: number[] };

export default function Users() {
  const { data: me } = useMe();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => (await api.get<{ data: Member[]; roles: Role[] }>("/admin/users")).data,
  });
  const [editing, setEditing] = useState<Member | null>(null);
  const [adding, setAdding] = useState(false);

  if (isLoading || !data) return <LoadingBlock />;
  const roleName = (id: number) => data.roles.find((r) => r.id === id)?.name ?? "?";

  return (
    <>
      <PageHeader
        title="Users & roles"
        description="People with access to this workspace and what each role can do."
        actions={<Button onClick={() => setAdding(true)}><UserPlus className="size-4" /> Add member</Button>}
      />

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="border-b border-line text-left text-xs text-muted">
            <tr><th className="px-5 py-3 font-medium">Name</th><th className="px-5 py-3 font-medium">Roles</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium">Last sign-in</th><th /></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.data.map((u) => (
              <tr key={u.id}>
                <td className="px-5 py-3"><p className="font-medium">{u.name} {u.id === me?.user.id && <span className="text-xs font-normal text-muted">(you)</span>}</p><p className="text-xs text-muted">{u.email}</p></td>
                <td className="px-5 py-3"><div className="flex flex-wrap gap-1">{u.role_ids.length ? u.role_ids.map((id) => <Badge key={id}>{roleName(id)}</Badge>) : <span className="text-xs text-muted">No role</span>}</div></td>
                <td className="px-5 py-3"><Badge tone={statusTone(u.membership_status)}>{u.membership_status}</Badge></td>
                <td className="px-5 py-3 text-muted">{formatDate(u.last_login_at, { dateStyle: "medium", timeStyle: "short" })}</td>
                <td className="px-5 py-3 text-right"><Button size="sm" variant="secondary" onClick={() => setEditing(u)}>Edit</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <h2 className="mt-10 mb-3 font-semibold">Roles</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.roles.map((r) => (
          <Card key={r.id} className="p-4">
            <p className="font-medium">{r.name}</p>
            <ul className="mt-2 space-y-1">
              {r.permissions.length ? r.permissions.map((p) => <li key={p.id} className="font-mono text-[11px] text-muted">{p.name}</li>) : <li className="text-xs text-muted">No admin-panel permissions (audit app only)</li>}
            </ul>
          </Card>
        ))}
      </div>

      <MemberModal open={adding} onClose={() => setAdding(false)} roles={data.roles} />
      <MemberModal open={!!editing} member={editing ?? undefined} onClose={() => setEditing(null)} roles={data.roles} isSelf={editing?.id === me?.user.id} />
    </>
  );
}

function MemberModal({ open, onClose, roles, member, isSelf }: { open: boolean; onClose: () => void; roles: Role[]; member?: Member; isSelf?: boolean }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", email: "", password: "", membership_status: "active", role_ids: [] as number[] });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [error, setError] = useState("");
  const [key, setKey] = useState<string>("");
  const k = `${open}-${member?.id ?? "new"}`;
  if (k !== key) {
    setKey(k);
    setErrors({}); setError("");
    setForm(member
      ? { name: member.name, email: member.email, password: "", membership_status: member.membership_status, role_ids: member.role_ids }
      : { name: "", email: "", password: "", membership_status: "active", role_ids: [] });
  }

  const save = useMutation({
    mutationFn: async () => member
      ? api.put(`/admin/users/${member.id}`, { name: form.name, membership_status: form.membership_status, role_ids: form.role_ids })
      : api.post("/admin/users", { name: form.name, email: form.email, password: form.password || undefined, role_ids: form.role_ids }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "users"] }); qc.invalidateQueries({ queryKey: ["me"] }); onClose(); },
    onError: (e) => { const x = apiError(e); setErrors(x.errors); setError(x.message); },
  });

  const toggle = (id: number) => setForm((f) => ({ ...f, role_ids: f.role_ids.includes(id) ? f.role_ids.filter((x) => x !== id) : [...f.role_ids, id] }));

  return (
    <Modal open={open} onClose={onClose} title={member ? `Edit ${member.name}` : "Add member"}>
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
        {error && !Object.keys(errors).length && <Alert>{error}</Alert>}
        <Field label="Name" error={errors.name?.[0]}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        {!member && (
          <>
            <Field label="Email" error={errors.email?.[0]}><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Temporary password" error={errors.password?.[0]} hint="Min 12 characters with upper, lower case and a number. Leave blank if the person already has an account.">
              <Input type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
          </>
        )}
        {member && (
          <Field label="Access" error={errors.membership_status?.[0]}>
            <Select value={form.membership_status} disabled={isSelf} onChange={(e) => setForm({ ...form, membership_status: e.target.value })}>
              <option value="active">Active</option><option value="suspended">Suspended</option>
            </Select>
          </Field>
        )}
        <fieldset>
          <legend className="mb-1.5 text-xs font-medium text-ink-2">Roles</legend>
          <div className="grid grid-cols-2 gap-2">
            {roles.map((r) => (
              <label key={r.id} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm">
                <input type="checkbox" checked={form.role_ids.includes(r.id)} onChange={() => toggle(r.id)} className="accent-[var(--color-accent)]" /> {r.name}
              </label>
            ))}
          </div>
          {isSelf && <p className="mt-2 text-xs text-amber">Careful: removing your own Admin role will lock you out of this page.</p>}
        </fieldset>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={save.isPending}>{member ? "Save" : "Add member"}</Button>
        </div>
      </form>
    </Modal>
  );
}
