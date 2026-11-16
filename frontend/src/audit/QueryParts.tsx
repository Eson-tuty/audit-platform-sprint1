import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError, type ValidationErrors } from "../lib/api";
import { Alert, Button, Field, Input, Textarea, cx } from "../components/ui";
import type { Retest } from "./types";
import { StatusBadge, fmtDate } from "./shared";

export function RetestHistory({ retests }: { retests: Retest[] }) {
  if (!retests.length) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-ink-2">Retest history</p>
      <ol className="space-y-2">
        {retests.map((r, i) => (
          <li key={i} className="rounded-lg border border-line p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={r.result} />
              <span className="text-xs text-muted">{fmtDate(r.at)} · {r.by}{r.sample_size ? ` · ${r.sample_size} samples` : ""}</span>
            </div>
            <p className="mt-1.5 whitespace-pre-line text-ink-2">{r.notes}</p>
            {r.result === "fail" && r.previous_target_date && <p className="mt-1 text-xs text-muted">Closure date moved from {fmtDate(r.previous_target_date)}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Retest an open query: pass closes it, fail keeps it open with a new closure date. */
export function RetestForm({ testId, onDone }: { testId: number; onDone?: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ result: "", sample_size: "", notes: "", new_target_date: "" });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [error, setError] = useState("");

  const save = useMutation({
    mutationFn: () => api.post(`/audit/control-tests/${testId}/retest`, {
      result: form.result || undefined,
      sample_size: form.sample_size === "" ? null : Number(form.sample_size),
      notes: form.notes,
      new_target_date: form.result === "fail" ? form.new_target_date || null : null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["audit"] }); setForm({ result: "", sample_size: "", notes: "", new_target_date: "" }); onDone?.(); },
    onError: (e) => { const x = apiError(e); setErrors(x.errors); setError(x.message); },
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3 rounded-lg border border-line bg-paper/60 p-4">
      <p className="text-sm font-medium">Record retest</p>
      {error && !Object.keys(errors).length && <Alert>{error}</Alert>}
      <ResultToggle value={form.result} onChange={(result) => setForm({ ...form, result })} error={errors.result?.[0]} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Samples retested" error={errors.sample_size?.[0]}><Input type="number" min={0} value={form.sample_size} onChange={(e) => setForm({ ...form, sample_size: e.target.value })} /></Field>
        {form.result === "fail" && (
          <Field label="New closure date" error={errors.new_target_date?.[0]}><Input type="date" required value={form.new_target_date} onChange={(e) => setForm({ ...form, new_target_date: e.target.value })} /></Field>
        )}
      </div>
      <Field label="What was checked" error={errors.notes?.[0]}><Textarea rows={3} required value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
      <div className="flex justify-end"><Button type="submit" loading={save.isPending}>{form.result === "pass" ? "Close query" : "Save retest"}</Button></div>
    </form>
  );
}

export function ResultToggle({ value, onChange, error, disabled }: { value: string; onChange: (v: string) => void; error?: string; disabled?: boolean }) {
  return (
    <fieldset disabled={disabled}>
      <legend className="mb-1.5 text-xs font-medium text-ink-2">Test result</legend>
      <div className="grid max-w-xs grid-cols-2 gap-2">
        {(["pass", "fail"] as const).map((r) => (
          <button key={r} type="button" aria-pressed={value === r} onClick={() => onChange(value === r ? "" : r)}
            className={cx(
              "h-10 rounded-lg border text-sm font-medium disabled:cursor-not-allowed",
              value === r ? (r === "pass" ? "border-accent bg-accent text-white" : "border-danger bg-danger text-white") : "border-line bg-white text-ink-2 hover:bg-paper-2",
            )}>
            {r === "pass" ? "Pass" : "Fail"}
          </button>
        ))}
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </fieldset>
  );
}
