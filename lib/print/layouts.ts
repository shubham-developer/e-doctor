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
  | "letterhead"
  | "custom";

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
  custom: {
    label: "Custom",
    description:
      "Design your own layout with the builder — freely place fields, text and tables on the page.",
    // Unused: a "custom" layout replaces the shared chrome entirely (see
    // lib/print/renderCustomTemplate.ts) rather than restyling it. Kept as an
    // empty string so `openPrintDocument`'s unconditional style lookup never
    // throws if a template is selected but hasn't been designed yet.
    styles: "",
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
