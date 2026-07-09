/**
 * Custom print template data model — the design a tenant builds with the
 * Print Layout Builder (Settings → Print Layouts → Custom → Open Builder),
 * selected via the "custom" PrintLayoutId (see lib/print/layouts.ts).
 *
 * Unlike the CSS-override presets, a custom template is not shape-agnostic:
 * it's a fixed arrangement of placeholders bound to one document's fields.
 * Some modules (ipd, pathology, radiology) drive two structurally different
 * documents with almost no field overlap (e.g. an IPD bill vs. its discharge
 * summary), so templates are keyed by the finer-grained PrintDocumentKey
 * below, one entry per print*() function — not by PrintModuleKey, which
 * stays module-level since presets are pure CSS and don't care about shape.
 */

export const PRINT_DOCUMENTS = [
  { key: "opdReceipt", module: "opd", label: "OPD Receipt" },
  { key: "prescription", module: "prescription", label: "Prescription" },
  {
    key: "manualPrescription",
    module: "manualPrescription",
    label: "Manual Prescription",
  },
  { key: "pharmacyBill", module: "pharmacy", label: "Pharmacy Bill" },
  { key: "ipdBill", module: "ipd", label: "IPD Bill" },
  { key: "ipdDischargeSummary", module: "ipd", label: "Discharge Summary" },
  { key: "pathologyBill", module: "pathology", label: "Pathology Bill" },
  { key: "pathologyResults", module: "pathology", label: "Pathology Report" },
  { key: "radiologyBill", module: "radiology", label: "Radiology Bill" },
  { key: "radiologyResults", module: "radiology", label: "Radiology Report" },
] as const;

export type PrintDocumentKey = (typeof PRINT_DOCUMENTS)[number]["key"];

export const PRINT_DOCUMENT_KEYS = PRINT_DOCUMENTS.map(
  (d) => d.key,
) as PrintDocumentKey[];

/** Documents that share a module in Settings → Print Layouts (e.g. ipd's bill + discharge summary). */
export function documentsForModule(module: string) {
  return PRINT_DOCUMENTS.filter((d) => d.module === module);
}

/** A4 page dimensions in mm — single source of truth shared by the builder canvas and the print renderer, so on-screen % positions can't drift from the printed page. */
export const PAGE_WIDTH_MM = 210;
export const PAGE_HEIGHT_MM = 297;

export type PrintElementType = "text" | "field" | "image" | "table";

export interface PrintTemplateElement {
  id: string;
  type: PrintElementType;
  /** % of PAGE_WIDTH_MM */
  x: number;
  /** % of PAGE_HEIGHT_MM */
  y: number;
  /** % of PAGE_WIDTH_MM */
  width: number;
  /** % of PAGE_HEIGHT_MM */
  height: number;
  fontSize?: number;
  bold?: boolean;
  align?: "left" | "center" | "right";
  /** type "text": static text, may itself embed {{tokens}}. */
  content?: string;
  /** type "field" | "image": placeholder token, e.g. "patientName" or "logoUrl". */
  token?: string;
  /** Optional custom prefix label the user typed, e.g. "Reg No:". */
  label?: string;
  /** type "table": which repeating dataset, e.g. "medicines" | "lines" | "charges". */
  tableToken?: string;
  /** type "table" (flat tables only — see templateFields.ts's `kind`): visible sub-fields, in display order. Omitted columns are hidden. */
  columns?: string[];
}

export interface PrintTemplate {
  elements: PrintTemplateElement[];
}

const ELEMENT_TYPES: PrintElementType[] = ["text", "field", "image", "table"];

function isPrintTemplateElement(el: unknown): el is PrintTemplateElement {
  if (!el || typeof el !== "object") return false;
  const e = el as Record<string, unknown>;
  return (
    typeof e.id === "string" &&
    typeof e.type === "string" &&
    ELEMENT_TYPES.includes(e.type as PrintElementType) &&
    typeof e.x === "number" &&
    typeof e.y === "number" &&
    typeof e.width === "number" &&
    typeof e.height === "number"
  );
}

/** Validates persisted/incoming JSON before it's trusted as a PrintTemplate (used by the settings PATCH route). */
export function isPrintTemplate(value: unknown): value is PrintTemplate {
  if (!value || typeof value !== "object") return false;
  const elements = (value as PrintTemplate).elements;
  return Array.isArray(elements) && elements.every(isPrintTemplateElement);
}
