import {
  escapeHtml as e,
  printRow as row,
  renderPrintHeader,
  openPrintDocument,
  type PrintClinicInfo,
} from "@/lib/print/printDocument";
import { resolvePrintLayout } from "@/lib/print/layouts";

export interface PrescriptionPrintData extends PrintClinicInfo {
  /** Which Print Layout setting applies — the guided OPD prescription (default) or the manual free-text one. */
  layoutModule?: "prescription" | "manualPrescription";
  opdNumber: number;
  caseNumber?: string;
  visitDate: string;
  patientName: string;
  uhid?: number;
  patientAge: number;
  patientAgeMonths?: number;
  patientAgeDays?: number;
  patientGender?: string;
  patientPhone?: string;
  patientAddress?: string;
  patientBloodGroup?: string;
  patientAllergies?: string;
  doctorName?: string;
  headerNote?: string;
  footerNote?: string;
  manualContent?: string;
  medicines: {
    name: string;
    dose?: string;
    doseInterval?: string;
    doseDuration?: string;
    instruction?: string;
  }[];
  findings: { category?: string; description?: string }[];
}

const EXTRA_STYLES = `
  body { display: flex; flex-direction: column; }
  .opd-meta { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 12px; }
  .opd-meta .left p { line-height: 1.8; }
  .info-cols { display: flex; gap: 24px; margin-bottom: 12px; }
  .info-grid .lbl { color: #111; font-weight: 600; }
  .info-grid td { border-bottom: none; padding: 2px 0; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th { font-size: 11px; font-weight: bold; padding: 6px 6px; background: #f4f4f4; text-align: left; border-bottom: 2px solid #333; }
  td { padding: 6px 6px; font-size: 12px; border-bottom: 1px solid #eee; vertical-align: top; }
  .rx-area { flex: 1; border: 1px dashed #ccc; border-radius: 4px; padding: 8px; margin-bottom: 12px; }
  .header-note, .footer-note { font-size: 12px; line-height: 1.6; margin-bottom: 10px; }
`;

export function printPrescription(data: PrescriptionPrintData) {
  const opdId = `OPDN${String(data.opdNumber).padStart(4, "0")}`;
  const ageStr =
    [
      data.patientAge ? `${data.patientAge} Year` : "",
      data.patientAgeMonths ? `${data.patientAgeMonths} Month` : "",
      data.patientAgeDays ? `${data.patientAgeDays} Day` : "",
    ]
      .filter(Boolean)
      .join(", ") || "—";

  const medicineRows = data.medicines
    .map(
      (m, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${e(m.name)}</strong></td>
      <td>${e(m.dose)}</td>
      <td>${e(m.doseInterval)}</td>
      <td>${e(m.doseDuration)}</td>
      <td>${e(m.instruction)}</td>
    </tr>
  `,
    )
    .join("");

  const findingRows = data.findings
    .map(
      (f) => `
    <tr>
      <td>${e(f.category)}</td>
      <td>${e(f.description)}</td>
    </tr>
  `,
    )
    .join("");

  const bodyHtml = `
  ${renderPrintHeader(data, { barLabel: "OPD Prescription" })}

  <div class="opd-meta">
    <div class="left">
      <p>OPD No&nbsp;<strong>${opdId}</strong></p>
    </div>
    <div><strong>Date : ${e(data.visitDate)}</strong></div>
  </div>

  <hr />

  <div class="info-cols">
    <table class="info-grid" style="flex:1">
      ${row("UHID", String(data.uhid ?? "—"))}
      ${row("Patient Name", e(data.patientName))}
      ${row("Gender / Age", `${e(data.patientGender || "—")} / ${data.patientAge ? `${data.patientAge} Year` : "—"}`)}
    </table>
    <table class="info-grid" style="width:220px">
      ${row("Mobile No", e(data.patientPhone || "—"))}
      ${row("Consultant Doctor", e(data.doctorName || "—"))}
      ${data.patientAddress ? row("Address", e(data.patientAddress)) : ""}
    </table>
  </div>

  <hr />

  ${data.headerNote ? `<div class="header-note">${data.headerNote}</div>` : ""}

  ${
    data.findings.length > 0
      ? `
    <table>
      <thead><tr><th>Finding Category</th><th>Description</th></tr></thead>
      <tbody>${findingRows}</tbody>
    </table>
  `
      : ""
  }

  <div class="rx-area">
    ${data.manualContent ? `<div style="font-size:13px;line-height:1.8">${data.manualContent}</div>` : ""}
    ${
      !data.manualContent && medicineRows.length > 0
        ? `
      <table style="margin-top:8px">
        <thead><tr><th>#</th><th>Medicine</th><th>Dose</th><th>Interval</th><th>Duration</th><th>Instruction</th></tr></thead>
        <tbody>${medicineRows}</tbody>
      </table>
    `
        : ""
    }
  </div>

  ${data.footerNote ? `<div class="footer-note">${data.footerNote}</div>` : ""}
  `;

  openPrintDocument({
    title: `Prescription – ${data.clinicName}`,
    extraStyles: EXTRA_STYLES,
    bodyHtml,
    layout: resolvePrintLayout(
      data.printLayouts,
      data.layoutModule ?? "prescription",
    ),
  });
}
