// Shared types for the IPD admission profile page.

export interface BedHistoryEntry {
  bedGroup?: string;
  bedNumber?: string;
  fromDate: string;
  toDate?: string;
  isActive: boolean;
}

export interface PatientInfo {
  _id: string;
  name: string;
  age: number;
  ageMonths?: number;
  ageDays?: number;
  uhid?: number;
  patientCode?: number;
  gender?: string;
  phone?: string;
  email?: string;
  guardianName?: string;
  address?: string;
  bloodGroup?: string;
  allergies?: string;
  remarks?: string;
  tpa?: string;
  tpaId?: string;
  tpaValidity?: string;
  tpaCompanyId?: string;
  nationalId?: string;
}

export interface IpdDetail {
  _id: string;
  ipdNumber: number;
  admissionDate: string;
  dischargeDate?: string;
  status: "ADMITTED" | "DISCHARGED";
  bedGroup?: string;
  bedNumber?: string;
  bedHistory: BedHistoryEntry[];
  symptomsType?: string;
  symptomsTitle?: string;
  chiefComplaint?: string;
  note?: string;
  previousMedicalIssue?: string;
  isAntenatal?: boolean;
  tpa?: string;
  creditLimit?: number;
  casualty?: boolean;
  isOldPatient?: boolean;
  liveConsultation?: boolean;
  caseNumber?: string;
  reference?: string;
  patientId: PatientInfo | null;
  doctorId: { name: string; specialization: string; staffCode?: number } | null;
  createdBy?: { userId: string; name: string };
  createdAt: string;
}

export interface IpdCharge {
  _id: string;
  categoryName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  date: string;
  note?: string;
  addedByName?: string;
  isBedCharge?: boolean;
}

export interface IpdMedication {
  _id: string;
  medicineName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  date: string;
  note?: string;
  addedByName?: string;
}

export interface IpdLabTest {
  _id: string;
  testName: string;
  categoryName?: string;
  amount: number;
  date: string;
  note?: string;
  addedByName?: string;
}

export interface IpdPayment {
  _id: string;
  amount: number;
  paymentMode: string;
  note?: string;
  date: string;
  addedByName?: string;
}
