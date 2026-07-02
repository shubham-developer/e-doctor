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
    patientCode?: number; gender?: string; phone?: string; email?: string
    guardianName?: string; address?: string; bloodGroup?: string; allergies?: string
  } | null
  doctorId: { name: string; specialization: string } | null
  createdBy?: { userId: string; name: string }
  createdAt: string
}
