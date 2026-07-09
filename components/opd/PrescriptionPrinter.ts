import {
  escapeHtml as e,
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
  .info-grid { display: grid; grid-template-columns: 140px 1fr 80px 1fr 90px 1fr; gap: 4px 8px; margin-bottom: 12px; font-size: 12px; }
  .info-grid .lbl { color: #333; font-weight: normal; }
  .info-grid .val { color: #111; }
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

  <div class="info-grid">
    <span class="lbl">Patient Name</span><span class="val">${e(data.patientName)}${data.uhid ? ` (${data.uhid})` : ""}</span>
    <span class="lbl">Age</span><span class="val">${ageStr}</span>
    <span class="lbl">Gender</span><span class="val">${e(data.patientGender)}</span>
    <span class="lbl">Consultant Doctor</span><span class="val">${e(data.doctorName)}</span>
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

  const documentKey =
    data.layoutModule === "manualPrescription"
      ? "manualPrescription"
      : "prescription";

  openPrintDocument({
    title: `Prescription – ${data.clinicName}`,
    extraStyles: EXTRA_STYLES,
    bodyHtml,
    layout: resolvePrintLayout(data.printLayouts, data.layoutModule ?? "prescription"),
    documentKey,
    customTemplate: data.customPrintTemplates?.[documentKey],
    templateData: {
      ...data,
      opdId,
      ageStr,
      medicines: data.medicines,
      findings: data.findings,
    },
  });
}
