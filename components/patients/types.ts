export interface Patient {
  _id: string;
  uhid?: number;
  name: string;
  guardianName?: string;
  gender?: string;
  age: number;
  ageMonths?: number;
  ageDays?: number;
  dateOfBirth?: string;
  bloodGroup?: string;
  maritalStatus?: string;
  phone?: string;
  email?: string;
  address?: string;
  remarks?: string;
  allergies?: string;
  tpa?: string;
  tpaId?: string;
  tpaValidity?: string;
  nationalId?: string;
  alternateNumber?: string;
  createdAt: string;
}

export interface OpdVisit {
  _id: string;
  opdNumber: number;
  visitDate: string;
  doctorId?: { name: string; specialization?: string } | null;
  chiefComplaint?: string;
  charges: { name: string; fee: number }[];
  paidAmount: number;
  createdAt: string;
}

export interface IpdAdmission {
  _id: string;
  ipdn?: string;
  admissionDate: string;
  dischargeDate?: string;
  status: "ADMITTED" | "DISCHARGED";
  bedGroup?: string;
  bedNumber?: string;
  doctorId?: { name: string; specialization?: string } | null;
  creditLimit?: number;
  caseType?: string;
}

/** Pharmacy bill as returned by the patient-history endpoint (a subset of the
 * full pharmacy module bill — no populated patient/doctor refs). */
export interface PatientPharmacyBill {
  _id: string;
  billNumber: number;
  caseId?: string;
  doctorName?: string;
  lines: {
    medicineName: string;
    quantity: number;
    salePrice: number;
    taxPercent: number;
    discountPercent: number;
    amount: number;
    batchNo?: string;
    expiryDate?: string;
  }[];
  totalAmount: number;
  discountAmount: number;
  taxAmount: number;
  netAmount: number;
  paidAmount: number;
  paymentMode: string;
  createdAt: string;
}

/** Pathology bill as returned by the patient-history endpoint. */
export interface PatientPathologyBill {
  _id: string;
  billNo: string;
  billDate: string;
  createdAt?: string;
  items: {
    testName: string;
    reportDate?: string;
    charge: number;
    tax: number;
    amount: number;
  }[];
  amount: number;
  discount: number;
  netAmount: number;
  paidAmount: number;
  balance: number;
  referenceDoctor?: string;
  paymentMode?: string;
  note?: string;
  previousReportValue?: string;
  caseId?: string;
}

export interface NurseNote {
  _id: string;
  note: string;
  vitalSigns?: {
    bp?: string;
    pulse?: number;
    temp?: number;
    weight?: number;
    o2Sat?: number;
    respRate?: number;
  };
  addedByName: string;
  addedByRole: string;
  createdAt: string;
}

export interface PatientHistory {
  opd: OpdVisit[];
  ipd: IpdAdmission[];
  pharmacy: PatientPharmacyBill[];
  pathology: PatientPathologyBill[];
  nurseNotes: NurseNote[];
}
