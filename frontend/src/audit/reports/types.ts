import type { ControlTest, Engagement, QueryRow } from "../types";

export type ReportData = {
  firm: string;
  generated_at: string;
  generated_by: string;
  engagement: Engagement & { client: NonNullable<Engagement["client"]> };
  summary: {
    processes: number;
    controls: number;
    passed: number;
    failed: number;
    queries_open: number;
    queries_closed: number;
    failed_by_rating: { high: number; medium: number; low: number };
  };
  processes: {
    id: number;
    code: string | null;
    name: string;
    assignee: string | null;
    completed_at: string | null;
    controls: number;
    passed: number;
    failed: number;
    risks: { code: string | null; title: string; rating: string; controls: ControlTest[] }[];
  }[];
  queries: QueryRow[];
};

export const auditTypeLabel = (t: string) => (t === "statutory" ? "Statutory audit" : "Internal audit");

export const longDate = (d: string | null | undefined) =>
  d ? new Date(d.length === 10 ? `${d}T00:00:00` : d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—";

export const fileBase = (r: ReportData) =>
  `${r.engagement.client.name} ${r.engagement.period === "FY" ? r.engagement.fy_label : `${r.engagement.fy_label} ${r.engagement.period}`} ${auditTypeLabel(r.engagement.audit_type)}`
    .replace(/[^\w\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "-");
