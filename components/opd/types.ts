// Shared types for the OPD module.

export type OpdStatus = 'WAITING' | 'IN_PROGRESS' | 'COMPLETED'

export interface Doctor { _id: string; name: string; specialization: string }

export interface OpdVisit {
  _id: string
  opdNumber: number
  visitDate: string
  chiefComplaint: string
  symptomsType?: string
  symptomsTitle?: string
  previousMedicalIssue?: string
  caseNumber?: string
  reference?: string
  isAntenatal?: boolean
  charges: { name: string; fee: number }[]
  totalFee: number
  appliedCharge?: number
  discount?: number
  tax?: number
  paymentMode?: string
  paidAmount?: number
  status: OpdStatus
  patientId: {
    _id: string; name: string; age: number; ageMonths?: number; ageDays?: number
    dateOfBirth?: string; uhid?: number; gender?: string; phone?: string; email?: string
    guardianName?: string; address?: string; bloodGroup?: string; allergies?: string
  } | null
  doctorId: { name: string; specialization: string } | null
  createdBy?: { userId: string; name: string }
  createdAt: string
}

// ── OPD visit detail page ─────────────────────────────────────────────────────

// Full patient object returned by GET /api/dashboard/opd/[id]
export interface OpdPatientDetail {
  _id: string
  name: string
  age: number
  ageMonths?: number
  ageDays?: number
  dateOfBirth?: string
  uhid?: number
  gender?: string
  phone?: string
  email?: string
  guardianName?: string
  address?: string
  bloodGroup?: string
  allergies?: string
  remarks?: string
  tpa?: string
  tpaId?: string
  tpaValidity?: string
  nationalId?: string
}

export interface OpdVisitDetail extends Omit<OpdVisit, 'patientId' | 'charges'> {
  patientId: OpdPatientDetail | null
  charges: { name: string; fee: number; categoryName?: string | null }[]
  note?: string
  casualty?: boolean
  isOldPatient?: boolean
  liveConsultation?: boolean
}

export interface OpdPrescription {
  _id: string
  opdVisitId: string
  headerNote?: string
  footerNote?: string
  findings: { category?: string; list?: string; description?: string; print?: boolean }[]
  medicines: {
    category?: string
    name: string
    dose?: string
    doseInterval?: string
    doseDuration?: string
    instruction?: string
  }[]
  pathology?: string
  radiology?: string
  createdAt: string
}

// Slices of GET /api/dashboard/patients/[id]/history used by the detail tabs.
export interface DiagnosticBillLite {
  _id: string
  billNo: string
  billDate?: string
  items: { testName: string; reportDate?: string; amount?: number }[]
  netAmount: number
  paidAmount: number
  balance?: number
  paymentMode?: string
  createdAt: string
}

export interface PharmacyBillLite {
  _id: string
  billNumber: number
  netAmount: number
  paidAmount: number
  paymentMode?: string
  createdAt: string
}

export interface OpdPatientHistory {
  opd: OpdVisit[]
  pharmacy: PharmacyBillLite[]
  pathology: DiagnosticBillLite[]
  radiology: DiagnosticBillLite[]
}
