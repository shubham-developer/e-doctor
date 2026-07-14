/**
 * Print layout templates shared by every printed document (bills, receipts,
 * prescriptions, discharge summaries, reports). A layout only restyles the
 * shared chrome from `printDocument.ts` (header arrangement, title bar,
 * density) — the document body markup is identical across layouts, so every
 * module can offer the same choices.
 *
 * The tenant stores one layout id per module in `tenant.printLayouts`
 * (edited under Settings → Print Layouts); printers resolve it with
 * `resolvePrintLayout`.
 */

export type PrintLayoutId =
  | "classic"
  | "centered"
  | "compact"
  | "minimal"
  | "letterhead";

export const DEFAULT_PRINT_LAYOUT: PrintLayoutId = "classic";

export interface PrintLayoutDef {
  label: string;
  description: string;
  /** CSS appended after the base + document styles to override the shared chrome. */
  styles: string;
}

export const PRINT_LAYOUTS: Record<PrintLayoutId, PrintLayoutDef> = {
  classic: {
    label: "Classic",
    description:
      "Logo on the left, contact details on the right, solid title bar.",
    styles: "",
  },
  centered: {
    label: "Centered",
    description:
      "Logo, clinic name and contact details centered above the title bar.",
    styles: `
      .header { flex-direction: column; align-items: center; text-align: center; }
      .logo-area { display: flex; flex-direction: column; align-items: center; }
      .logo-area img { margin-left: auto; margin-right: auto; }
      .contact-info { text-align: center; line-height: 1.5; margin-top: 4px; }
    `,
  },
  compact: {
    label: "Compact",
    description: "Smaller margins and type so more fits on a single page.",
    styles: `
      body { font-size: 11px; padding: 8mm 12mm 12mm; }
      .header { padding-bottom: 6px; }
      .hospital-name { font-size: 17px; }
      .contact-info { font-size: 10px; line-height: 1.5; }
      .bill-bar { font-size: 11.5px; padding: 3px 0; margin: 6px 0 8px; }
      .info-grid td { padding: 1.5px 0; }
      .info-grid .lbl, .info-grid .val { font-size: 11px; }
      .section-title, .payment-title { font-size: 13px; }
      .pay-table th { font-size: 10.5px; padding: 4px 5px; }
      .pay-table td { font-size: 11px; padding: 4px 5px; }
      .s-row { font-size: 11px; }
      .s-net { font-size: 12px; }
      hr { margin: 6px 0; }
      .footer { margin-top: 18px; }
      @media print { body { padding: 8mm 10mm; } }
    `,
  },
  minimal: {
    label: "Minimal B/W",
    description: "Black and white with a ruled title instead of colored bars.",
    styles: `
      .logo-badge { background: #111 !important; }
      .bill-bar { background: #fff !important; color: #111; border-top: 2px solid #111; border-bottom: 2px solid #111; letter-spacing: 2px; }
      .info-grid .lbl { color: #333; }
      .pay-table .pt-desc { color: #111; }
      .footer { color: #444; }
    `,
  },
  letterhead: {
    label: "Letterhead",
    description: "Leaves the top blank for pre-printed letterhead stationery.",
    styles: `
      .header { visibility: hidden; min-height: 30mm; }
      .bill-bar { background: #fff !important; color: #111; border-top: 2px solid #111; border-bottom: 2px solid #111; letter-spacing: 2px; margin-top: 0; }
    `,
  },
};

export const PRINT_LAYOUT_IDS = Object.keys(PRINT_LAYOUTS) as PrintLayoutId[];

/** Modules a layout can be picked for in Settings → Print Layouts. */
export const PRINT_MODULES = [
  { key: "opd", label: "OPD Bill / Receipt" },
  { key: "ipd", label: "IPD Bill & Discharge Summary" },
  { key: "pharmacy", label: "Pharmacy Bill" },
  { key: "pathology", label: "Pathology Bill" },
  { key: "radiology", label: "Radiology Bill" },
  { key: "prescription", label: "Prescription" },
  { key: "manualPrescription", label: "Manual Prescription" },
  { key: "reports", label: "Reports" },
] as const;

export type PrintModuleKey = (typeof PRINT_MODULES)[number]["key"];

/** Look up the tenant's chosen layout for a module, falling back to the default. */
export function resolvePrintLayout(
  printLayouts: Record<string, string> | undefined | null,
  module: PrintModuleKey,
): PrintLayoutId {
  const id = printLayouts?.[module];
  return id && id in PRINT_LAYOUTS
    ? (id as PrintLayoutId)
    : DEFAULT_PRINT_LAYOUT;
}

/** Whether the clinic logo should print for a module, defaulting to shown. */
export function resolvePrintShowLogo(
  printShowLogo: Record<string, boolean> | undefined | null,
  module: PrintModuleKey,
): boolean {
  return printShowLogo?.[module] ?? true;
}

/**
 * The tenant's custom letterhead image URL for a module (uploaded under
 * Settings → Print Layouts). When set it replaces the standard
 * logo/clinic-name/contact header in printed documents.
 */
export function resolvePrintHeaderImage(
  printHeaderImages: Record<string, string> | undefined | null,
  module: PrintModuleKey,
): string | undefined {
  return printHeaderImages?.[module] || undefined;
}

/** The tenant's rich-text footer HTML for a module, printed at the bottom of documents. */
export function resolvePrintFooterContent(
  printFooterContents: Record<string, string> | undefined | null,
  module: PrintModuleKey,
): string | undefined {
  const html = printFooterContents?.[module]?.trim();
  return html || undefined;
}

