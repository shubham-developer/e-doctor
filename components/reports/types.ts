export interface ReportSummary {
  period: { from: string; to: string };
  opd: { count: number; amount: number };
  pharmacy: { count: number; amount: number; net: number; paid: number; balance: number };
  pathology: { count: number; amount: number; net: number; paid: number; balance: number };
  radiology: { count: number; amount: number; net: number; paid: number; balance: number };
  ipd: { admissions: number; discharges: number; payments: number; paymentCount: number };
  total: number;
  daily: {
    date: string;
    opd: number;
    pharmacy: number;
    pathology: number;
    radiology: number;
    ipd: number;
    total: number;
  }[];
  paymentModes: { mode: string; count: number; amount: number }[];
}

export interface OpdVisit {
  _id: string;
  visitDate: string;
  paidAmount: number;
  paymentMode?: string;
  patientId?: { name: string; patientCode?: string; age?: number; gender?: string; phone?: string };
  doctorId?: { name: string; specialization?: string };
  visitType?: string;
  createdBy?: { name: string };
}

export interface BillRow {
  _id: string;
  billDate: string;
  billNo: string;
  amount: number;
  netAmount: number;
  paidAmount: number;
  balance: number;
  paymentMode?: string;
  discountAmount?: number;
  patientId?: { name: string; patientCode?: string };
  createdBy?: { name: string };
}

export interface IpdAdm {
  _id: string;
  admissionDate: string;
  dischargeDate?: string;
  ipdNumber?: number;
  status?: string;
  caseNumber?: string;
  patientId?: { name: string; patientCode?: string; age?: number; gender?: string; phone?: string };
  doctorId?: { name: string; specialization?: string };
}

export interface CollectionRow {
  name: string;
  modeAmounts: Record<string, number>;
  modeCounts: Record<string, number>;
  total: number;
  count: number;
}

export interface CollectionsData {
  collections: CollectionRow[];
  allModes: string[];
  modeTotals: Record<string, number>;
  modeCounts: Record<string, number>;
  grandTotal: number;
  grandCount: number;
}

export const REPORT_TABS = [
  { key: "summary", label: "Summary" },
  { key: "opd", label: "OPD" },
  { key: "ipd", label: "IPD" },
  { key: "pharmacy", label: "Pharmacy" },
  { key: "pathology", label: "Pathology" },
  { key: "radiology", label: "Radiology" },
  { key: "collections", label: "Collections" },
] as const;

export type ReportTab = (typeof REPORT_TABS)[number]["key"];
