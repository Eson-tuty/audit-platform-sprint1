import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button, cx } from "../components/ui";

/** Generic repeatable-row editor used for FAQs, features, stats, plans, sources… */
export function ListEditor<T>({
  items, onChange, render, blank, addLabel = "Add item", max,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  render: (item: T, update: (patch: Partial<T>) => void, index: number) => ReactNode;
  blank: () => T;
  addLabel?: string;
  max?: number;
}) {
  const update = (i: number, patch: Partial<T>) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex gap-2 rounded-lg border border-line bg-paper/50 p-3">
          <div className="min-w-0 flex-1 space-y-2">{render(it, (p) => update(i, p), i)}</div>
          <RowControls
            onUp={i > 0 ? () => onChange(move(items, i, i - 1)) : undefined}
            onDown={i < items.length - 1 ? () => onChange(move(items, i, i + 1)) : undefined}
            onRemove={() => onChange(items.filter((_, j) => j !== i))}
          />
        </div>
      ))}
      {(!max || items.length < max) && (
        <Button type="button" size="sm" variant="secondary" onClick={() => onChange([...items, blank()])}><Plus className="size-3.5" /> {addLabel}</Button>
      )}
    </div>
  );
}

export function RowControls({ onUp, onDown, onRemove, className }: { onUp?: () => void; onDown?: () => void; onRemove: () => void; className?: string }) {
  const btn = "rounded p-1 text-muted hover:bg-paper-2 hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent";
  return (
    <div className={cx("flex shrink-0 flex-col gap-0.5", className)}>
      <button type="button" className={btn} onClick={onUp} disabled={!onUp} aria-label="Move up"><ArrowUp className="size-3.5" /></button>
      <button type="button" className={btn} onClick={onDown} disabled={!onDown} aria-label="Move down"><ArrowDown className="size-3.5" /></button>
      <button type="button" className={cx(btn, "hover:bg-danger-soft hover:text-danger")} onClick={onRemove} aria-label="Remove"><Trash2 className="size-3.5" /></button>
    </div>
  );
}

export function move<T>(arr: T[], from: number, to: number): T[] {
  const copy = [...arr];
  const [x] = copy.splice(from, 1);
  copy.splice(to, 0, x);
  return copy;
}