/**
 * Data sources that can be printed onto a pre-printed letterhead. Values are
 * supplied by each printer from the visit/bill/report being printed — a
 * source a document doesn't have (e.g. blood group on a pharmacy bill)
 * simply prints nothing.
 */
export const LETTERHEAD_FIELD_SOURCES = [
  { key: "name", label: "Patient Name" },
  { key: "age", label: "Age" },
  { key: "sex", label: "Gender" },
  { key: "date", label: "Date" },
  { key: "uhid", label: "UHID" },
  { key: "phone", label: "Patient Phone" },
  { key: "address", label: "Patient Address" },
  { key: "bloodGroup", label: "Blood Group" },
  { key: "doctor", label: "Doctor" },
  { key: "docNumber", label: "Document No (OPD/IPD/Bill)" },
] as const;

export type LetterheadFieldKey =
  (typeof LETTERHEAD_FIELD_SOURCES)[number]["key"];

/** One positioned field on the pre-printed letterhead. */
export interface LetterheadFieldConfig {
  /** Which data source to print, from LETTERHEAD_FIELD_SOURCES. */
  key: LetterheadFieldKey;
  /** Optional label printed before the value ("UHID: 1042"); empty prints the value alone. */
  label: string;
  xMm: number;
  yMm: number;
}

/**
 * Per-module setup for printing on the clinic's own pre-printed letterhead
 * stationery (prescription pads etc). All measurements are millimetres from
 * the top-left corner of the sheet. When enabled, printed documents suppress
 * the app's header/footer, keep the configured zones blank for the
 * pre-printed artwork, and (optionally) drop the patient's Name / Age / Sex /
 * Date onto the pad's dotted lines.
 */
export interface PrintLetterheadConfig {
  enabled: boolean;
  /** Blank space at the top for the pre-printed header (incl. name/age lines). */
  topSpaceMm: number;
  /** Blank space at the bottom for the pre-printed footer block. */
  bottomSpaceMm: number;
  /** Reserved block on the left (e.g. a services list); content wraps around it. */
  leftSpaceWidthMm: number;
  leftSpaceHeightMm: number;
  /** Whether to print the configured fields onto the pad's own lines. */
  fillFields: boolean;
  fields: LetterheadFieldConfig[];
}

export const DEFAULT_PRINT_LETTERHEAD: PrintLetterheadConfig = {
  enabled: false,
  topSpaceMm: 70,
  bottomSpaceMm: 60,
  leftSpaceWidthMm: 0,
  leftSpaceHeightMm: 0,
  fillFields: false,
  fields: [
    { key: "name", label: "", xMm: 98, yMm: 46 },
    { key: "age", label: "", xMm: 90, yMm: 58 },
    { key: "sex", label: "", xMm: 130, yMm: 58 },
    { key: "date", label: "", xMm: 165, yMm: 58 },
  ],
};

function clampMm(n: unknown, fallback: number, max = 297): number {
  const v = typeof n === "number" && Number.isFinite(n) ? n : fallback;
  return Math.min(Math.max(v, 0), max);
}

const LETTERHEAD_FIELD_KEY_SET = new Set<string>(
  LETTERHEAD_FIELD_SOURCES.map((s) => s.key),
);

/**
 * Coerce an untrusted/legacy fields value into a well-formed list. Accepts
 * the current array shape and the earlier fixed-four object shape
 * (`{ name: {xMm,yMm}, … }`), dropping unknown sources. `undefined` falls
 * back to the default four fields.
 */
export function normalizeLetterheadFields(
  raw: unknown,
): LetterheadFieldConfig[] {
  if (raw === undefined || raw === null) {
    return DEFAULT_PRINT_LETTERHEAD.fields.map((f) => ({ ...f }));
  }
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : typeof raw === "object"
      ? Object.entries(raw).map(([key, pos]) => ({
          key,
          label: "",
          ...(pos as object),
        }))
      : [];

  const out: LetterheadFieldConfig[] = [];
  for (const item of list.slice(0, 20)) {
    const f = item as Partial<LetterheadFieldConfig>;
    if (typeof f?.key !== "string" || !LETTERHEAD_FIELD_KEY_SET.has(f.key)) {
      continue;
    }
    out.push({
      key: f.key as LetterheadFieldKey,
      label: typeof f.label === "string" ? f.label.slice(0, 40) : "",
      xMm: clampMm(f.xMm, 20, 210),
      yMm: clampMm(f.yMm, 20),
    });
  }
  return out;
}

/**
 * The tenant's pre-printed letterhead setup for a module, normalized against
 * the defaults. Returns undefined when the module doesn't print on
 * pre-printed stationery.
 */
export function resolvePrintLetterhead(
  printLetterheads:
    | Record<string, Partial<PrintLetterheadConfig> | undefined>
    | undefined
    | null,
  module: PrintModuleKey,
): PrintLetterheadConfig | undefined {
  const saved = printLetterheads?.[module];
  if (!saved?.enabled) return undefined;
  const d = DEFAULT_PRINT_LETTERHEAD;
  return {
    enabled: true,
    topSpaceMm: clampMm(saved.topSpaceMm, d.topSpaceMm),
    bottomSpaceMm: clampMm(saved.bottomSpaceMm, d.bottomSpaceMm),
    leftSpaceWidthMm: clampMm(saved.leftSpaceWidthMm, d.leftSpaceWidthMm, 210),
    leftSpaceHeightMm: clampMm(saved.leftSpaceHeightMm, d.leftSpaceHeightMm),
    fillFields: saved.fillFields === true,
    fields: normalizeLetterheadFields(saved.fields),
  };
}
