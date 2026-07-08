export type ModuleTab =
  | "overview"
  | "opd"
  | "pharmacy"
  | "pathology"
  | "radiology"
  | "ipd";

export interface BillingSummary {
  opd: { count: number; collected: number };
  pharmacy: { count: number; net: number; paid: number; balance: number };
  pathology: { count: number; net: number; paid: number; balance: number };
  radiology: { count: number; net: number; paid: number; balance: number };
  ipd: { admissions: number; collected: number };
}

export interface Paginated<T> {
  bills: T[];
  total: number;
  totalPages: number;
  page: number;
}

export interface OpdBill {
  _id: string;
  visitDate: string;
  opdNumber: number;
  caseNumber?: string;
  paidAmount: number;
  paymentMode?: string;
  totalFee: number;
  discount?: number;
  tax?: number;
  appliedCharge?: number;
  chiefComplaint?: string;
  createdAt: string;
  charges: { name: string; fee: number }[];
  patientId?: {
    _id: string;
    name: string;
    uhid?: number;
    age?: number;
    ageMonths?: number;
    ageDays?: number;
    gender?: string;
    bloodGroup?: string;
    address?: string;
    allergies?: string;
    previousMedicalIssue?: string;
    phone?: string;
  };
  doctorId?: {
    _id: string;
    name: string;
    specialization?: string;
    designation?: string;
  };
}

export interface PharBill {
  _id: string;
  billNumber: number;
  createdAt: string;
  netAmount: number;
  paidAmount: number;
  paymentMode: string;
  totalAmount: number;
  discountAmount: number;
  taxAmount: number;
  caseId?: string;
  prescriptionNo?: string;
  doctorName?: string;
  note?: string;
  lines: {
    medicineName: string;
    batchNo?: string;
    expiryDate?: string;
    quantity: number;
    salePrice: number;
    taxPercent: number;
    discountPercent: number;
    amount: number;
  }[];
  patientId?: { name: string; uhid?: number; phone?: string };
  doctorId?: { name: string };
  createdBy?: { name: string };
}

export interface PathBill {
  _id: string;
  billNo: string;
  billDate: string;
  caseId?: string;
  referenceDoctor?: string;
  note?: string;
  previousReportValue?: string;
  amount: number;
  discount?: number;
  netAmount?: number;
  paidAmount: number;
  balance: number;
  paymentMode?: string;
  items: {
    testName: string;
    reportDate?: string;
    charge: number;
    tax: number;
    amount: number;
  }[];
  patientId?: { name: string; uhid?: number; phone?: string };
  createdBy?: { name: string };
}

export type RadBill = PathBill;

export interface IpdBill {
  _id: string;
  admissionDate: string;
  dischargeDate?: string;
  status?: string;
  ipdNumber?: number;
  caseNumber?: string;
  bedNumber?: string;
  bedGroup?: string;
  totalCharges: number;
  totalPaid: number;
  balance: number;
  patientId?: {
    name: string;
    uhid?: number;
    age?: number;
    gender?: string;
    phone?: string;
  };
  doctorId?: { name: string; specialization?: string };
}

export interface PaymentModalState {
  billId: string;
  balance: number;
  module: "pharmacy" | "pathology" | "radiology";
  patientName: string;
}

export const PAYMENT_MODES = [
  "Cash",
  "UPI",
  "Card",
  "Cheque",
  "Online",
  "Insurance",
];
