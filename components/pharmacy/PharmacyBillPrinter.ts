import { formatAmount } from "@/lib/context";
import {
  escapeHtml as e,
  printRow as row,
  renderPrintHeader,
  openPrintDocument,
  type PrintClinicInfo,
} from "@/lib/print/printDocument";
import { resolvePrintLayout } from "@/lib/print/layouts";

export interface PharmacyBillReceiptData extends PrintClinicInfo {
  billNumber: number;
  billDate: string;
  currency?: string;
  currencySymbol?: string;
  caseId?: string;
  prescriptionNo?: string;
  patientName?: string;
  uhid?: string;
  doctorName?: string;
  lines: {
    medicineName: string;
    batchNo?: string;
    expiryDate?: string;
    quantity: number;
    salePrice: number;
    taxPercent: number;
    discountPercent: number;
    amount: number;
  }[];
  totalAmount: number;
  discountAmount: number;
  taxAmount: number;
  netAmount: number;
  paidAmount: number;
  paymentMode: string;
}

export function printPharmacyBillReceipt(data: PharmacyBillReceiptData) {
  const billId = `PHARMAB${data.billNumber}`;
  const patientLabel = data.uhid
    ? `${e(data.patientName || "—")} (${e(data.uhid)})`
    : e(data.patientName || "—");

  const balance = Math.max(0, data.netAmount - data.paidAmount);
  const symbol = data.currencySymbol ?? "₹";
  const fmt = (n: number) => `${symbol}${formatAmount(n, data.currency)}`;
  const showTax =
    data.taxAmount > 0 || data.lines.some((l) => l.taxPercent > 0);

  const lineRows = data.lines
    .map(
      (l, i) => `
    <tr>
      <td class="pt-col">${i + 1}</td>
      <td class="pt-desc">${e(l.medicineName)}${l.batchNo ? `<div style="font-size:10.5px;color:#777">Batch: ${e(l.batchNo)}${l.expiryDate ? ` · Exp: ${e(l.expiryDate)}` : ""}</div>` : ""}</td>
      <td class="pt-qty">${l.quantity}</td>
      <td class="pt-rate">${fmt(l.salePrice)}</td>
      ${showTax ? `<td class="pt-tax">${l.taxPercent > 0 ? `${l.taxPercent.toFixed(2)}%` : "—"}</td>` : ""}
      <td class="pt-amt">${fmt(l.amount)}</td>
    </tr>
  `,
    )
    .join("");

  const bodyHtml = `
  ${renderPrintHeader(data, { barLabel: "Pharmacy Bill" })}

  <div class="info-3col">
    <table class="info-grid">
      ${row("Bill No", billId)}
      ${row("Patient Name", patientLabel)}
      ${row("Consultant Doctor", data.doctorName || "—")}
    </table>
    <table class="info-grid">
      ${row("Case ID", data.caseId || "—")}
      ${row("Prescription No", data.prescriptionNo || "—")}
    </table>
    <table class="info-grid">
      ${row("Bill Date", data.billDate)}
      ${row("Payment Mode", data.paymentMode || "—")}
    </table>
  </div>

  <hr />

  <div class="payment-title">Medicine Details</div>
  <hr />

  <table class="pay-table">
    <thead>
      <tr>
        <th class="pt-col">#</th>
        <th class="pt-desc">Medicine</th>
        <th class="pt-qty">Qty</th>
        <th class="pt-rate">Rate</th>
        ${showTax ? '<th class="pt-tax">Tax</th>' : ""}
        <th class="pt-amt">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${lineRows || `<tr><td colspan="${showTax ? 6 : 5}" style="padding:8px 6px;color:#888;text-align:center">—</td></tr>`}
    </tbody>
  </table>

  <div class="summary">
    <div class="s-row"><span class="s-label">Total</span><span class="s-val">${fmt(data.totalAmount)}</span></div>
    <div class="s-row"><span class="s-label">Discount</span><span class="s-val">${fmt(data.discountAmount)}</span></div>
    ${showTax ? `<div class="s-row"><span class="s-label">Tax</span><span class="s-val">${fmt(data.taxAmount)}</span></div>` : ""}
    <div class="s-row s-net"><span class="s-label">Net Amount</span><span class="s-val">${fmt(data.netAmount)}</span></div>
    <div class="s-row"><span class="s-label">Paid</span><span class="s-val">${fmt(data.paidAmount)}</span></div>
    <div class="s-row"><span class="s-label">Balance</span><span class="s-val">${fmt(balance)}</span></div>
  </div>
  `;

  openPrintDocument({
    title: `Pharmacy Bill – ${data.clinicName}`,
    extraStyles:
      ".pay-table .pt-qty { width: 50px; } .pay-table .pt-rate, .pay-table .pt-tax, .pay-table .pt-amt { width: 90px; }",
    bodyHtml,
    layout: resolvePrintLayout(data.printLayouts, "pharmacy"),
    documentKey: "pharmacyBill",
    customTemplate: data.customPrintTemplates?.pharmacyBill,
    templateData: {
      ...data,
      billId,
      patientLabel,
      totalAmount: fmt(data.totalAmount),
      discountAmount: fmt(data.discountAmount),
      taxAmount: fmt(data.taxAmount),
      netAmount: fmt(data.netAmount),
      paidAmount: fmt(data.paidAmount),
      balance: fmt(balance),
      lines: data.lines.map((l) => ({
        ...l,
        salePrice: fmt(l.salePrice),
        amount: fmt(l.amount),
      })),
    },
  });
}
