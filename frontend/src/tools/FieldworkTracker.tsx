import { useEffect, useMemo, useState } from "react";
import { Download, FileDown, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button, cx, FigLabel } from "../components/ui";

/* ------------------------------------------------------------------ model */
export const CYCLES = ["P2P", "O2C", "R2R", "H2R", "Cash/Bank", "Inventory", "Fixed Assets", "Treasury", "Tax/Compliance", "ITGC"] as const;
const EVIDENCE = ["Not requested", "Requested", "Partial", "Received"] as const;
const STATUS = ["Not started", "In testing", "Blocked", "Complete"] as const;
const RESULT = ["Pending", "Effective", "Exception"] as const;
const RATING = ["—", "Low", "Medium", "High"] as const;
const REVIEW = ["Open", "Notes raised", "Reviewed"] as const;

type Test = {
  id: string;
  cycle: (typeof CYCLES)[number];
  ref: string;
  objective: string;
  procedure: string;
  population: string;
  sample: number;
  tested: number;
  owner: string;
  evidence: (typeof EVIDENCE)[number];
  status: (typeof STATUS)[number];
  result: (typeof RESULT)[number];
  rating: (typeof RATING)[number];
  exception: string;
  preparer: string;
  reviewer: string;
  review: (typeof REVIEW)[number];
  note: string;
  due: string;
};

type Profile = { entity: string; engagement: string; period: string; lead: string };

const uid = () => Math.random().toString(36).slice(2, 10);
const today = new Date();
const inDays = (d: number) => new Date(today.getTime() + d * 864e5).toISOString().slice(0, 10);

function defaults(): { profile: Profile; tests: Test[] } {
  const t = (p: Partial<Test>): Test => ({
    id: uid(), cycle: "P2P", ref: "", objective: "", procedure: "", population: "", sample: 0, tested: 0, owner: "",
    evidence: "Not requested", status: "Not started", result: "Pending", rating: "—", exception: "", preparer: "", reviewer: "",
    review: "Open", note: "", due: inDays(14), ...p,
  });
  return {
    profile: { entity: "Example Manufacturing Pvt Ltd", engagement: "Internal audit — H1", period: "Apr–Sep 2026", lead: "A. Sharma" },
    tests: [
      t({ cycle: "P2P", ref: "P2P-01", objective: "Vendor master changes are authorised", procedure: "Inspect change log; agree to approved change request", population: "412 changes", sample: 25, tested: 25, owner: "AP lead", evidence: "Received", status: "Complete", result: "Exception", rating: "Medium", exception: "2 changes lacked secondary approval", preparer: "R. Iyer", reviewer: "A. Sharma", review: "Notes raised", note: "Confirm root cause with IT", due: inDays(-2) }),
      t({ cycle: "P2P", ref: "P2P-02", objective: "Invoices are three-way matched before payment", procedure: "Re-perform PO–GRN–invoice match", population: "8,940 invoices", sample: 40, tested: 22, owner: "AP lead", evidence: "Partial", status: "In testing", preparer: "R. Iyer", reviewer: "A. Sharma", due: inDays(3) }),
      t({ cycle: "O2C", ref: "O2C-01", objective: "Credit limits are approved and enforced", procedure: "Inspect limit overrides and approvals", population: "1,260 customers", sample: 25, tested: 10, owner: "Credit controller", evidence: "Requested", status: "In testing", preparer: "S. Thomas", reviewer: "A. Sharma", due: inDays(5) }),
      t({ cycle: "R2R", ref: "R2R-01", objective: "Manual journals are reviewed and approved", procedure: "Inspect approval evidence for manual JEs", population: "2,115 JEs", sample: 30, tested: 30, owner: "Financial controller", evidence: "Received", status: "Complete", result: "Exception", rating: "High", exception: "4 JEs posted and approved by same user", preparer: "S. Thomas", reviewer: "A. Sharma", review: "Open", due: inDays(-1) }),
      t({ cycle: "H2R", ref: "H2R-01", objective: "Leavers are removed from payroll on time", procedure: "Agree exits to final settlement & payroll cut-off", population: "86 exits", sample: 15, tested: 6, owner: "HR ops", evidence: "Partial", status: "Blocked", preparer: "N. Gupta", reviewer: "A. Sharma", note: "HR yet to share exit register", due: inDays(1) }),
      t({ cycle: "Inventory", ref: "INV-01", objective: "Slow-moving stock is reviewed for provision", procedure: "Inspect ageing review and provision workings", population: "Quarterly review", sample: 2, tested: 1, owner: "Plant controller", evidence: "Requested", status: "In testing", preparer: "N. Gupta", reviewer: "A. Sharma", due: inDays(6) }),
      t({ cycle: "Treasury", ref: "TRE-01", objective: "Bank portal access is restricted", procedure: "Compare user list to authorised signatories", population: "3 banks", sample: 3, tested: 0, owner: "Treasury", evidence: "Not requested", status: "Blocked", preparer: "R. Iyer", reviewer: "A. Sharma", note: "Awaiting bank user extracts", due: inDays(4) }),
      t({ cycle: "Tax/Compliance", ref: "TAX-01", objective: "TDS deducted is reconciled to returns", procedure: "Reconcile ledger TDS to quarterly returns", population: "2 quarters", sample: 2, tested: 1, owner: "Tax manager", evidence: "Partial", status: "In testing", result: "Exception", rating: "Low", exception: "Minor timing difference in Q1", preparer: "S. Thomas", reviewer: "A. Sharma", due: inDays(8) }),
      t({ cycle: "ITGC", ref: "ITGC-01", objective: "Leaver access is revoked within 3 days", procedure: "Agree HR leavers to AD/ERP disable dates", population: "86 leavers", sample: 20, tested: 0, owner: "IT security", evidence: "Not requested", status: "Blocked", preparer: "N. Gupta", reviewer: "A. Sharma", due: inDays(9) }),
    ],
  };
}

