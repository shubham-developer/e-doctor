import {
  PRINT_LAYOUTS,
  DEFAULT_PRINT_LAYOUT,
  type PrintLayoutId,
  type PrintLetterheadConfig,
  type LetterheadFieldKey,
} from "@/lib/print/layouts";

/** Clinic details shown in the shared header of every printed document. */
export interface PrintClinicInfo {
  clinicName: string;
  clinicAddress?: string;
  clinicPhone?: string;
  clinicEmail?: string;
  clinicWebsite?: string;
  logoUrl?: string;
  /** Per-module layout choices from tenant settings (Settings → Print Layouts). */
  printLayouts?: Record<string, string>;
  /** Per-module logo visibility from tenant settings (Settings → Print Layouts). */
  printShowLogo?: Record<string, boolean>;
  /** Per-module custom letterhead images from tenant settings (Settings → Print Layouts). */
  printHeaderImages?: Record<string, string>;
  /** Per-module rich-text footer HTML from tenant settings (Settings → Print Layouts). */
  printFooterContents?: Record<string, string>;
  /** Per-module pre-printed letterhead setup from tenant settings (Settings → Print Layouts). */
  printLetterheads?: Record<string, Partial<PrintLetterheadConfig>>;
  /** Per-module title-bar visibility from tenant settings (Settings → Print Layouts). */
  printShowTitles?: Record<string, boolean>;
  /** Per-module custom title-bar text from tenant settings (Settings → Print Layouts). */
  printTitleTexts?: Record<string, string>;
}

/**
 * Values for the letterhead field sources (see LETTERHEAD_FIELD_SOURCES),
 * supplied by each printer from the record being printed. Sources the
 * document doesn't have are simply omitted.
 */
export type PrintLetterheadFields = Partial<
  Record<LetterheadFieldKey, string | number | undefined>
>;

export function escapeHtml(str: unknown): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** A `<tr>` for the label/value info-grid tables (Bill No : value, etc). */
export function printRow(label: string, value: string): string {
  return `<tr>
    <td class="lbl">${escapeHtml(label)}</td>
    <td class="sep">:</td>
    <td class="val">${value || "&nbsp;"}</td>
  </tr>`;
}

/**
 * Shared CSS reset + layout classes used across every printed document
 * (bills, receipts, summaries). Callers append document-specific rules
 * (e.g. a receipt box, clinical sections) via `openPrintDocument`'s
 * `extraStyles`.
 */
