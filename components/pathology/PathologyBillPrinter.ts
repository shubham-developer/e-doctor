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

export interface PathologyBillReceiptData extends PrintClinicInfo {
  billNo: string;
  billDate: string;
  caseId?: string;
  patientName?: string;
  uhid?: string;
  referenceDoctor?: string;
  note?: string;
  previousReportValue?: string;
  items: {
    testName: string;
    reportDate?: string;
    charge: number;
    tax: number;
    amount: number;
  }[];
  totalAmount: number;
  discountAmount: number;
  taxAmount: number;
  netAmount: number;
  paidAmount: number;
  balance: number;
  paymentMode?: string;
  currencySymbol?: string;
}

const BAR_COLOR = "#1a5276";

export function printPathologyBillReceipt(data: PathologyBillReceiptData) {
  const sym = data.currencySymbol ?? "₹";
  const patientLabel = e(data.patientName || "—");

  const showTax = data.taxAmount > 0 || data.items.some((item) => item.tax > 0);

  const itemRows = data.items
    .map(
      (item, i) => `
    <tr>
      <td class="pt-col">${i + 1}</td>
      <td class="pt-desc">${e(item.testName)}</td>
      <td class="pt-date">${e(item.reportDate || "—")}</td>
      ${showTax ? `<td class="pt-num">${item.tax > 0 ? `${item.tax.toFixed(2)}%` : "—"}</td>` : ""}
      <td class="pt-num">${sym}${item.charge.toFixed(2)}</td>
      <td class="pt-num">${sym}${item.amount.toFixed(2)}</td>
    </tr>
  `,
    )
    .join("");

  const bodyHtml = `
  ${renderPrintHeader(data, { barLabel: "Pathology Bill", barColor: BAR_COLOR, badgeColor: BAR_COLOR, showLogo: resolvePrintShowLogo(data.printShowLogo, "pathology"), headerImage: resolvePrintHeaderImage(data.printHeaderImages, "pathology") })}

  <div class="info-3col">
    <table class="info-grid">
      ${row("Bill No", e(data.billNo))}
      ${row("Patient Name", patientLabel)}
      ${data.uhid ? row("UHID", data.uhid) : ""}
    </table>
    <table class="info-grid">
      ${row("Ref. Doctor", e(data.referenceDoctor || "—"))}
      ${row("Payment Mode", e(data.paymentMode || "Cash"))}
    </table>
    <table class="info-grid">
      ${row("Date & Time", e(data.billDate))}
    </table>
  </div>

  <hr />
  <div class="section-title">Test Details</div>
  <hr />

  <table class="pay-table">
    <thead>
      <tr>
        <th class="pt-col">#</th>
        <th class="pt-desc">Test Name</th>
        <th class="pt-date">Report Date</th>
        ${showTax ? `<th class="pt-num">Tax %</th>` : ""}
        <th class="pt-num">Charge (${sym})</th>
        <th class="pt-num">Amount (${sym})</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows || `<tr><td colspan="${showTax ? 6 : 5}" style="padding:8px;color:#888;text-align:center">—</td></tr>`}
    </tbody>
  </table>

  <div class="summary">
    <div class="s-row"><span class="s-label">Total</span><span class="s-val">${sym}${data.totalAmount.toFixed(2)}</span></div>
    <div class="s-row"><span class="s-label">Discount</span><span class="s-val">${sym}${data.discountAmount.toFixed(2)}</span></div>
    ${showTax ? `<div class="s-row"><span class="s-label">Tax</span><span class="s-val">${sym}${data.taxAmount.toFixed(2)}</span></div>` : ""}
    <div class="s-row s-net"><span class="s-label">Net Amount</span><span class="s-val">${sym}${data.netAmount.toFixed(2)}</span></div>
  </div>

  ${data.note ? `<div class="note-box"><strong>Note:</strong> ${e(data.note)}</div>` : ""}
  ${data.previousReportValue ? `<div class="note-box"><strong>Previous Report Value:</strong> ${e(data.previousReportValue)}</div>` : ""}
  `;

  openPrintDocument({
    title: `Pathology Bill – ${data.clinicName}`,
    extraStyles: ".pay-table .pt-num { width: 90px; }",
    bodyHtml,
    layout: resolvePrintLayout(data.printLayouts, "pathology"),
    footerHtml: resolvePrintFooterContent(data.printFooterContents, "pathology"),
  });
}
