import { formatAmount } from "@/lib/context";
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
  resolvePrintLetterhead,
} from "@/lib/print/layouts";

export interface IpdBillData extends PrintClinicInfo {
  ipdNumber: number;
  admissionDate: string;
  dischargeDate?: string;
  caseNumber?: string;
  bedNumber?: string;
  bedGroup?: string;
  // patient
  patientName: string;
  uhid?: number;
  patientAge?: number;
  patientAgeMonths?: number;
  patientAgeDays?: number;
  patientGender?: string;
  patientPhone?: string;
  patientBloodGroup?: string;
  // doctor
  doctorName?: string;
  doctorSpecialization?: string;
  // charges
  charges: {
    categoryName: string;
    quantity: number;
    unitPrice: number;
    total: number;
    date: string;
    note?: string;
  }[];
  totalCharges: number;
  // payment receipt (optional — omit to hide receipt box)
  payment?: {
    amount: number;
    paymentMode: string;
    note?: string;
    date: string;
    addedByName?: string;
  };
  totalPaid: number;
  balance: number;
  // currency
  currency?: string;
  currencySymbol?: string;
}

const EXTRA_STYLES = `
  .pay-table .pt-qty, .pay-table .pt-rate { text-align: right; }
  .receipt-box { border: 1.5px solid #1a56db; border-radius: 6px; padding: 12px 16px; margin-top: 16px; }
  .receipt-box .title { font-size: 13px; font-weight: bold; color: #1a56db; margin-bottom: 8px; }
  .receipt-row { display: flex; justify-content: space-between; font-size: 12px; padding: 2px 0; }
  .receipt-row .rl { color: #555; } .receipt-row .rv { font-weight: 600; color: #111; }
`;

export function printIpdBill(data: IpdBillData) {
  const ipdId = `IPDN${String(data.ipdNumber).padStart(4, "0")}`;
  const symbol = data.currencySymbol ?? "₹";
  const fmt = (n: number) => `${symbol}${formatAmount(n, data.currency)}`;

  const patientLabel = e(data.patientName);

  const ageStr =
    [
      data.patientAge ? `${data.patientAge} Year` : "",
      data.patientAgeMonths ? `${data.patientAgeMonths} Month` : "",
      data.patientAgeDays ? `${data.patientAgeDays} Day` : "",
    ]
      .filter(Boolean)
      .join(", ") || "—";

  const bedLabel =
    [data.bedNumber, data.bedGroup].filter(Boolean).join(" – ") || "—";

  const chargeRows = data.charges
    .map(
      (c, i) => `
    <tr>
      <td class="pt-col">${i + 1}</td>
      <td class="pt-desc">${e(c.categoryName)}${c.note ? `<div style="font-size:10.5px;color:#777">${e(c.note)}</div>` : ""}</td>
      <td class="pt-qty">${c.quantity}</td>
      <td class="pt-rate">${fmt(c.unitPrice)}</td>
      <td class="pt-amt">${fmt(c.total)}</td>
    </tr>
  `,
    )
    .join("");

  const balanceColor = data.balance <= 0 ? "#16a34a" : "#dc2626";

  const bodyHtml = `
  ${renderPrintHeader(data, { barLabel: "IPD Bill", showLogo: resolvePrintShowLogo(data.printShowLogo, "ipd"), headerImage: resolvePrintHeaderImage(data.printHeaderImages, "ipd") })}

  <div class="info-3col">
    <table class="info-grid">
      ${row("IPD No", ipdId)}
      ${row("Patient Name", patientLabel)}
      ${data.uhid ? row("UHID", String(data.uhid)) : ""}
      ${row("Age / Gender", ageStr + (data.patientGender ? " / " + e(data.patientGender) : ""))}
    </table>
    <table class="info-grid">
      ${row("Phone", data.patientPhone || "")}
      ${row("Consultant", data.doctorName || "")}
      ${row("Department", data.doctorSpecialization || "")}
    </table>
    <table class="info-grid">
      ${row("Admission Date", e(data.admissionDate))}
      ${data.dischargeDate ? row("Discharge Date", e(data.dischargeDate)) : ""}
      ${row("Bed", bedLabel)}
    </table>
  </div>

  <hr />

  <div class="section-title">Charge Details</div>
  <hr />

  <table class="pay-table">
    <thead>
      <tr>
        <th class="pt-col">#</th>
        <th class="pt-desc">Description</th>
        <th class="tr">Qty</th>
        <th class="tr">Unit Price</th>
        <th class="tr">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${chargeRows || `<tr><td colspan="5" style="padding:8px 6px;color:#888;text-align:center">No charges added</td></tr>`}
    </tbody>
  </table>

  <div class="summary">
    <div class="s-row">
      <span class="s-label">Total Charges</span>
      <span class="s-val">${fmt(data.totalCharges)}</span>
    </div>
    <div class="s-row">
      <span class="s-label">Total Paid</span>
      <span class="s-val">${fmt(data.totalPaid)}</span>
    </div>
    <div class="s-row s-net">
      <span class="s-label">${data.balance <= 0 ? "Fully Paid" : "Balance Due"}</span>
      <span class="s-val" style="color:${balanceColor}">${fmt(Math.abs(data.balance))}</span>
    </div>
  </div>

  ${data.payment ? `
  <div class="receipt-box">
    <div class="title">&#10003; Payment Receipt</div>
    <div class="receipt-row"><span class="rl">Date</span><span class="rv">${e(data.payment.date)}</span></div>
    <div class="receipt-row"><span class="rl">Payment Mode</span><span class="rv">${e(data.payment.paymentMode)}</span></div>
    <div class="receipt-row"><span class="rl">Amount Received</span><span class="rv">${fmt(data.payment.amount)}</span></div>
    ${data.payment.note ? `<div class="receipt-row"><span class="rl">Note</span><span class="rv">${e(data.payment.note)}</span></div>` : ""}
    ${data.payment.addedByName ? `<div class="receipt-row"><span class="rl">Received By</span><span class="rv">${e(data.payment.addedByName)}</span></div>` : ""}
    <div class="receipt-row" style="margin-top:6px;padding-top:6px;border-top:1px solid #c7d2fe">
      <span class="rl">${data.balance <= 0 ? "Balance" : "Remaining Balance"}</span>
      <span class="rv" style="color:${balanceColor}">${fmt(Math.abs(data.balance))}</span>
    </div>
  </div>` : ""}
  `;

  openPrintDocument({
    title: `IPD Bill – ${ipdId}`,
    extraStyles: EXTRA_STYLES,
    bodyHtml,
    layout: resolvePrintLayout(data.printLayouts, "ipd"),
    footerHtml: resolvePrintFooterContent(data.printFooterContents, "ipd"),
    letterhead: resolvePrintLetterhead(data.printLetterheads, "ipd"),
    letterheadFields: {
      name: data.patientName,
      age: ageStr,
      sex: data.patientGender,
      date: data.admissionDate,
      uhid: data.uhid,
      phone: data.patientPhone,
      bloodGroup: data.patientBloodGroup,
      doctor: data.doctorName,
      docNumber: ipdId,
    },
  });
}