export const PRINT_BASE_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 12.5px;
    color: #222;
    background: #fff;
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 14mm 18mm 18mm;
  }
  .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 10px; }
  .logo-badge { display: inline-block; color: #fff; font-size: 10px; font-weight: bold; padding: 2px 7px; letter-spacing: 1px; margin-bottom: 4px; }
  .hospital-name { font-size: 22px; font-weight: bold; color: #111; line-height: 1.2; }
  .contact-info { text-align: right; font-size: 11px; line-height: 1.8; color: #444; }
  .bill-bar { color: #fff; text-align: center; font-size: 13px; font-weight: bold; padding: 6px 0; margin: 10px 0 12px; letter-spacing: 1px; }
  .info-grid { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  .info-grid td { padding: 2.5px 0; vertical-align: top; }
  .info-grid .lbl { color: #cc2200; font-weight: 600; white-space: nowrap; width: 1%; padding-right: 0; font-size: 12px; }
  .info-grid .sep { padding: 0 6px; color: #888; width: 1%; }
  .info-grid .val { color: #111; font-size: 12px; }
  .info-3col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0 10px; margin-bottom: 2px; }
  .info-3col table { width: 100%; border-collapse: collapse; }
  hr { border: 0; border-top: 1px solid #bbb; margin: 10px 0; }
  .section-title, .payment-title { font-size: 15px; font-weight: bold; margin-bottom: 6px; }
  .pay-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  .pay-table thead tr { border-bottom: 2px solid #333; background: #f4f4f4; }
  .pay-table th { font-size: 11.5px; font-weight: bold; padding: 6px 6px; background: #f4f4f4; text-align: left; }
  .pay-table th.tr, .pay-table td.tr,
  .pay-table th.pt-num, .pay-table td.pt-num,
  .pay-table th.pt-qty, .pay-table td.pt-qty,
  .pay-table th.pt-rate, .pay-table td.pt-rate,
  .pay-table th.pt-tax, .pay-table td.pt-tax,
  .pay-table th:last-child, .pay-table td:last-child { text-align: right; }
  .pay-table td { padding: 7px 6px; font-size: 12px; border-bottom: 1px solid #eee; }
  .pay-table .pt-col  { width: 30px; }
  .pay-table .pt-date { width: 90px; }
  .pay-table .pt-desc { color: #1a56db; }
  .summary { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; margin-top: 6px; padding-right: 6px; }
  .s-row { display: flex; gap: 40px; font-size: 12px; }
  .s-label { min-width: 100px; text-align: right; color: #444; }
  .s-val   { min-width: 90px; text-align: right; }
  .s-net { border-top: 1.5px solid #333; padding-top: 4px; margin-top: 2px; font-weight: bold; font-size: 13px; }
  .note-box { margin-top: 14px; padding: 8px 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 11.5px; color: #444; }
  .footer { margin-top: 30px; font-size: 11px; color: #0055bb; }
  .custom-header { margin-bottom: 4px; }
  .custom-header img { display: block; width: 100%; }
  .custom-footer { margin-top: 24px; font-size: 11.5px; color: #333; line-height: 1.6; }
  .custom-footer img { width: 100%; display: block; }
  @media print { body { padding: 10mm 14mm; } @page { size: A4; margin: 0; } }
`;

function renderClinicContact(clinic: PrintClinicInfo): string {
  return [
    clinic.clinicAddress
      ? `<div>Address: ${escapeHtml(clinic.clinicAddress)}</div>`
      : "",
    clinic.clinicPhone
      ? `<div>Phone No.: ${escapeHtml(clinic.clinicPhone)}</div>`
      : "",
    clinic.clinicEmail
      ? `<div>Email: ${escapeHtml(clinic.clinicEmail)}</div>`
      : "",
    clinic.clinicWebsite
      ? `<div>Website: ${escapeHtml(clinic.clinicWebsite)}</div>`
      : "",
  ]
    .filter(Boolean)
    .join("");
}

/**
 * Renders the shared logo/clinic-name/contact-info header plus the colored
 * title bar ("OPD Bill", "Discharge Summary", etc) used at the top of every
 * printed document. When the tenant uploaded a custom letterhead image for
 * the module (`headerImage`, resolved via `resolvePrintHeaderImage`), it
 * replaces the standard header block entirely.
 */
export function renderPrintHeader(
  clinic: PrintClinicInfo,
  opts: {
    barLabel: string;
    barColor?: string;
    badgeColor?: string;
    /** Whether to print the logo (image or fallback badge) in the header. Defaults to true. */
    showLogo?: boolean;
    /** Custom full-width letterhead image URL; resolve via `resolvePrintHeaderImage`. */
    headerImage?: string;
    /** Whether to print the title bar at all; resolve via `resolvePrintShowTitle`. Defaults to true. */
    showBar?: boolean;
  },
): string {
  const barColor = opts.barColor ?? "#1a1a1a";
  const badgeColor = opts.badgeColor ?? "#e8003d";
  const bar =
    (opts.showBar ?? true)
      ? `<div class="bill-bar" style="background:${barColor}">${escapeHtml(opts.barLabel)}</div>`
      : "";

  if (opts.headerImage) {
    return `
  <div class="custom-header">
    <img src="${escapeHtml(opts.headerImage)}" alt="${escapeHtml(clinic.clinicName)}" />
  </div>

  ${bar}`;
  }

  const showLogo = opts.showLogo ?? true;
  const logo = !showLogo
    ? ""
    : clinic.logoUrl
      ? `<img src="${clinic.logoUrl}" alt="logo" style="height:60px;max-width:180px;object-fit:contain;display:block;margin-bottom:4px" />`
      : `<div class="logo-badge" style="background:${badgeColor}">&#9651; ${escapeHtml(clinic.clinicName.split(" ")[0].toUpperCase())}</div>`;

  return `
  <div class="header">
    <div class="logo-area">
      ${logo}
      <div class="hospital-name">${escapeHtml(clinic.clinicName)}</div>
    </div>
    <div class="contact-info">${renderClinicContact(clinic)}</div>
  </div>

  ${bar}`;
}

/**
 * Opens a new print window, writes the full HTML document (shared reset/
 * layout styles + caller-provided extra styles/body), and triggers
 * window.print() once loaded. Replaces the window.open + doctype +
 * print-script boilerplate previously duplicated in every *Printer.ts file.
 */
/**
 * CSS + prepended body HTML for printing on the clinic's own pre-printed
 * stationery: hides the app header/footer, keeps the configured zones blank
 * and absolutely positions the patient fields onto the pad's dotted lines
 * (mm from the sheet's top-left corner; @page margin is 0 so body offsets
 * match physical sheet coordinates).
 */
function letterheadChrome(
  lh: PrintLetterheadConfig,
  fields: PrintLetterheadFields | undefined,
): { styles: string; bodyPrefix: string } {
  const styles = `
    .header, .custom-header, .custom-footer { display: none !important; }
    .info-3col, .info-cols, .opd-meta,
    .info-3col + hr, .info-cols + hr, .opd-meta + hr { display: none !important; }
    .rx-area { border: none !important; border-radius: 0; padding: 0; }
    .bill-bar { background: #fff !important; color: #111; border-top: 1.5px solid #111; border-bottom: 1.5px solid #111; letter-spacing: 2px; margin-top: 0; }
    body { position: relative; padding: ${lh.topSpaceMm}mm 14mm ${lh.bottomSpaceMm}mm !important; }
    @media print { body { padding: ${lh.topSpaceMm}mm 14mm ${lh.bottomSpaceMm}mm !important; } }
    .lh-left-space { float: left; width: ${lh.leftSpaceWidthMm}mm; height: ${Math.max(lh.leftSpaceHeightMm - lh.topSpaceMm, 0)}mm; margin-right: 6mm; }
    .lh-field { position: absolute; margin: 0; font-size: 13px; font-weight: 600; color: #111; white-space: nowrap; }
  `;

  const fieldDivs = lh.fillFields
    ? lh.fields
        .map((f) => {
          const raw = fields?.[f.key];
          const value = raw === undefined || raw === "" ? "" : String(raw);
          if (!value) return "";
          const text = f.label ? `${f.label}: ${value}` : value;
          return `<div class="lh-field" style="left:${f.xMm}mm;top:${f.yMm}mm">${escapeHtml(text)}</div>`;
        })
        .join("")
    : "";

  const leftSpace =
    lh.leftSpaceWidthMm > 0 && lh.leftSpaceHeightMm > lh.topSpaceMm
      ? `<div class="lh-left-space"></div>`
      : "";

  return { styles, bodyPrefix: `${fieldDivs}${leftSpace}` };
}

export function openPrintDocument({
  title,
  extraStyles = "",
  bodyHtml,
  layout = DEFAULT_PRINT_LAYOUT,
  footerHtml,
  letterhead,
  letterheadFields,
}: {
  title: string;
  extraStyles?: string;
  bodyHtml: string;
  /** Layout template to apply; resolve via `resolvePrintLayout` from the tenant's settings. */
  layout?: PrintLayoutId;
  /** Tenant-authored footer HTML; resolve via `resolvePrintFooterContent` from the tenant's settings. */
  footerHtml?: string;
  /** Pre-printed letterhead setup; resolve via `resolvePrintLetterhead` from the tenant's settings. Overrides header/footer chrome. */
  letterhead?: PrintLetterheadConfig;
  /** Patient values for the letterhead's dotted lines (used when `letterhead.fillFields`). */
  letterheadFields?: PrintLetterheadFields;
}): void {
  const win = window.open(
    "",
    "_blank",
    "width=860,height=1100,menubar=no,toolbar=no,scrollbars=yes",
  );
  if (!win) return;

  const lh = letterhead?.enabled
    ? letterheadChrome(letterhead, letterheadFields)
    : null;

  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    ${PRINT_BASE_STYLES}
    ${extraStyles}
    ${PRINT_LAYOUTS[layout].styles}
    ${lh?.styles ?? ""}
  </style>
</head>
<body>
${lh?.bodyPrefix ?? ""}
${bodyHtml}
${footerHtml && !lh ? `<div class="custom-footer">${footerHtml}</div>` : ""}
<script>
  window.onload = function () { setTimeout(function () { window.print() }, 300) }
</script>
</body>
</html>`);

  win.document.close();
}
