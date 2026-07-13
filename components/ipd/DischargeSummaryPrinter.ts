import { escapeHtml as e, printRow as row, renderPrintHeader, openPrintDocument, type PrintClinicInfo } from '@/lib/print/printDocument'
import { resolvePrintLayout, resolvePrintShowLogo } from '@/lib/print/layouts'

export interface DischargeSummaryData extends PrintClinicInfo {
  ipdNumber: number;
  admissionDate: string;
  dischargeDate?: string;
  caseNumber?: string;
  bedNumber?: string;
  bedGroup?: string;
  patientName: string;
  uhid?: number;
  patientAge?: number;
  patientAgeMonths?: number;
  patientAgeDays?: number;
  patientGender?: string;
  patientPhone?: string;
  patientBloodGroup?: string;
  doctorName?: string;
  doctorSpecialization?: string;
  diagnosis: string;
  historyOfPresentIllness?: string;
  examinationFindings?: string;
  investigations?: string;
  treatmentGiven?: string;
  proceduresPerformed?: string;
  conditionAtDischarge?: string;
  followUpInstructions?: string;
  medicationsAtDischarge?: string;
  additionalNotes?: string;
  writtenByName?: string;
}

function section(title: string, content?: string) {
  if (!content?.trim()) return "";
  return `
    <div class="section">
      <div class="sec-title">${e(title)}</div>
      <div class="sec-body">${e(content).replace(/\n/g, "<br/>")}</div>
    </div>
  `;
}

const EXTRA_STYLES = `
  .section { margin-bottom: 12px; page-break-inside: avoid; }
  .sec-title { font-size: 11.5px; font-weight: bold; color: #cc2200; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e8d0cc; padding-bottom: 3px; margin-bottom: 5px; }
  .sec-body { font-size: 12px; color: #222; line-height: 1.6; white-space: pre-wrap; }
  .footer { display: flex; justify-content: space-between; align-items: flex-end; }
  .footer-note { font-size: 11px; color: #0055bb; }
  .sig-block { text-align: center; font-size: 11px; color: #444; }
  .sig-line { border-top: 1px solid #555; width: 180px; margin-bottom: 4px; }
`

export function printDischargeSummary(data: DischargeSummaryData) {
  const ipdId = `IPDN${String(data.ipdNumber).padStart(4, "0")}`;

  const ageStr =
    [
      data.patientAge ? `${data.patientAge} Year` : "",
      data.patientAgeMonths ? `${data.patientAgeMonths} Month` : "",
      data.patientAgeDays ? `${data.patientAgeDays} Day` : "",
    ]
      .filter(Boolean)
      .join(", ") || "—";

  const patientLabel = data.uhid
    ? `${e(data.patientName)} (${data.uhid})`
    : e(data.patientName);

  const bedDisplay =
    [data.bedNumber, data.bedGroup].filter(Boolean).join(" – ") || "—";

  const bodyHtml = `
  ${renderPrintHeader(data, { barLabel: 'Discharge Summary', showLogo: resolvePrintShowLogo(data.printShowLogo, 'ipd') })}

  <div class="info-3col">
    <table class="info-grid">
      ${row("IPD Number", ipdId)}
      ${row("Patient Name", patientLabel)}
      ${row("Blood Group", data.patientBloodGroup || "")}
      ${row("Bed", bedDisplay)}
    </table>
    <table class="info-grid">
      ${row("Case No", data.caseNumber || "")}
      ${row("Age", ageStr)}
      ${row("Gender", data.patientGender || "")}
    </table>
    <table class="info-grid">
      ${row("Admission Date", data.admissionDate || "")}
      ${row("Discharge Date", data.dischargeDate || "")}
      ${row("Consultant", data.doctorName || "")}
      ${row("Specialization", data.doctorSpecialization || "")}
    </table>
  </div>

  <hr />

  ${section("Diagnosis", data.diagnosis)}
  ${section("History of Present Illness", data.historyOfPresentIllness)}
  ${section("Examination Findings", data.examinationFindings)}
  ${section("Investigations", data.investigations)}
  ${section("Treatment Given", data.treatmentGiven)}
  ${section("Procedures Performed", data.proceduresPerformed)}
  ${section("Condition at Discharge", data.conditionAtDischarge)}
  ${section("Medications at Discharge", data.medicationsAtDischarge)}
  ${section("Follow-up Instructions", data.followUpInstructions)}
  ${section("Additional Notes", data.additionalNotes)}

  <div class="footer">
    <div class="footer-note">This summary is printed electronically, so <u>no signature is required</u></div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <div>${data.writtenByName ? e(data.writtenByName) : "Doctor / Authorized Signatory"}</div>
    </div>
  </div>
  `;

  openPrintDocument({
    title: `Discharge Summary – ${data.clinicName}`,
    extraStyles: EXTRA_STYLES,
    bodyHtml,
    layout: resolvePrintLayout(data.printLayouts, 'ipd'),
  });
}
