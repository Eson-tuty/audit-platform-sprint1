import { useState } from "react";
import { cx, FigLabel } from "../components/ui";

const BENCHMARKS = [
  { key: "pbt", label: "Profit before tax", range: [5, 10], note: "Stable, profit-oriented entities" },
  { key: "revenue", label: "Revenue", range: [0.5, 1], note: "Loss-making or thin-margin entities" },
  { key: "assets", label: "Total assets", range: [1, 2], note: "Asset-heavy entities, investment holding" },
  { key: "equity", label: "Net assets / equity", range: [1, 5], note: "Funds, NBFCs, holding companies" },
  { key: "expenses", label: "Total expenses", range: [0.5, 2], note: "Not-for-profit, cost centres" },
] as const;

const inr = (n: number) => (Number.isFinite(n) ? `₹${Math.round(n).toLocaleString("en-IN")}` : "—");

export default function MaterialityCalculator() {
  const [bKey, setBKey] = useState<(typeof BENCHMARKS)[number]["key"]>("pbt");
  const b = BENCHMARKS.find((x) => x.key === bKey)!;
  const [amount, setAmount] = useState(85_200_000);
  const [rate, setRate] = useState<number>(5);
  const [pmRate, setPmRate] = useState(65);
  const [trivialRate, setTrivialRate] = useState(5);

  const overall = (amount * rate) / 100;
  const pm = (overall * pmRate) / 100;
  const trivial = (overall * trivialRate) / 100;
  const outOfRange = rate < b.range[0] || rate > b.range[1];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-5 rounded-xl border border-line bg-white p-6">
        <div>
          <span className="mb-2 block text-xs font-medium">Benchmark</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {BENCHMARKS.map((x) => (
              <button
                key={x.key}
                onClick={() => { setBKey(x.key); setRate(x.range[0]); }}
                className={cx("rounded-lg border p-3 text-left", bKey === x.key ? "border-ink bg-paper-2" : "border-line hover:border-ink/30")}
              >
                <p className="text-sm font-medium">{x.label}</p>
                <p className="mt-0.5 font-mono text-[11px] text-muted">{x.range[0]}–{x.range[1]}% · {x.note}</p>
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium">{b.label} (₹)</span>
          <input type="number" min={0} value={amount} onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))} className="h-10 w-full rounded-lg border border-line px-3 font-mono text-sm" />
        </label>
        <div className="grid grid-cols-3 gap-3">
          <Pct label="Overall %" value={rate} onChange={setRate} step={0.25} />
          <Pct label="Performance %" value={pmRate} onChange={setPmRate} step={5} />
          <Pct label="Trivial %" value={trivialRate} onChange={setTrivialRate} step={1} />
        </div>
        {outOfRange && <p className="rounded-lg bg-amber-soft px-3 py-2 text-xs text-amber">{rate}% is outside the commonly used {b.range[0]}–{b.range[1]}% range for {b.label.toLowerCase()}. Document your rationale.</p>}
      </div>

      <div className="rounded-xl border border-line bg-white">
        {[
          ["Overall materiality", overall, `${rate}% of ${b.label.toLowerCase()}`],
          ["Performance materiality", pm, `${pmRate}% of overall — typically 50–75%`],
          ["Clearly trivial threshold", trivial, `${trivialRate}% of overall — typically 3–5%`],
        ].map(([label, value, hint], i) => (
          <div key={label as string} className={cx("p-6", i > 0 && "border-t border-line")}>
            <FigLabel>{label as string}</FigLabel>
            <p className={cx("mt-2 font-mono", i === 0 ? "text-4xl" : "text-2xl")}>{inr(value as number)}</p>
            <p className="mt-1 text-xs text-muted">{hint as string}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Pct({ label, value, onChange, step }: { label: string; value: number; onChange: (v: number) => void; step: number }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium">{label}</span>
      <input type="number" min={0} max={100} step={step} value={value} onChange={(e) => onChange(Math.min(100, Math.max(0, Number(e.target.value) || 0)))} className="h-10 w-full rounded-lg border border-line px-3 font-mono text-sm" />
    </label>
  );
}