const STORAGE_KEY = "tool.fieldwork-tracker.v1";

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ReturnType<typeof defaults>;
  } catch { /* storage unavailable */ }
  return defaults();
}

/* --------------------------------------------------------------- metrics */
const statusWeight: Record<Test["status"], number> = { "Not started": 0, "In testing": 0.5, Blocked: 0.25, Complete: 1 };
const evidenceWeight: Record<Test["evidence"], number> = { "Not requested": 0, Requested: 0.15, Partial: 0.5, Received: 1 };
const pct = (n: number) => `${Math.round(n * 100)}%`;
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function metrics(tests: Test[]) {
  return {
    tests: tests.length,
    workflow: avg(tests.map((t) => statusWeight[t.status])),
    evidence: avg(tests.map((t) => evidenceWeight[t.evidence])),
    inTesting: tests.filter((t) => t.status === "In testing").length,
    reviewed: tests.filter((t) => t.review === "Reviewed").length,
    exceptions: tests.filter((t) => t.result === "Exception").length,
    blocked: tests.filter((t) => t.status === "Blocked").length,
    evidenceBlockers: tests.filter((t) => t.evidence !== "Received" && t.status !== "Not started").length,
  };
}

/* ------------------------------------------------------------- component */
export default function FieldworkTracker() {
  const [state, setState] = useState(load);
  const [cycle, setCycle] = useState<string>("All");
  const { profile, tests } = state;

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [state]);

  const visible = cycle === "All" ? tests : tests.filter((t) => t.cycle === cycle);
  const m = useMemo(() => metrics(visible), [visible]);
  const byCycle = useMemo(
    () => CYCLES.map((c) => ({ cycle: c, tests: tests.filter((t) => t.cycle === c) })).filter((g) => g.tests.length),
    [tests],
  );

  const setProfile = (k: keyof Profile, v: string) => setState((s) => ({ ...s, profile: { ...s.profile, [k]: v } }));
  const update = (id: string, patch: Partial<Test>) => setState((s) => ({ ...s, tests: s.tests.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  const remove = (id: string) => setState((s) => ({ ...s, tests: s.tests.filter((t) => t.id !== id) }));
  const add = () => {
    const c = (cycle === "All" ? "P2P" : cycle) as Test["cycle"];
    const n = tests.filter((t) => t.cycle === c).length + 1;
    const prefix = c.replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase();
    setState((s) => ({
      ...s,
      tests: [...s.tests, {
        id: uid(), cycle: c, ref: `${prefix}-${String(n).padStart(2, "0")}`, objective: "", procedure: "", population: "", sample: 0, tested: 0,
        owner: "", evidence: "Not requested", status: "Not started", result: "Pending", rating: "—", exception: "", preparer: "", reviewer: "",
        review: "Open", note: "", due: inDays(14),
      }],
    }));
  };
  const reset = () => { if (confirm("Reset the tracker to the sample tests? Your changes will be lost.")) setState(defaults()); };

  return (
    <div className="space-y-6">
      {/* Profile + actions */}
      <div className="rounded-xl border border-line bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {([["entity", "Entity"], ["engagement", "Engagement"], ["period", "Period"], ["lead", "Fieldwork lead"]] as const).map(([k, label]) => (
              <label key={k} className="block">
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">{label}</span>
                <input value={profile[k]} onChange={(e) => setProfile(k, e.target.value)} className="h-9 w-full rounded-md border border-line px-2.5 text-sm focus:border-accent focus:outline-none" />
              </label>
            ))}
          </div>
          <div className="no-print flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={add}><Plus className="size-3.5" /> Add test</Button>
            <Button size="sm" variant="ghost" onClick={reset}><RotateCcw className="size-3.5" /> Reset</Button>
            <Button size="sm" variant="secondary" onClick={() => exportPdf(profile, tests)}><FileDown className="size-3.5" /> PDF report</Button>
            <Button size="sm" variant="accent" onClick={() => exportExcel(profile, tests)}><Download className="size-3.5" /> Excel</Button>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <Metric label="Tests" value={String(m.tests)} />
        <Metric label="Workflow" value={pct(m.workflow)} bar={m.workflow} />
        <Metric label="Evidence" value={pct(m.evidence)} bar={m.evidence} />
        <Metric label="In testing" value={String(m.inTesting)} />
        <Metric label="Reviewed" value={String(m.reviewed)} />
        <Metric label="Exceptions" value={String(m.exceptions)} tone={m.exceptions ? "red" : undefined} />
        <Metric label="Blocked" value={String(m.blocked)} tone={m.blocked ? "amber" : undefined} />
      </div>

      {/* Cycle filter */}
      <div className="no-print flex flex-wrap gap-1.5">
        {["All", ...CYCLES].map((c) => {
          const count = c === "All" ? tests.length : tests.filter((t) => t.cycle === c).length;
          return (
            <button key={c} onClick={() => setCycle(c)} className={cx("rounded-full border px-3 py-1 text-xs", cycle === c ? "border-ink bg-ink text-paper" : "border-line bg-white text-ink-2 hover:border-ink/30")}>
              {c} <span className="opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[2300px] text-left text-xs">
          <thead className="bg-paper-2/70 font-mono text-[10px] tracking-wider text-muted uppercase">
            <tr>
              {["Cycle", "Ref", "Control objective", "Test procedure", "Population", "Sample", "Tested", "Evidence owner", "Evidence", "Status", "Result", "Rating", "Exception", "Preparer", "Reviewer", "Review", "Review note", "Due", ""].map((h) => (
                <th key={h} className="px-2 py-2.5 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {visible.map((t) => {
              const overdue = t.status !== "Complete" && t.due && t.due < new Date().toISOString().slice(0, 10);
              return (
                <tr key={t.id} className="align-top hover:bg-paper/60">
                  <td className="px-2 py-1.5"><Sel value={t.cycle} options={CYCLES} onChange={(v) => update(t.id, { cycle: v as Test["cycle"] })} /></td>
                  <td className="px-2 py-1.5"><Txt value={t.ref} onChange={(v) => update(t.id, { ref: v })} w="w-20" mono /></td>
                  <td className="px-2 py-1.5"><Txt value={t.objective} onChange={(v) => update(t.id, { objective: v })} w="w-56" area /></td>
                  <td className="px-2 py-1.5"><Txt value={t.procedure} onChange={(v) => update(t.id, { procedure: v })} w="w-56" area /></td>
                  <td className="px-2 py-1.5"><Txt value={t.population} onChange={(v) => update(t.id, { population: v })} w="w-28" /></td>
                  <td className="px-2 py-1.5"><Num value={t.sample} onChange={(v) => update(t.id, { sample: v })} /></td>
                  <td className="px-2 py-1.5"><Num value={t.tested} onChange={(v) => update(t.id, { tested: v })} max={t.sample || undefined} /></td>
                  <td className="px-2 py-1.5"><Txt value={t.owner} onChange={(v) => update(t.id, { owner: v })} w="w-32" /></td>
                  <td className="px-2 py-1.5"><Sel value={t.evidence} options={EVIDENCE} onChange={(v) => update(t.id, { evidence: v as Test["evidence"] })} tone={t.evidence === "Received" ? "green" : t.evidence === "Partial" ? "amber" : undefined} /></td>
                  <td className="px-2 py-1.5"><Sel value={t.status} options={STATUS} onChange={(v) => update(t.id, { status: v as Test["status"] })} tone={t.status === "Complete" ? "green" : t.status === "Blocked" ? "amber" : t.status === "In testing" ? "blue" : undefined} /></td>
                  <td className="px-2 py-1.5"><Sel value={t.result} options={RESULT} onChange={(v) => update(t.id, { result: v as Test["result"] })} tone={t.result === "Exception" ? "red" : t.result === "Effective" ? "green" : undefined} /></td>
                  <td className="px-2 py-1.5"><Sel value={t.rating} options={RATING} onChange={(v) => update(t.id, { rating: v as Test["rating"] })} tone={t.rating === "High" ? "red" : t.rating === "Medium" ? "amber" : undefined} /></td>
                  <td className="px-2 py-1.5"><Txt value={t.exception} onChange={(v) => update(t.id, { exception: v })} w="w-52" area /></td>
                  <td className="px-2 py-1.5"><Txt value={t.preparer} onChange={(v) => update(t.id, { preparer: v })} w="w-24" /></td>
                  <td className="px-2 py-1.5"><Txt value={t.reviewer} onChange={(v) => update(t.id, { reviewer: v })} w="w-24" /></td>
                  <td className="px-2 py-1.5"><Sel value={t.review} options={REVIEW} onChange={(v) => update(t.id, { review: v as Test["review"] })} tone={t.review === "Reviewed" ? "green" : t.review === "Notes raised" ? "amber" : undefined} /></td>
                  <td className="px-2 py-1.5"><Txt value={t.note} onChange={(v) => update(t.id, { note: v })} w="w-48" area /></td>
                  <td className="px-2 py-1.5">
                    <input type="date" value={t.due} onChange={(e) => update(t.id, { due: e.target.value })} className={cx("h-8 rounded border px-1.5 font-mono text-[11px]", overdue ? "border-danger/40 bg-danger-soft text-danger" : "border-line")} />
                  </td>
                  <td className="px-2 py-1.5">
                    <button onClick={() => remove(t.id)} aria-label={`Remove ${t.ref}`} className="rounded p-1.5 text-muted hover:bg-danger-soft hover:text-danger"><Trash2 className="size-3.5" /></button>
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr><td colSpan={19} className="px-4 py-10 text-center text-sm text-muted">No tests in this cycle yet. Use “Add test”.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Cycle cards */}
      <div>
        <FigLabel>Cycle summary</FigLabel>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {byCycle.map(({ cycle: c, tests: ts }) => {
            const cm = metrics(ts);
            return (
              <button key={c} onClick={() => setCycle(c)} className={cx("rounded-xl border bg-white p-4 text-left hover:border-ink/40", cycle === c ? "border-ink" : "border-line")}>
                <div className="flex items-baseline justify-between">
                  <p className="font-semibold">{c}</p>
                  <span className="font-mono text-sm">{pct(cm.workflow)}</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-paper-2"><div className="h-full rounded-full bg-accent" style={{ width: pct(cm.workflow) }} /></div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-muted">
                  <div><dt>Tests</dt><dd className="font-mono text-sm text-ink">{cm.tests}</dd></div>
                  <div><dt>Exceptions</dt><dd className={cx("font-mono text-sm", cm.exceptions ? "text-danger" : "text-ink")}>{cm.exceptions}</dd></div>
                  <div><dt>Evidence gaps</dt><dd className={cx("font-mono text-sm", cm.evidenceBlockers ? "text-amber" : "text-ink")}>{cm.evidenceBlockers}</dd></div>
                </dl>
              </button>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-muted">Saved in this browser only. Nothing is sent to our servers.</p>
    </div>
  );
}

/* --------------------------------------------------------------- inputs */
const toneCls = { green: "bg-accent-soft text-accent-2 border-accent/20", amber: "bg-amber-soft text-amber border-amber/20", red: "bg-danger-soft text-danger border-danger/20", blue: "bg-info-soft text-info border-info/20" };

function Sel({ value, options, onChange, tone }: { value: string; options: readonly string[]; onChange: (v: string) => void; tone?: keyof typeof toneCls }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={cx("h-8 rounded border px-1.5 text-[11px] font-medium", tone ? toneCls[tone] : "border-line bg-white")}>
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>
  );
}

function Txt({ value, onChange, w, area, mono }: { value: string; onChange: (v: string) => void; w: string; area?: boolean; mono?: boolean }) {
  const cls = cx("rounded border border-transparent px-1.5 py-1 text-xs hover:border-line focus:border-accent focus:outline-none", w, mono && "font-mono");
  return area
    ? <textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} className={cx(cls, "resize-y leading-snug")} />
    : <input value={value} onChange={(e) => onChange(e.target.value)} className={cx(cls, "h-8")} />;
}

function Num({ value, onChange, max }: { value: number; onChange: (v: number) => void; max?: number }) {
  return <input type="number" min={0} max={max} value={value} onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))} className="h-8 w-16 rounded border border-line px-1.5 font-mono text-xs" />;
}

function Metric({ label, value, bar, tone }: { label: string; value: string; bar?: number; tone?: "red" | "amber" }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <p className="text-[11px] text-muted">{label}</p>
      <p className={cx("mt-1 font-mono text-2xl", tone === "red" && "text-danger", tone === "amber" && "text-amber")}>{value}</p>
      {bar !== undefined && <div className="mt-2 h-1 rounded-full bg-paper-2"><div className="h-full rounded-full bg-accent" style={{ width: pct(bar) }} /></div>}
    </div>
  );
}

/* --------------------------------------------------------------- exports */
const headers = ["Cycle", "Ref", "Control objective", "Test procedure", "Population", "Sample", "Tested", "Evidence owner", "Evidence", "Status", "Result", "Rating", "Exception", "Preparer", "Reviewer", "Review", "Review note", "Due"];
const row = (t: Test) => [t.cycle, t.ref, t.objective, t.procedure, t.population, t.sample, t.tested, t.owner, t.evidence, t.status, t.result, t.rating, t.exception, t.preparer, t.reviewer, t.review, t.note, t.due];
const fileBase = (p: Profile) => `fieldwork-tracker-${(p.entity || "entity").replace(/[^\w]+/g, "-").toLowerCase()}`;

async function exportExcel(profile: Profile, tests: Test[]) {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const m = metrics(tests);
  const bold = (v: string) => ({ value: v, fontWeight: "bold" as const });
  const summary = [
    [bold("Fieldwork testing tracker")],
    [],
    ...([["Entity", profile.entity], ["Engagement", profile.engagement], ["Period", profile.period], ["Fieldwork lead", profile.lead], ["Exported", new Date().toLocaleString("en-IN")]] as const).map(([k, v]) => [bold(k), v]),
    [],
    [bold("Tests"), m.tests], [bold("Workflow %"), Math.round(m.workflow * 100)], [bold("Evidence %"), Math.round(m.evidence * 100)],
    [bold("In testing"), m.inTesting], [bold("Reviewed"), m.reviewed], [bold("Exceptions"), m.exceptions], [bold("Blocked"), m.blocked],
  ];
  const data = [headers.map((h) => ({ value: h, fontWeight: "bold" as const, backgroundColor: "#E2EFE9" })), ...tests.map(row)];
  await writeXlsxFile(
    [
      { sheet: "Summary", data: summary, columns: [{ width: 18 }, { width: 40 }] },
      { sheet: "Tests", data, stickyRowsCount: 1, columns: headers.map((h) => ({ width: ["Control objective", "Test procedure", "Exception", "Review note"].includes(h) ? 40 : 14 })) },
    ],
  ).toFile(`${fileBase(profile)}.xlsx`);
}

async function exportPdf(profile: Profile, tests: Test[]) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const m = metrics(tests);
  doc.setFontSize(16);
  doc.text("Fieldwork testing tracker", 40, 46);
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text(`${profile.entity}  ·  ${profile.engagement}  ·  ${profile.period}  ·  Lead: ${profile.lead}`, 40, 64);
  doc.text(
    `Tests ${m.tests}   Workflow ${pct(m.workflow)}   Evidence ${pct(m.evidence)}   In testing ${m.inTesting}   Reviewed ${m.reviewed}   Exceptions ${m.exceptions}   Blocked ${m.blocked}`,
    40, 80,
  );
  autoTable(doc, {
    startY: 96,
    head: [["Cycle", "Ref", "Objective", "Sample", "Tested", "Evidence", "Status", "Result", "Rating", "Exception", "Reviewer", "Review", "Due"]],
    body: tests.map((t) => [t.cycle, t.ref, t.objective, t.sample, t.tested, t.evidence, t.status, t.result, t.rating, t.exception, t.reviewer, t.review, t.due]),
    styles: { fontSize: 7, cellPadding: 4, valign: "top" },
    headStyles: { fillColor: [20, 22, 26], textColor: 255, fontStyle: "bold" },
    columnStyles: { 2: { cellWidth: 150 }, 9: { cellWidth: 130 } },
    alternateRowStyles: { fillColor: [247, 246, 242] },
  });
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(140);
    doc.text(`Generated ${new Date().toLocaleString("en-IN")} · Informational only — not professional advice · Page ${i} of ${pages}`, 40, doc.internal.pageSize.getHeight() - 20);
  }
  doc.save(`${fileBase(profile)}.pdf`);
}
