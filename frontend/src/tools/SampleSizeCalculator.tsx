import { useMemo, useState } from "react";
import { cx, FigLabel } from "../components/ui";

/** P(X <= k) for X ~ Poisson(lambda) */
function poissonCdf(k: number, lambda: number) {
  let term = Math.exp(-lambda);
  let sum = term;
  for (let i = 1; i <= k; i++) {
    term *= lambda / i;
    sum += term;
  }
  return sum;
}

/**
 * Smallest n such that, allowing floor(n * expected) deviations, the upper
 * deviation limit at the chosen confidence stays within the tolerable rate.
 */
export function attributeSampleSize(confidence: number, tolerable: number, expected: number) {
  if (tolerable <= 0 || expected >= tolerable) return null;
  for (let n = 1; n <= 5000; n++) {
    const k = Math.floor(n * expected);
    if (poissonCdf(k, n * tolerable) <= 1 - confidence) return { n, k };
  }
  return null;
}

const CONF = [0.9, 0.95, 0.99];

export default function SampleSizeCalculator() {
  const [confidence, setConfidence] = useState(0.95);
  const [tolerable, setTolerable] = useState(5);
  const [expected, setExpected] = useState(0);
  const [population, setPopulation] = useState<number | "">("");

  const result = useMemo(() => attributeSampleSize(confidence, tolerable / 100, expected / 100), [confidence, tolerable, expected]);
  const adjusted = result && population && population > 0 ? Math.min(population, Math.ceil(result.n / (1 + result.n / population))) : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <div className="space-y-5 rounded-xl border border-line bg-white p-6">
        <div>
          <span className="mb-2 block text-xs font-medium">Confidence level</span>
          <div className="flex gap-2">
            {CONF.map((c) => (
              <button key={c} onClick={() => setConfidence(c)} className={cx("flex-1 rounded-lg border py-2 font-mono text-sm", confidence === c ? "border-ink bg-ink text-paper" : "border-line hover:border-ink/30")}>
                {c * 100}%
              </button>
            ))}
          </div>
        </div>
        <Slider label="Tolerable deviation rate" value={tolerable} min={1} max={20} step={0.5} onChange={setTolerable} />
        <Slider label="Expected deviation rate" value={expected} min={0} max={Math.max(0, tolerable - 0.5)} step={0.25} onChange={setExpected} />
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium">Population size (optional)</span>
          <input type="number" min={1} value={population} onChange={(e) => setPopulation(e.target.value ? Math.max(1, Number(e.target.value)) : "")} placeholder="e.g. 412" className="h-10 w-full rounded-lg border border-line px-3 font-mono text-sm" />
          <span className="mt-1 block text-xs text-muted">Applies a finite population correction for small populations.</span>
        </label>
      </div>

      <div className="flex flex-col justify-between rounded-xl border border-line bg-ink p-6 text-paper">
        <div>
          <FigLabel className="text-paper/50">Recommended sample size</FigLabel>
          {result ? (
            <>
              <p className="mt-3 font-serif text-8xl leading-none">{adjusted ?? result.n}</p>
              <p className="mt-3 text-sm text-paper/70">
                Test {adjusted ?? result.n} items. Conclude the control is effective if you find <strong className="text-paper">{result.k}</strong> or fewer deviations.
              </p>
              {adjusted && adjusted !== result.n && <p className="mt-1 text-xs text-paper/50">Unadjusted (large population): {result.n}</p>}
            </>
          ) : (
            <p className="mt-3 text-paper/70">Expected deviations must be below the tolerable rate.</p>
          )}
        </div>
        <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-paper/15 pt-5 font-mono text-xs">
          <div><dt className="text-paper/50">Confidence</dt><dd className="mt-1 text-base">{confidence * 100}%</dd></div>
          <div><dt className="text-paper/50">Tolerable</dt><dd className="mt-1 text-base">{tolerable}%</dd></div>
          <div><dt className="text-paper/50">Expected</dt><dd className="mt-1 text-base">{expected}%</dd></div>
        </dl>
      </div>
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="mb-2 flex justify-between text-xs font-medium">{label}<span className="font-mono">{value}%</span></span>
      <input type="range" min={min} max={max} step={step} value={Math.min(value, max)} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[var(--color-accent)]" />
    </label>
  );
}
