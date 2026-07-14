import {
  escapeHtml as e,
  printRow as row,
  renderPrintHeader,
  openPrintDocument,
  type PrintClinicInfo,
} from "@/lib/print/printDocument";
import {
  resolvePrintLayout,
  resolvePrintShowLogo,
  resolvePrintHeaderImage,
  resolvePrintFooterContent,
} from "@/lib/print/layouts";
import {
  REPORT_TABS,
  type ReportTab,
  type ReportSummary,
  type OpdVisit,
  type BillRow,
  type IpdAdm,
  type CollectionsData,
} from "./types";

export interface ReportPrintData extends PrintClinicInfo {
  tab: ReportTab;
  from: string;
  to: string;
  fmt: (n: number) => string;
  summary?: ReportSummary | null;
  opdRows?: OpdVisit[];
  ipdRows?: { admissions: IpdAdm[]; paidByIpd: Record<string, number> } | null;
  billRows?: BillRow[];
  collectionsData?: CollectionsData | null;
}

const TAB_LABELS = Object.fromEntries(
  REPORT_TABS.map((t) => [t.key, t.label]),
) as Record<ReportTab, string>;

const EXTRA_STYLES = `
  .section-title { margin-top: 14px; }
  .pay-table .sub { font-size: 10.5px; color: #777; font-family: inherit; }
  .pay-table .total-row td { font-weight: bold; border-top: 2px solid #333; background: #f4f4f4; }
`;

interface Col {
  l: string;
  r?: boolean;
}

function tbl(headers: Col[], body: string[][], foot?: string[]): string {
  const cell = (tag: "th" | "td", html: string, i: number) =>
    `<${tag}${headers[i]?.r ? ' class="tr"' : ""}>${html}</${tag}>`;
  const ths = headers.map((h, i) => cell("th", e(h.l), i)).join("");
  const trs = body.length
    ? body
        .map(
          (cells) =>
            `<tr>${cells.map((c, i) => cell("td", c, i)).join("")}</tr>`,
        )
        .join("")
    : `<tr><td colspan="${headers.length}" style="padding:8px 6px;color:#888;text-align:center">No records for this period</td></tr>`;
  const tfoot = foot
    ? `<tr class="total-row">${foot.map((c, i) => cell("td", c, i)).join("")}</tr>`
    : "";
  return `<table class="pay-table"><thead><tr>${ths}</tr></thead><tbody>${trs}${tfoot}</tbody></table>`;
}

function section(title: string, tableHtml: string): string {
  return `<div class="section-title">${e(title)}</div>${tableHtml}`;
}

function patientCell(p?: { name?: string; uhid?: string }): string {
  if (!p?.name) return "—";
  return `${e(p.name)}${p.uhid ? `<div class="sub">${e(p.uhid)}</div>` : ""}`;
}

