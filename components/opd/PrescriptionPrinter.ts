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
  resolvePrintShowTitle,
  resolvePrintTitleText,
} from "@/lib/print/layouts";

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
  chiefComplaint?: string;
  pastHistory?: string;
  footerNote?: string;
  manualContent?: string;
  medicines: {
    name: string;
    dose?: string;
    doseInterval?: string;
    doseDuration?: string;
    quantity?: string;
    instruction?: string;
  }[];
  findings: { category?: string; list?: string; description?: string }[];
  vitals?: {
    temperature?: number;
    bpSystolic?: number;
    bpDiastolic?: number;
    pulseRate?: number;
    spo2?: number;
    respiratoryRate?: number;
    rbs?: number;
    weight?: number;
  };
  advice?: string;
}

/** Escapes then converts newlines to <br/> — for plain multi-line textarea values (unlike the rich-text header/footer notes, which are already HTML). */
function nl2br(text?: string) {
  return e(text).replace(/\n/g, "<br/>");
}

/** "Temp: 98.6°F  |  Pulse: 80 bpm  |  BP: 120/80 mmHg" — omits readings that weren't taken. */
function vitalsSummary(v: PrescriptionPrintData["vitals"]): string {
  if (!v) return "";
  const parts = [
    v.temperature != null ? `Temp: ${v.temperature}°F` : "",
    v.pulseRate != null ? `Pulse: ${v.pulseRate} bpm` : "",
    v.bpSystolic != null || v.bpDiastolic != null
      ? `BP: ${v.bpSystolic ?? "—"}/${v.bpDiastolic ?? "—"} mmHg`
      : "",
    v.spo2 != null ? `SpO₂: ${v.spo2}%` : "",
    v.respiratoryRate != null ? `RR: ${v.respiratoryRate}/min` : "",
    v.rbs != null ? `RBS: ${v.rbs} mg/dL` : "",
    v.weight != null ? `Weight: ${v.weight} kg` : "",
  ].filter(Boolean);
  return parts.map((p) => e(p)).join("&nbsp;&nbsp;|&nbsp;&nbsp;");
}

const EXTRA_STYLES = `
  body { display: flex; flex-direction: column; }
  .opd-meta { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 12px; }
  .opd-meta .left p { line-height: 1.8; }
  .info-cols { display: flex; gap: 24px; margin-bottom: 12px; }
  .cc-history { display: flex; gap: 24px; margin-bottom: 12px; }
  .info-grid .lbl { color: #111; font-weight: 600; }
  .info-grid td { border-bottom: none; padding: 2px 0; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th { font-size: 11px; font-weight: bold; padding: 6px 6px; background: #f4f4f4; text-align: left; border-bottom: 2px solid #333; }
  td { padding: 6px 6px; font-size: 12px; border-bottom: 1px solid #eee; vertical-align: top; }
  .rx-area { flex: 1; padding: 8px 0; margin-bottom: 12px; }
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
      <td>${e(m.quantity)}</td>
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
      <td>${e(f.list)}</td>
      <td>${e(f.description)}</td>
    </tr>
  `,
    )
    .join("");

  const bodyHtml = `
  ${renderPrintHeader(data, { barLabel: resolvePrintTitleText(data.printTitleTexts, data.layoutModule ?? "prescription") ?? "OPD Prescription", showBar: resolvePrintShowTitle(data.printShowTitles, data.layoutModule ?? "prescription"), showLogo: resolvePrintShowLogo(data.printShowLogo, data.layoutModule ?? "prescription"), headerImage: resolvePrintHeaderImage(data.printHeaderImages, data.layoutModule ?? "prescription") })}

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

  ${
    data.chiefComplaint || data.pastHistory
      ? `
    <div class="cc-history">
      ${data.chiefComplaint ? `<div style="flex:1"><strong>C/O:</strong> ${nl2br(data.chiefComplaint)}</div>` : ""}
      ${data.pastHistory ? `<div style="flex:1"><strong>Past History:</strong> ${nl2br(data.pastHistory)}</div>` : ""}
    </div>
  `
      : ""
  }

  ${
    data.vitals
      ? `
    <div class="cc-history">
      <div style="flex:1"><strong>Vitals:</strong> ${vitalsSummary(data.vitals)}</div>
    </div>
  `
      : ""
  }

  ${data.headerNote ? `<div class="header-note">${data.headerNote}</div>` : ""}

  ${
    data.findings.length > 0
      ? `
    <table>
      <thead><tr><th>Finding Category</th><th>Finding List</th><th>Description</th></tr></thead>
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
        <thead><tr><th>#</th><th>Medicine</th><th>Dose</th><th>Interval</th><th>Duration</th><th>Qty</th><th>Instruction</th></tr></thead>
        <tbody>${medicineRows}</tbody>
      </table>
    `
        : ""
    }
  </div>

  ${data.advice ? `<div class="header-note"><strong>Advice:</strong> ${nl2br(data.advice)}</div>` : ""}

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
    footerHtml: resolvePrintFooterContent(
      data.printFooterContents,
      data.layoutModule ?? "prescription",
    ),
    letterhead: resolvePrintLetterhead(
      data.printLetterheads,
      data.layoutModule ?? "prescription",
    ),
    letterheadFields: {
      name: data.patientName,
      age: ageStr,
      sex: data.patientGender,
      date: data.visitDate,
      uhid: data.uhid,
      phone: data.patientPhone,
      address: data.patientAddress,
      bloodGroup: data.patientBloodGroup,
      doctor: data.doctorName,
      docNumber: opdId,
    },
  });
}
