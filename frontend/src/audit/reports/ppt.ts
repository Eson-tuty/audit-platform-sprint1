import PptxGenJS from "pptxgenjs";
import { auditTypeLabel, fileBase, longDate, type ReportData } from "./types";

const INK = "14161A";
const MUTED = "5D6370";
const PAPER = "F7F6F2";
const LINE = "E2DFD6";
const ACCENT = "1F6F5C";
const PASS = "1A8A6E";
const FAIL = "B42318";
const FONT = "Calibri";

type Cell = PptxGenJS.TableCell;
/** pptxgenjs wants every table cell as { text, options }. */
const row = (cells: (string | Cell)[]): Cell[] => cells.map((c) => (typeof c === "string" ? { text: c } : c));

const clip = (s: string | null | undefined, n: number) => (!s ? "—" : s.length > n ? `${s.slice(0, n - 1)}…` : s);

export async function downloadPptReport(r: ReportData) {
  const e = r.engagement;
  const s = r.summary;
  const type = auditTypeLabel(e.audit_type);
  const period = e.period === "FY" ? e.fy_label : `${e.fy_label} ${e.period}`;

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
  pptx.title = `${type} summary — ${e.client.name}`;
  pptx.company = r.firm;

  pptx.defineSlideMaster({
    title: "CONTENT",
    background: { color: "FFFFFF" },
    objects: [
      { rect: { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: ACCENT } } },
      { text: { text: `${e.client.name} · ${type} · ${period}`, options: { x: 0.5, y: 7.05, w: 9, h: 0.3, fontFace: FONT, fontSize: 9, color: MUTED } } },
    ],
    slideNumber: { x: 12.3, y: 7.05, w: 0.6, h: 0.3, fontFace: FONT, fontSize: 9, color: MUTED, align: "right" },
  });

  const title = (slide: PptxGenJS.Slide, text: string, sub?: string) => {
    slide.addText(text, { x: 0.5, y: 0.35, w: 12.3, h: 0.6, fontFace: FONT, fontSize: 26, bold: true, color: INK });
    if (sub) slide.addText(sub, { x: 0.5, y: 0.95, w: 12.3, h: 0.4, fontFace: FONT, fontSize: 13, color: MUTED });
  };
  const header = (cells: string[]): Cell[] => cells.map((t) => ({ text: t, options: { bold: true, fill: { color: PAPER }, color: INK } }));

  // 1. Cover
  const cover = pptx.addSlide();
  cover.background = { color: PAPER };
  cover.addShape("rect", { x: 0, y: 0, w: 0.25, h: 7.5, fill: { color: ACCENT } });
  cover.addText(r.firm.toUpperCase(), { x: 0.9, y: 1.6, w: 11, h: 0.4, fontFace: FONT, fontSize: 14, bold: true, color: ACCENT, charSpacing: 2 });
  cover.addText(`${type} — summary of findings`, { x: 0.9, y: 2.1, w: 11.5, h: 1.0, fontFace: FONT, fontSize: 40, bold: true, color: INK });
  cover.addText(e.client.name, { x: 0.9, y: 3.2, w: 11, h: 0.6, fontFace: FONT, fontSize: 24, color: INK });
  cover.addText(`${period}  ·  ${longDate(e.period_start)} – ${longDate(e.period_end)}`, { x: 0.9, y: 3.8, w: 11, h: 0.4, fontFace: FONT, fontSize: 16, color: MUTED });
  cover.addText(`Prepared by ${r.generated_by} · ${longDate(r.generated_at)}`, { x: 0.9, y: 6.4, w: 11, h: 0.4, fontFace: FONT, fontSize: 12, color: MUTED });

  // 2. At a glance — headline numbers + stacked bar by process
  const glance = pptx.addSlide({ masterName: "CONTENT" });
  title(glance, "At a glance", `${s.controls} controls tested across ${s.processes} process${s.processes === 1 ? "" : "es"}`);
  const tiles: [string, string, string][] = [
    ["Controls tested", String(s.controls), INK],
    ["Operating effectively", `${s.passed}`, PASS],
    ["Exceptions noted", String(s.failed), s.failed ? FAIL : INK],
    ["Exceptions still open", String(s.queries_open), s.queries_open ? FAIL : INK],
  ];
  tiles.forEach(([label, value, color], i) => {
    const x = 0.5 + i * 3.1;
    glance.addShape("roundRect", { x, y: 1.55, w: 2.9, h: 1.3, fill: { color: "FFFFFF" }, line: { color: LINE, width: 1 }, rectRadius: 0.08 });
    glance.addText(value, { x: x + 0.2, y: 1.65, w: 2.5, h: 0.7, fontFace: FONT, fontSize: 32, bold: true, color });
    glance.addText(label, { x: x + 0.2, y: 2.3, w: 2.5, h: 0.4, fontFace: FONT, fontSize: 12, color: MUTED });
  });
  const procs = [...r.processes].reverse(); // horizontal bars are drawn bottom-up
  glance.addChart("bar", [
    { name: "Passed", labels: procs.map((p) => p.name), values: procs.map((p) => p.passed) },
    { name: "Failed", labels: procs.map((p) => p.name), values: procs.map((p) => p.failed) },
  ], {
    x: 0.5, y: 3.1, w: 8.2, h: 3.8, barDir: "bar", barGrouping: "stacked", barGapWidthPct: 60,
    chartColors: [PASS, FAIL], showLegend: true, legendPos: "t", legendFontSize: 10, legendFontFace: FONT,
    catAxisLabelFontSize: 10, catAxisLabelFontFace: FONT, catAxisLabelColor: INK,
    valAxisLabelFontSize: 9, valAxisLabelColor: MUTED, valGridLine: { color: LINE, size: 0.5 }, valAxisLineShow: false,
    showValue: true, dataLabelFontSize: 9, dataLabelColor: "FFFFFF",
    showTitle: true, title: "Controls by process", titleFontSize: 12, titleColor: INK, titleFontFace: FONT,
  });
  glance.addText("Exceptions by risk rating", { x: 9.1, y: 3.15, w: 3.7, h: 0.4, fontFace: FONT, fontSize: 12, bold: true, color: INK });
  glance.addTable([
    header(["Rating", "Exceptions"]),
    row(["High", String(s.failed_by_rating.high)]),
    row(["Medium", String(s.failed_by_rating.medium)]),
    row(["Low", String(s.failed_by_rating.low)]),
  ], { x: 9.1, y: 3.6, w: 3.7, colW: [2.2, 1.5], fontFace: FONT, fontSize: 11, color: INK, border: { type: "solid", color: LINE, pt: 0.75 }, rowH: 0.4 });

  // 3. Results by process
  const byProcess = pptx.addSlide({ masterName: "CONTENT" });
  title(byProcess, "Results by process");
  byProcess.addTable([
    header(["Process", "Tested by", "Controls", "Passed", "Failed", "Completed"]),
    ...r.processes.map((p) => row([
      p.name, p.assignee ?? "—", String(p.controls), String(p.passed),
      { text: String(p.failed), options: { color: p.failed ? FAIL : INK, bold: p.failed > 0 } },
      longDate(p.completed_at),
    ])),
  ], { x: 0.5, y: 1.3, w: 12.3, colW: [3.6, 2.4, 1.3, 1.3, 1.3, 2.4], fontFace: FONT, fontSize: 12, color: INK, border: { type: "solid", color: LINE, pt: 0.75 }, rowH: 0.45, valign: "middle" });

  // 4+. Key observations, 5 per slide
  const perSlide = 5;
  const pages = Math.max(1, Math.ceil(r.queries.length / perSlide));
  for (let i = 0; i < pages; i++) {
    const slide = pptx.addSlide({ masterName: "CONTENT" });
    title(slide, pages > 1 ? `Key observations (${i + 1}/${pages})` : "Key observations");
    const chunk = r.queries.slice(i * perSlide, (i + 1) * perSlide);
    if (!chunk.length) {
      slide.addText("No exceptions were noted during testing.", { x: 0.5, y: 1.5, w: 12, h: 0.6, fontFace: FONT, fontSize: 16, color: MUTED });
      continue;
    }
    slide.addTable([
      header(["Ref", "Process / control", "Observation", "Management response", "Owner · closure", "Status"]),
      ...chunk.map((q) => row([
        q.reference,
        `${q.process_name}\n${q.control_code ?? ""} ${clip(q.control_title, 70)}`,
        `${clip(q.failure_reason, 170)}\n(${q.failed_samples}/${q.sample_size} samples · ${q.risk_rating} risk)`,
        clip(q.management_response, 150),
        `${q.responsible_person ?? "—"}\n${longDate(q.target_date)}`,
        { text: q.query_status === "closed" ? "Closed" : "Open", options: { color: q.query_status === "closed" ? PASS : FAIL, bold: true } },
      ])),
    ], { x: 0.5, y: 1.25, w: 12.3, colW: [0.9, 2.6, 3.6, 2.8, 1.6, 0.8], fontFace: FONT, fontSize: 10, color: INK, border: { type: "solid", color: LINE, pt: 0.75 }, valign: "top", autoPage: false });
  }

  // Last: next steps
  const open = r.queries.filter((q) => q.query_status === "open").sort((a, b) => (a.target_date ?? "").localeCompare(b.target_date ?? ""));
  const next = pptx.addSlide({ masterName: "CONTENT" });
  title(next, "Next steps", open.length ? `${open.length} open quer${open.length === 1 ? "y" : "ies"} to be retested on or after the agreed closure date` : "All exceptions have been closed");
  if (open.length) {
    next.addTable([
      header(["Ref", "Control", "Person responsible", "Retest from"]),
      ...open.slice(0, 10).map((q) => row([q.reference, `${q.control_code ?? ""} ${clip(q.control_title, 80)}`, q.responsible_person ?? "—", longDate(q.target_date)])),
    ], { x: 0.5, y: 1.5, w: 12.3, colW: [1.2, 6.6, 2.5, 2], fontFace: FONT, fontSize: 12, color: INK, border: { type: "solid", color: LINE, pt: 0.75 }, rowH: 0.42 });
  }

  await pptx.writeFile({ fileName: `${fileBase(r)}-summary.pptx` });
}