function summarySections(s: ReportSummary, fmt: (n: number) => string): string {
  const income = tbl(
    [
      { l: "Module" },
      { l: "Count", r: true },
      { l: "Gross", r: true },
      { l: "Collected", r: true },
      { l: "Balance", r: true },
    ],
    [
      ["OPD", String(s.opd.count), fmt(s.opd.amount), fmt(s.opd.amount), "—"],
      [
        "IPD",
        `${s.ipd.admissions} adm / ${s.ipd.discharges} dis`,
        "—",
        fmt(s.ipd.payments),
        "—",
      ],
      [
        "Pharmacy",
        String(s.pharmacy.count),
        fmt(s.pharmacy.amount),
        fmt(s.pharmacy.paid),
        fmt(s.pharmacy.balance),
      ],
      [
        "Pathology",
        String(s.pathology.count),
        fmt(s.pathology.amount),
        fmt(s.pathology.paid),
        fmt(s.pathology.balance),
      ],
      [
        "Radiology",
        String(s.radiology.count),
        fmt(s.radiology.amount),
        fmt(s.radiology.paid),
        fmt(s.radiology.balance),
      ],
    ],
    ["TOTAL", "—", "—", fmt(s.total), "—"],
  );

  const modes = s.paymentModes.length
    ? section(
        "Payment Mode Breakdown",
        tbl(
          [
            { l: "Mode" },
            { l: "Transactions", r: true },
            { l: "Amount", r: true },
          ],
          s.paymentModes.map((m) => [
            e(m.mode || "Cash"),
            String(m.count),
            fmt(m.amount),
          ]),
        ),
      )
    : "";

  const daily = s.daily.length
    ? section(
        "Daily Income Trend",
        tbl(
          [
            { l: "Date" },
            { l: "OPD", r: true },
            { l: "IPD", r: true },
            { l: "Pharmacy", r: true },
            { l: "Pathology", r: true },
            { l: "Radiology", r: true },
            { l: "Total", r: true },
          ],
          s.daily.map((d) => [
            e(d.date),
            d.opd ? fmt(d.opd) : "—",
            d.ipd ? fmt(d.ipd) : "—",
            d.pharmacy ? fmt(d.pharmacy) : "—",
            d.pathology ? fmt(d.pathology) : "—",
            d.radiology ? fmt(d.radiology) : "—",
            fmt(d.total),
          ]),
        ),
      )
    : "";

  return section("Income Breakdown", income) + modes + daily;
}

function opdSection(rows: OpdVisit[], fmt: (n: number) => string): string {
  const total = rows.reduce((s, r) => s + (r.paidAmount || 0), 0);
  return tbl(
    [
      { l: "Date" },
      { l: "Patient" },
      { l: "Age / Gender" },
      { l: "Doctor" },
      { l: "Visit Type" },
      { l: "Payment Mode" },
      { l: "Amount", r: true },
    ],
    rows.map((r) => [
      e(r.visitDate),
      patientCell(r.patientId),
      `${r.patientId?.age ?? "—"} / ${e(r.patientId?.gender ?? "—")}`,
      e(r.doctorId?.name ?? "—"),
      e(r.visitType ?? "—"),
      e(r.paymentMode ?? "Cash"),
      fmt(r.paidAmount),
    ]),
    [`${rows.length} visits`, "", "", "", "", "TOTAL", fmt(total)],
  );
}

function ipdSection(
  ipd: { admissions: IpdAdm[]; paidByIpd: Record<string, number> },
  fmt: (n: number) => string,
): string {
  const totalPaid = Object.values(ipd.paidByIpd).reduce((s, v) => s + v, 0);
  return tbl(
    [
      { l: "Admission Date" },
      { l: "Patient" },
      { l: "Doctor" },
      { l: "Status" },
      { l: "Discharge Date" },
      { l: "Total Paid", r: true },
    ],
    ipd.admissions.map((r) => [
      e(r.admissionDate),
      patientCell(r.patientId),
      e(r.doctorId?.name ?? "—"),
      e(r.status ?? "admitted"),
      e(r.dischargeDate ?? "—"),
      fmt(ipd.paidByIpd[r._id] ?? 0),
    ]),
    [
      `${ipd.admissions.length} admissions`,
      "",
      "",
      "",
      "TOTAL",
      fmt(totalPaid),
    ],
  );
}

function billsSection(rows: BillRow[], fmt: (n: number) => string): string {
  const sum = (f: (r: BillRow) => number) =>
    rows.reduce((s, r) => s + (f(r) || 0), 0);
  return tbl(
    [
      { l: "Date" },
      { l: "Bill No" },
      { l: "Patient" },
      { l: "Amount", r: true },
      { l: "Discount", r: true },
      { l: "Net", r: true },
      { l: "Paid", r: true },
      { l: "Balance", r: true },
      { l: "Mode" },
      { l: "By" },
    ],
    rows.map((r) => [
      e(
        r.billDate ??
          (r as { createdAt?: string }).createdAt?.slice(0, 10) ??
          "—",
      ),
      e(r.billNo ?? "—"),
      patientCell(r.patientId),
      fmt(r.amount),
      r.discountAmount ? fmt(r.discountAmount) : "—",
      fmt(r.netAmount),
      fmt(r.paidAmount),
      (r.balance ?? 0) > 0 ? fmt(r.balance ?? 0) : "—",
      e(r.paymentMode ?? "Cash"),
      e(r.createdBy?.name ?? "—"),
    ]),
    [
      "TOTAL",
      "",
      `${rows.length} bills`,
      fmt(sum((r) => r.amount)),
      fmt(sum((r) => r.discountAmount ?? 0)),
      fmt(sum((r) => r.netAmount)),
      fmt(sum((r) => r.paidAmount)),
      fmt(sum((r) => r.balance ?? 0)),
      "",
      "",
    ],
  );
}

