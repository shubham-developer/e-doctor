import {
  escapeHtml as e,
  printRow as row,
  renderPrintHeader,
  openPrintDocument,
  type PrintClinicInfo,
} from "@/lib/print/printDocument";
import { resolvePrintLayout } from "@/lib/print/layouts";

export interface RadiologyReportData extends PrintClinicInfo {
  billNo: string;
  billDate: string;
  reportDate?: string;
  patientName?: string;
  uhid?: string;
  patientAge?: string;
  patientGender?: string;
  referenceDoctor?: string;
  reportedByName?: string;
  verifiedByName?: string;
  tests: {
    testName: string;
    findings?: string;
    impression?: string;
  }[];
}

const BAR_COLOR = "#6c3483";

const EXTRA_STYLES = `
  .result-section { margin-bottom: 20px; }
  .test-name { font-size: 13px; font-weight: bold; color: #6c3483; border-bottom: 1.5px solid #6c3483; padding-bottom: 3px; margin-bottom: 10px; }
  .section-label { font-size: 11.5px; font-weight: 700; color: #555; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .section-text { font-size: 12px; color: #222; line-height: 1.6; white-space: pre-wrap; min-height: 20px; }
  .findings-box { border: 1px solid #ddd; border-radius: 4px; padding: 8px 10px; margin-bottom: 10px; background: #fafafa; }
  .sig-row { display: flex; justify-content: space-between; margin-top: 28px; }
  .sig-block { text-align: center; min-width: 140px; }
  .sig-line { border-top: 1px solid #333; padding-top: 4px; font-size: 11px; color: #555; margin-top: 30px; }
`;

export function printRadiologyReport(data: RadiologyReportData) {
  const testSections = data.tests
    .map(
      (test) => `
    <div class="result-section">
      <div class="test-name">${e(test.testName)}</div>
      <div class="findings-box">
        <div class="section-label">Findings</div>
        <div class="section-text">${e(test.findings || "—")}</div>
      </div>
      <div class="findings-box">
        <div class="section-label">Impression</div>
        <div class="section-text">${e(test.impression || "—")}</div>
      </div>
    </div>
  `,
    )
    .join("");

  const bodyHtml = `
  ${renderPrintHeader(data, { barLabel: "Radiology Report", barColor: BAR_COLOR, badgeColor: BAR_COLOR })}

  <div class="info-3col">
    <table class="info-grid">
      ${row("Bill No", e(data.billNo))}
      ${row("Bill Date", e(data.billDate))}
      ${row("Report Date", e(data.reportDate || "—"))}
    </table>
    <table class="info-grid">
      ${row("Patient", e(data.patientName || "—"))}
      ${data.uhid ? row("UHID", e(data.uhid)) : ""}
      ${data.patientAge ? row("Age / Gender", `${e(data.patientAge)} / ${e(data.patientGender || "—")}`) : ""}
    </table>
    <table class="info-grid">
      ${data.referenceDoctor ? row("Ref. Doctor", e(data.referenceDoctor)) : ""}
      ${data.reportedByName ? row("Reported By", e(data.reportedByName)) : ""}
      ${data.verifiedByName ? row("Verified By", e(data.verifiedByName)) : ""}
    </table>
  </div>

  <hr />

  ${testSections}

  <div class="sig-row">
    <div class="sig-block">
      <div class="sig-line">${e(data.reportedByName || "Radiographer")}</div>
    </div>
    <div class="sig-block">
      <div class="sig-line">${e(data.verifiedByName || "Radiologist")}</div>
    </div>
  </div>
  `;

  openPrintDocument({
    title: `Radiology Report – ${data.billNo}`,
    extraStyles: EXTRA_STYLES,
    bodyHtml,
    layout: resolvePrintLayout(data.printLayouts, "radiology"),
  });
}
