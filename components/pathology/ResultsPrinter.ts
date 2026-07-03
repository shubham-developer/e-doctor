import {
  escapeHtml as e,
  printRow as row,
  renderPrintHeader,
  renderPrintFooter,
  openPrintDocument,
  type PrintClinicInfo,
} from "@/lib/print/printDocument";
import { resolvePrintLayout } from "@/lib/print/layouts";

export interface PathologyReportData extends PrintClinicInfo {
  billNo: string;
  billDate: string;
  reportDate?: string;
  patientName?: string;
  patientCode?: string;
  patientAge?: string;
  patientGender?: string;
  referenceDoctor?: string;
  reportedByName?: string;
  verifiedByName?: string;
  currencySymbol?: string;
  tests: {
    testName: string;
    parameters: {
      name: string;
      value: string;
      unit: string;
      referenceRange: string;
      flag: string;
    }[];
    remarks?: string;
  }[];
}

const BAR_COLOR = "#1a5276";

const EXTRA_STYLES = `
  .result-section { margin-bottom: 18px; }
  .test-name { font-size: 13px; font-weight: bold; color: #1a5276; border-bottom: 1.5px solid #1a5276; padding-bottom: 3px; margin-bottom: 6px; }
  .rt { width: 100%; border-collapse: collapse; margin-bottom: 6px; font-size: 12px; }
  .rt th { background: #eaf0f8; padding: 5px 8px; text-align: left; font-size: 11px; font-weight: 600; color: #333; border-bottom: 1px solid #ccc; }
  .rt th.tr { text-align: right; }
  .rt td { padding: 5px 8px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
  .rt td.tr { text-align: right; }
  .flag-H { color: #c0392b; font-weight: bold; }
  .flag-L { color: #2471a3; font-weight: bold; }
  .val-abnormal { font-weight: bold; }
  .remarks { font-size: 11px; color: #555; font-style: italic; margin-top: 3px; }
  .sig-row { display: flex; justify-content: space-between; margin-top: 28px; }
  .sig-block { text-align: center; min-width: 140px; }
  .sig-line { border-top: 1px solid #333; padding-top: 4px; font-size: 11px; color: #555; margin-top: 30px; }
`;

export function printPathologyReport(data: PathologyReportData) {
  const testSections = data.tests
    .map(
      (test) => `
    <div class="result-section">
      <div class="test-name">${e(test.testName)}</div>
      <table class="rt">
        <thead>
          <tr>
            <th>Parameter</th>
            <th class="tr">Value</th>
            <th>Unit</th>
            <th>Reference Range</th>
            <th class="tr">Flag</th>
          </tr>
        </thead>
        <tbody>
          ${test.parameters
            .map((p) => {
              const flagClass =
                p.flag === "H"
                  ? "flag-H"
                  : p.flag === "L"
                    ? "flag-L"
                    : "";
              const valClass = p.flag && p.flag !== "N" ? "val-abnormal " + flagClass : "";
              return `<tr>
              <td>${e(p.name)}</td>
              <td class="tr ${valClass}">${e(p.value) || "&nbsp;"}</td>
              <td>${e(p.unit)}</td>
              <td>${e(p.referenceRange)}</td>
              <td class="tr ${flagClass}">${e(p.flag) || "&nbsp;"}</td>
            </tr>`;
            })
            .join("")}
        </tbody>
      </table>
      ${test.remarks ? `<div class="remarks">Remarks: ${e(test.remarks)}</div>` : ""}
    </div>
  `,
    )
    .join("");

  const bodyHtml = `
  ${renderPrintHeader(data, { barLabel: "Pathology Report", barColor: BAR_COLOR, badgeColor: BAR_COLOR })}

  <div class="info-3col">
    <table class="info-grid">
      ${row("Bill No", e(data.billNo))}
      ${row("Bill Date", e(data.billDate))}
      ${row("Report Date", e(data.reportDate || "—"))}
    </table>
    <table class="info-grid">
      ${row("Patient", e(data.patientName || "—"))}
      ${data.patientCode ? row("Patient Code", e(data.patientCode)) : ""}
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
      <div class="sig-line">${e(data.reportedByName || "Lab Technician")}</div>
    </div>
    <div class="sig-block">
      <div class="sig-line">${e(data.verifiedByName || "Pathologist")}</div>
    </div>
  </div>

  ${renderPrintFooter("This is a computer-generated report. <u>No signature required</u> if digitally verified.")}
  `;

  openPrintDocument({
    title: `Pathology Report – ${data.billNo}`,
    extraStyles: EXTRA_STYLES,
    bodyHtml,
    layout: resolvePrintLayout(data.printLayouts, "pathology"),
  });
}