function collectionsSections(
  c: CollectionsData,
  fmt: (n: number) => string,
): string {
  const modeSummary = tbl(
    [
      { l: "Payment Mode" },
      { l: "Transactions", r: true },
      { l: "Amount", r: true },
    ],
    c.allModes.map((m) => [
      e(m),
      String(c.modeCounts[m] ?? 0),
      fmt(c.modeTotals[m] ?? 0),
    ]),
    ["TOTAL", String(c.grandCount), fmt(c.grandTotal)],
  );

  const amountCell = (amount?: number, count?: number) =>
    amount ? `${fmt(amount)}<div class="sub">${count ?? 0} txns</div>` : "—";

  const staff = tbl(
    [
      { l: "#" },
      { l: "Staff Name" },
      ...c.allModes.map((m) => ({ l: m, r: true })),
      { l: "Total", r: true },
    ],
    c.collections.map((r, i) => [
      String(i + 1),
      e(r.name),
      ...c.allModes.map((m) => amountCell(r.modeAmounts[m], r.modeCounts[m])),
      fmt(r.total),
    ]),
    [
      "",
      "TOTAL",
      ...c.allModes.map((m) => amountCell(c.modeTotals[m], c.modeCounts[m])),
      fmt(c.grandTotal),
    ],
  );

  return (
    section("Collection Summary", modeSummary) +
    section("Staff-wise Payment Breakdown", staff)
  );
}

/**
 * Prints the active report tab through the shared print document, so reports
 * carry the same letterhead/title-bar chrome (and Print Layout setting) as
 * bills and receipts.
 */
export function printReport(data: ReportPrintData) {
  const { tab, from, to, fmt } = data;
  const label = TAB_LABELS[tab];
  const period = from === to ? from : `${from} — ${to}`;

  let sections = "";
  if (tab === "summary" && data.summary)
    sections = summarySections(data.summary, fmt);
  else if (tab === "opd") sections = opdSection(data.opdRows ?? [], fmt);
  else if (tab === "ipd" && data.ipdRows)
    sections = ipdSection(data.ipdRows, fmt);
  else if (tab === "collections" && data.collectionsData)
    sections = collectionsSections(data.collectionsData, fmt);
  else sections = billsSection(data.billRows ?? [], fmt);

  const bodyHtml = `
  ${renderPrintHeader(data, { barLabel: `${label} Report`, showLogo: resolvePrintShowLogo(data.printShowLogo, "reports"), headerImage: resolvePrintHeaderImage(data.printHeaderImages, "reports") })}

  <div class="info-3col">
    <table class="info-grid">
      ${row("Report", `${e(label)} Report`)}
    </table>
    <table class="info-grid">
      ${row("Period", e(period))}
    </table>
    <table class="info-grid">
      ${row("Printed On", e(new Date().toLocaleString()))}
    </table>
  </div>

  <hr />

  ${sections}
  `;

  openPrintDocument({
    title: `${label} Report – ${data.clinicName}`,
    extraStyles: EXTRA_STYLES,
    bodyHtml,
    layout: resolvePrintLayout(data.printLayouts, "reports"),
    footerHtml: resolvePrintFooterContent(data.printFooterContents, "reports"),
  });
}
