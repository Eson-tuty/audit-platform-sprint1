import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Lock } from "lucide-react";
import { api, apiError, initializeCsrf } from "../lib/api";
import { useMe } from "./auth";
import { Logo } from "../site/SiteLayout";
import { useSite } from "../site/useSite";
import { Alert, Button, Field, Input } from "../components/ui";

export default function LoginPage() {
  const { data: me } = useMe();
  const { data: site } = useSite();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  /** Explicit destination wins; otherwise audit staff land in the workspace and website editors in the admin panel. */
  const home = (perms: string[]) => (from && (from.startsWith("/admin") || from.startsWith("/app")) ? from : perms.some((p) => p.startsWith("audit.")) ? "/app" : "/admin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (me) return <Navigate to={home(me.permissions)} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await initializeCsrf();
      const res = await api.post("/auth/login", { email, password, remember });
      qc.setQueryData(["me"], res.data.data);
      navigate(home(res.data.data.permissions), { replace: true });
    } catch (err) {
      const { message, errors } = apiError(err);
      setError(errors.email?.[0] ?? message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-paper lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> Back to site</Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <Logo name={site?.brand.name ?? "Auditline"} />
          <h1 className="mt-8 text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-muted">Audit workspace and website admin.</p>
          <form onSubmit={submit} className="mt-8 space-y-4">
            {error && <Alert>{error}</Alert>}
            <Field label="Email"><Input type="email" required autoFocus autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
            <Field label="Password"><Input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
            <label className="flex items-center gap-2 text-sm text-ink-2">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="accent-[var(--color-accent)]" /> Keep me signed in
            </label>
            <Button type="submit" loading={loading} className="h-11 w-full">Sign in</Button>
          </form>
          {import.meta.env.DEV && (
            <p className="mt-6 rounded-lg border border-dashed border-line p-3 font-mono text-[11px] text-muted">
              dev seed (password ChangeMe-Immediately-123!): owner@ · manager@ · auditor@ · auditor2@example.test
            </p>
          )}
        </div>
      </div>
      <div className="grid-paper hidden items-center justify-center border-l border-line bg-paper-2 lg:flex">
        <div className="max-w-sm rounded-2xl border border-line bg-white p-8 shadow-sm">
          <Lock className="size-5 text-accent" />
          <p className="mt-4 font-serif text-3xl leading-tight">Every change here is recorded in the audit trail.</p>
          <p className="mt-3 text-sm text-muted">Sign-ins, edits, exports and permission changes are logged with user, time and IP address.</p>
        </div>
      </div>
    </div>
  );
}
